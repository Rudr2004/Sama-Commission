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

# Column count alone is a weak signal for output size: a sheet can have many
# short label columns (cheap) or few rate columns (also cheap). What actually
# drives output size is how many *rate-shaped* cells (percentages, or plain
# numbers) sit in each row — this schema turns multi-category rate columns
# (e.g. one per vehicle class/tonnage band, not just per fuel type) into one
# "rates" array entry each, and every entry costs several output fields. A row
# with 8 rate-like columns can outweigh 100 rows that only have 1.
#
# So the row cap is scaled down by the sheet's average rate-cell density per
# row rather than by raw column count, keeping simple sheets (mostly label
# columns, one rate value) at the full cap while splitting dense rate-matrix
# sheets into several smaller chunks.
RATE_CELL_PATTERN = re.compile(r"^-?\d+(\.\d+)?%?$")
SIMPLE_RATE_CELLS_PER_ROW = 1.5
MIN_ROWS_PER_CHUNK = 15


def _avg_rate_cells_per_row(rows: list[str]) -> float:
    if len(rows) <= 1:
        return 0.0
    data_rows = rows[1:]  # skip header row
    total = 0
    for row in data_rows:
        total += sum(1 for cell in row.split("\t") if RATE_CELL_PATTERN.match(cell.strip()))
    return total / len(data_rows)


def _max_rows_for_rate_density(avg_rate_cells: float) -> int:
    if avg_rate_cells <= SIMPLE_RATE_CELLS_PER_ROW:
        return MAX_ROWS_PER_CHUNK
    scale = SIMPLE_RATE_CELLS_PER_ROW / avg_rate_cells
    return max(MIN_ROWS_PER_CHUNK, int(MAX_ROWS_PER_CHUNK * scale))

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

        max_rows = _max_rows_for_rate_density(_avg_rate_cells_per_row(rows))

        if len(rows) <= max_rows:
            chunks.append(
                {
                    "label": f"Sheet: {worksheet.title}",
                    "sheetName": worksheet.title,
                    "text": "\n".join([f"## Sheet: {worksheet.title}", *rows]),
                }
            )
            continue

        # Large sheet: split into row-range chunks, repeating the header row
        # (assumed to be the first row) in each chunk so column meaning isn't
        # lost per chunk.
        header_row = rows[0]
        data_rows = rows[1:]
        for i in range(0, len(data_rows), max_rows):
            sliced = data_rows[i : i + max_rows]
            range_label = f"rows {i + 2}-{i + 1 + len(sliced)}"  # +2: 1-indexed, +1 for header row
            chunks.append(
                {
                    "label": f"Sheet: {worksheet.title} ({range_label})",
                    "sheetName": worksheet.title,
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
