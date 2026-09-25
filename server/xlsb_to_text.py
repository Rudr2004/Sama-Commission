"""Handles the legacy Excel Binary Workbook format (.xlsb), which openpyxl
cannot read at all. pyxlsb is the library used to open the binary format; the
resulting rows are shaped into a pandas DataFrame for chunking, matching the
same approach as excel_to_text.py.

Known limitation (tracked for the extraction-functionality follow-up): pyxlsb
exposes only raw cell values, with no access to each cell's number format —
unlike openpyxl (used for .xlsx) or SheetJS in the previous Node backend, both
of which could tell a percentage-formatted 0.2 apart from a plain 0.2. Values
here are passed through as raw numbers; the extraction prompt is told to treat
.xlsb-sourced fractions as percentages needing a x100 conversion.
"""

import io

import pandas as pd
from pyxlsb import open_workbook

MAX_ROWS_PER_CHUNK = 150


def xlsb_buffer_to_chunks(buffer: bytes) -> list[dict]:
    chunks = []

    with open_workbook(io.BytesIO(buffer)) as wb:
        for sheet_name in wb.sheets:
            df = _sheet_to_dataframe(wb, sheet_name)
            if df.empty:
                continue

            rows = ["\t".join(row) for row in df.values.tolist()]
            rows = [r for r in rows if r.strip("\t")]
            if not rows:
                continue

            if len(rows) <= MAX_ROWS_PER_CHUNK:
                chunks.append(
                    {
                        "label": f"Sheet: {sheet_name}",
                        "text": "\n".join([f"## Sheet: {sheet_name}", *rows]),
                    }
                )
                continue

            header_row = rows[0]
            data_rows = rows[1:]
            for i in range(0, len(data_rows), MAX_ROWS_PER_CHUNK):
                sliced = data_rows[i : i + MAX_ROWS_PER_CHUNK]
                range_label = f"rows {i + 2}-{i + 1 + len(sliced)}"
                chunks.append(
                    {
                        "label": f"Sheet: {sheet_name} ({range_label})",
                        "text": "\n".join([f"## Sheet: {sheet_name} ({range_label})", header_row, *sliced]),
                    }
                )

    if not chunks:
        raise ValueError("The Excel file has no readable sheet content.")

    return chunks


def _sheet_to_dataframe(wb, sheet_name: str) -> pd.DataFrame:
    grid = {}
    max_col = -1
    with wb.get_sheet(sheet_name) as sheet:
        for row in sheet.rows():
            for cell in row:
                if cell.v is None:
                    continue
                grid.setdefault(cell.r, {})[cell.c] = _format_cell_value(cell.v)
                max_col = max(max_col, cell.c)

    if not grid or max_col < 0:
        return pd.DataFrame()

    rows = []
    for r in sorted(grid.keys()):
        row_map = grid[r]
        row = [row_map.get(c, "") for c in range(max_col + 1)]
        while row and row[-1] == "":
            row.pop()
        rows.append(row)

    max_len = max((len(r) for r in rows), default=0)
    if max_len == 0:
        return pd.DataFrame()

    padded = [row + [""] * (max_len - len(row)) for row in rows]
    return pd.DataFrame(padded)


def _format_cell_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)
