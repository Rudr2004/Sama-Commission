"""Pipeline steps 4-5: AI/LLM extraction -> structured JSON.

Takes raw cells/structure already produced by excel_to_text.py / xlsb_to_text.py
(step 3), sends each chunk to Claude with the record_commission_grid tool
(grid_extraction_schema.py), and merges per-chunk results back into one
structured extraction. PDF/image uploads skip the parser step entirely and go
straight from step 1 to step 4, since Claude reads those formats natively.
"""

import os
import re

from anthropic import Anthropic

from grid_extraction_schema import GRID_EXTRACTION_TOOL, build_extraction_prompt
from excel_to_text import excel_buffer_to_chunks
from xlsb_to_text import xlsb_buffer_to_chunks

EXCEL_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
XLSB_MIME_TYPE = "application/vnd.ms-excel.sheet.binary.macroEnabled.12"

MODEL = "claude-sonnet-5"
TRUNCATION_MESSAGE = (
    "The document is too large to extract in one pass (output was truncated). "
    "Try splitting it into smaller files (e.g. by page range) and uploading each separately."
)

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured on the server.")
    if _client is None:
        _client = Anthropic(api_key=api_key)
    return _client


def _run_extraction(document_block: dict, is_spreadsheet_text: bool = False) -> dict:
    anthropic = _get_client()

    with anthropic.messages.stream(
        model=MODEL,
        max_tokens=64000,
        tools=[GRID_EXTRACTION_TOOL],
        tool_choice={"type": "tool", "name": GRID_EXTRACTION_TOOL["name"]},
        messages=[
            {
                "role": "user",
                "content": [document_block, {"type": "text", "text": build_extraction_prompt(is_spreadsheet_text)}],
            }
        ],
    ) as stream:
        response = stream.get_final_message()

    tool_use_block = next((block for block in response.content if block.type == "tool_use"), None)
    if tool_use_block is None:
        raise RuntimeError("Model did not return structured extraction output.")

    if response.stop_reason == "max_tokens":
        raise RuntimeError(TRUNCATION_MESSAGE)

    extraction = tool_use_block.input
    if not isinstance(extraction.get("lineItems"), list):
        raise RuntimeError('Model returned malformed extraction output (lineItems was not a list). Please retry the upload.')

    return extraction


def _merge_extractions(extractions: list[dict]) -> dict:
    first, *rest = extractions
    merged = dict(first)
    merged["lineItems"] = list(first.get("lineItems", []))

    for extraction in rest:
        merged["lineItems"].extend(extraction.get("lineItems", []))
        if not merged.get("issuingEntity") and extraction.get("issuingEntity"):
            merged["issuingEntity"] = extraction["issuingEntity"]
        if not merged.get("validityPeriod") and extraction.get("validityPeriod"):
            merged["validityPeriod"] = extraction["validityPeriod"]
        if extraction.get("unparsedNotes"):
            merged["unparsedNotes"] = (
                f"{merged['unparsedNotes']}\n\n{extraction['unparsedNotes']}"
                if merged.get("unparsedNotes")
                else extraction["unparsedNotes"]
            )

    return merged


def _stamp_source_sheet(extraction: dict, sheet_name: str | None) -> dict:
    # Tagging is done here, programmatically, rather than asking the model to
    # echo the sheet name back per line item: it's free (no extra output
    # tokens) and 100% accurate, since we already know which chunk/sheet
    # produced this extraction.
    if not sheet_name:
        return extraction
    for item in extraction.get("lineItems", []):
        item["sourceSheet"] = sheet_name
    return extraction


def _extract_from_chunks(chunks: list[dict]) -> dict:
    if len(chunks) == 1:
        document_block = {
            "type": "document",
            "source": {"type": "text", "media_type": "text/plain", "data": chunks[0]["text"]},
        }
        extraction = _run_extraction(document_block, is_spreadsheet_text=True)
        return _stamp_source_sheet(extraction, chunks[0].get("sheetName"))

    # Large/multi-sheet workbook: extract each chunk independently so no single
    # AI call has to digest the whole workbook, then merge the results together.
    extractions = []
    for chunk in chunks:
        document_block = {
            "type": "document",
            "source": {"type": "text", "media_type": "text/plain", "data": chunk["text"]},
        }
        try:
            extraction = _run_extraction(document_block, is_spreadsheet_text=True)
            extractions.append(_stamp_source_sheet(extraction, chunk.get("sheetName")))
        except Exception as err:
            raise RuntimeError(f'Failed while extracting "{chunk["label"]}": {err}') from err

    return _merge_extractions(extractions)


def extract_grid_from_file(content: bytes, mimetype: str, filename: str) -> dict:
    if mimetype == "application/pdf":
        document_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": _to_base64(content)},
        }
        return _run_extraction(document_block)

    if mimetype.startswith("image/"):
        document_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": mimetype, "data": _to_base64(content)},
        }
        return _run_extraction(document_block)

    # Browsers frequently misreport .xlsb as application/octet-stream, so fall
    # back to the file extension when the MIME type alone doesn't identify it.
    is_xlsb = mimetype == XLSB_MIME_TYPE or bool(re.search(r"\.xlsb$", filename or "", re.IGNORECASE))
    if is_xlsb:
        chunks = xlsb_buffer_to_chunks(content)
        return _extract_from_chunks(chunks)

    is_xlsx = mimetype == EXCEL_MIME_TYPE or bool(re.search(r"\.xlsx$", filename or "", re.IGNORECASE))
    if is_xlsx:
        chunks = excel_buffer_to_chunks(content)
        return _extract_from_chunks(chunks)

    raise ValueError(f"Unsupported file type: {mimetype}")


def _to_base64(content: bytes) -> str:
    import base64

    return base64.b64encode(content).decode("ascii")
