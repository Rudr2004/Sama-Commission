"""Converts an uploaded .xlsx/.xlsm workbook into one or more plain-text,
tab-separated chunks — one chunk per sheet, or several chunks for a single
sheet large enough to risk truncating a single extraction pass. Each chunk is
extracted by Claude independently and the results are merged, so no single AI
call has to digest an entire multi-sheet workbook at once.

Uses openpyxl for a first pass over raw cells (needed to read each cell's own
number format, e.g. distinguishing a percentage-formatted 0.2 from a plain
0.2), then hands the resulting grid to pandas as a DataFrame for the actual
row/column shaping and chunking logic.
"""

import io
import re
from datetime import datetime

import pandas as pd
from openpyxl import load_workbook

# A rough cap on rows per chunk sent to the model in one extraction call. Kept
# conservative because these grids tend to have wide rows (many columns) and
# dense per-row detail, both of which multiply token usage per row.
MAX_ROWS_PER_CHUNK = 150

_PERCENT_FORMAT = re.compile(r"%")
_DECIMAL_PLACES = re.compile(r"0(\.(0+))?%")


def excel_buffer_to_chunks(buffer: bytes) -> list[dict]:
    workbook = load_workbook(filename=io.BytesIO(buffer), data_only=True)

    chunks = []

    for worksheet in workbook.worksheets:
        df = _worksheet_to_dataframe(worksheet)
        if df.empty:
            continue

        rows = ["\t".join(row) for row in df.values.tolist()]
        # Drop rows that ended up fully blank after formatting (matches the
        # trailing-empty-cell trim done per row below).
        rows = [r for r in rows if r.strip("\t")]
        if not rows:
            continue

        if len(rows) <= MAX_ROWS_PER_CHUNK:
            chunks.append(
                {
                    "label": f"Sheet: {worksheet.title}",
                    "text": "\n".join([f"## Sheet: {worksheet.title}", *rows]),
                }
            )
            continue

        # Large sheet: split into row-range chunks, repeating the header row
        # (assumed to be the first row) in each chunk so column meaning isn't
        # lost per chunk.
        header_row = rows[0]
        data_rows = rows[1:]
        for i in range(0, len(data_rows), MAX_ROWS_PER_CHUNK):
            sliced = data_rows[i : i + MAX_ROWS_PER_CHUNK]
            range_label = f"rows {i + 2}-{i + 1 + len(sliced)}"  # +2: 1-indexed, +1 for header row
            chunks.append(
                {
                    "label": f"Sheet: {worksheet.title} ({range_label})",
                    "text": "\n".join([f"## Sheet: {worksheet.title} ({range_label})", header_row, *sliced]),
                }
            )

    if not chunks:
        raise ValueError("The Excel file has no readable sheet content.")

    return chunks


def _worksheet_to_dataframe(worksheet) -> pd.DataFrame:
    """Builds a DataFrame of already-formatted string cells (percentages
    resolved via each cell's own number format), with trailing empty columns
    trimmed per row the same way the original per-row trim worked."""
    grid = []
    for row in worksheet.iter_rows():
        cells = [_format_cell_value(cell) for cell in row]
        while cells and cells[-1] == "":
            cells.pop()
        grid.append(cells)

    if not grid:
        return pd.DataFrame()

    max_len = max((len(r) for r in grid), default=0)
    if max_len == 0:
        return pd.DataFrame()

    padded = [row + [""] * (max_len - len(row)) for row in grid]
    return pd.DataFrame(padded)


def _decimal_places_from_format(num_fmt: str) -> int:
    match = _DECIMAL_PLACES.search(num_fmt or "")
    if not match or not match.group(2):
        return 0
    return len(match.group(2))


def _round_percent(fraction: float, num_fmt: str) -> float:
    percent = fraction * 100
    decimals = _decimal_places_from_format(num_fmt)
    factor = 10**decimals
    return round(percent * factor) / factor


def _format_cell_value(cell) -> str:
    value = cell.value
    if value is None:
        return ""

    if isinstance(value, bool):
        return str(value)

    if isinstance(value, (int, float)):
        num_fmt = cell.number_format or ""
        if _PERCENT_FORMAT.search(num_fmt):
            rounded = _round_percent(float(value), num_fmt)
            # Match JS's Number->string formatting: drop a trailing ".0" for whole numbers.
            if rounded == int(rounded):
                return f"{int(rounded)}%"
            return f"{rounded}%"
        return str(value)

    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")

    return str(value)
