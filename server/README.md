# Sama Grid Extraction Server

Python (FastAPI) backend that accepts an uploaded commission grid document (PDF/PNG/JPG/WEBP/
XLSX/XLSB) and uses the Anthropic API to extract its contents into structured JSON, regardless of
which insurer/broker layout the document uses.

## Pipeline

1. **Sheet/Excel or PDF/image** — uploaded file (multipart form).
2. **Parser** — spreadsheets are parsed with pandas/openpyxl (`.xlsx`) or pyxlsb (`.xlsb`);
   PDFs/images are read natively by Claude, no local parsing step.
3. **Raw cells + structure** — spreadsheets are shaped into tab-separated text chunks
   (`excel_to_text.py`, `xlsb_to_text.py`), one chunk per sheet (or per row-range for very large
   sheets), so no single AI call has to digest an entire multi-sheet workbook.
4. **AI/LLM extraction** — each chunk is sent to Claude with the `record_commission_grid` tool
   (`grid_extraction_schema.py`, `anthropic_client.py`).
5. **Structured JSON** — per-chunk results are merged into one extraction.
6. **Validation + normalization** — `validation.py` checks the shape and backfills the `company`
   field on rows the source document didn't state a company for.

## Setup

1. Copy `.env.example` to `.env` and fill in your key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   PORT=5001
   ```
2. Create a virtual environment and install dependencies (from this `server/` folder):
   ```
   python -m venv venv
   venv\Scripts\pip install -r requirements.txt      # Windows
   # source venv/bin/activate && pip install -r requirements.txt   # macOS/Linux
   ```
3. Run the server:
   ```
   dev.bat                                                            # Windows, cmd/PowerShell
   venv/Scripts/uvicorn main:app --host 0.0.0.0 --port 5001 --reload  # Windows, Git Bash — use forward slashes
   venv/bin/uvicorn main:app --host 0.0.0.0 --port 5001 --reload      # macOS/Linux
   ```
   Note: on Windows, Git Bash treats `\` as an escape character, so a path like `venv\Scripts\uvicorn`
   silently breaks there — always use `venv/Scripts/uvicorn` (forward slashes) in Git Bash specifically.

Frontend and backend are started independently, each with its own native tooling: `npm run dev`
(from the project root) for the Vite frontend, `dev.bat` (from `server/`) for this API. The
frontend proxies `/api/*` requests to `http://localhost:5001` in dev (see `vite.config.js`), so
run both at once, in two terminals, while developing.

## Endpoints

- `GET /api/health` — readiness check, reports whether `ANTHROPIC_API_KEY` is configured.
- `POST /api/grid/extract` — multipart form upload, field `file` (required), field `company`
  (optional — backfills the Company column on rows the document itself doesn't name an insurer for).
  Returns:
  ```json
  {
    "fileName": "Sama Grid- Sep-26 0909 New.pdf",
    "extraction": {
      "documentTitle": "...",
      "validityPeriod": "...",
      "issuingEntity": "...",
      "lineItems": [
        {
          "company": "...",
          "product": "...",
          "subProduct": "...",
          "policyType": "...",
          "rto": "...",
          "discountPercent": 40,
          "discountNote": "",
          "rates": [
            { "slabLabel": "New", "allFuelPercent": 20, "petrolPercent": null, "dieselPercent": null, "cngPercent": null, "electricPercent": null, "note": "" }
          ],
          "remarks": "...",
          "bookingEntity": "..."
        }
      ],
      "unparsedNotes": "..."
    }
  }
  ```

Max upload size is 20MB. Accepted types: `application/pdf`, `image/png`, `image/jpeg`,
`image/webp`, `.xlsx`, `.xlsb`.

## Known limitation

`.xlsb` parsing (`pyxlsb`) does not expose per-cell number formats, unlike the `.xlsx` path
(`openpyxl`) or the previous Node/SheetJS implementation. Percentage-formatted `.xlsb` cells are
currently passed through as raw fractional values rather than pre-formatted "20%" text — tracked
as a follow-up for the extraction-functionality pass.
