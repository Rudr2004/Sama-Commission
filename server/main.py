"""FastAPI backend for AI-powered commission grid extraction.

Pipeline: (1) uploaded sheet/document -> (2) parser (pandas/openpyxl/pyxlsb
for spreadsheets; Claude reads PDFs/images natively) -> (3) raw cells +
structure -> (4) AI/LLM extraction -> (5) structured JSON -> (6) validation +
normalization. Steps 2-3 live in excel_to_text.py/xlsb_to_text.py, steps 4-5
in anthropic_client.py, step 6 in validation.py.
"""

import os
import re
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from anthropic_client import extract_grid_from_file
from validation import apply_fallback_company, validate_extraction

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Sama Grid Extraction Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel.sheet.binary.macroEnabled.12",  # .xlsb
}
# Browsers frequently fail to report a proper MIME type for .xlsb (often
# sending application/octet-stream instead), so fall back to the extension.
XLSB_EXTENSION = re.compile(r"\.xlsb$", re.IGNORECASE)
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB, matches Anthropic's document upload limit


@app.get("/api/health")
def health():
    return {"status": "ok", "anthropicConfigured": bool(os.environ.get("ANTHROPIC_API_KEY"))}


@app.post("/api/grid/extract")
async def extract(file: UploadFile = File(...), company: str = Form("")):
    is_allowed = file.content_type in ALLOWED_MIME_TYPES or bool(XLSB_EXTENSION.search(file.filename or ""))
    if not is_allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF, PNG, JPG, WEBP, XLSX, or XLSB file.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Maximum size is 20MB.")

    fallback_company = (company or "").strip()

    try:
        extraction = extract_grid_from_file(content, file.content_type, file.filename)
        validate_extraction(extraction)
        extraction = apply_fallback_company(extraction, fallback_company)
        return {"fileName": file.filename, "extraction": extraction}
    except Exception as err:
        print(f"Grid extraction failed: {err}")
        raise HTTPException(status_code=502, detail=str(err)) from err


@app.on_event("startup")
def warn_if_unconfigured():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is not set. Grid extraction requests will fail.")
