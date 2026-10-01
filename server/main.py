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
from urllib.parse import quote

from dotenv import load_dotenv
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from pymongo.errors import PyMongoError

import grid_quote
import history_store
from anthropic_client import extract_grid_from_file
from validation import apply_fallback_company, validate_extraction

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

app = FastAPI(title="Sama Grid Extraction Server")

# CORS_ALLOWED_ORIGINS: comma-separated list (e.g. the Vercel frontend URL).
# Defaults to "*" so local dev keeps working without any env var set.
_allowed_origins_raw = os.environ.get("CORS_ALLOWED_ORIGINS", "*").strip()
ALLOWED_ORIGINS = ["*"] if _allowed_origins_raw == "*" else [o.strip() for o in _allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # The frontend (originally written against the Express backend) reads the
    # error message from an "error" key, e.g. data?.error in CommissionGrid.jsx.
    # FastAPI's default HTTPException body only has "detail" — mirror it into
    # "error" too so error messages actually reach the UI instead of falling
    # back to a generic message.
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail, "detail": exc.detail})


@app.get("/api/health")
def health():
    return {"status": "ok", "anthropicConfigured": bool(os.environ.get("ANTHROPIC_API_KEY")), "historyConfigured": history_store.is_configured()}


@app.post("/api/grid/extract")
async def extract(
    file: UploadFile = File(...),
    company: str = Form(""),
    month: str = Form(""),
    time: str = Form(""),
):
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
    except Exception as err:
        print(f"Grid extraction failed: {err}")
        raise HTTPException(status_code=502, detail=str(err)) from err

    # Saving to history is best-effort: a MongoDB problem must never fail an extraction.
    history_id = history_store.save_upload(
        fallback_company, month.strip(), time.strip(), file.filename or "", extraction,
        file_bytes=content, content_type=file.content_type,
    )
    return {"fileName": file.filename, "extraction": extraction, "historyId": history_id}


def _require_history():
    if not history_store.is_configured():
        raise HTTPException(status_code=503, detail="History is not configured. Set MONGODB_URL on the server.")


@app.get("/api/grid/history")
def list_history():
    if not history_store.is_configured():
        return {"enabled": False, "items": []}
    try:
        return {"enabled": True, "items": history_store.list_uploads()}
    except PyMongoError as err:
        print(f"History list failed: {err}")
        raise HTTPException(status_code=503, detail="Could not reach the history database.") from err


@app.get("/api/grid/history/{history_id}")
def get_history(history_id: str):
    _require_history()
    try:
        item = history_store.get_upload(history_id)
    except PyMongoError as err:
        raise HTTPException(status_code=503, detail="Could not reach the history database.") from err
    if not item:
        raise HTTPException(status_code=404, detail="History entry not found.")
    return {"fileName": item["fileName"], "extraction": item["extraction"], "historyId": item["id"]}


class PremiumBreakdown(BaseModel):
    odPremium: Optional[float] = None
    tpPremium: Optional[float] = None
    netPremium: Optional[float] = None
    grossPremium: Optional[float] = None


class QuoteRequest(BaseModel):
    vehicleClass: str
    vehicleSubclass: Optional[str] = ""
    fuelType: str
    policyType: str
    caseType: Optional[str] = ""
    rto: Optional[str] = ""
    rtoCity: Optional[str] = ""
    regNumber: Optional[str] = ""
    ncb: Optional[int] = 0
    vehicleAge: Optional[float] = None
    cubicCapacity: Optional[float] = None
    vehicleMake: Optional[str] = ""
    vehicleModel: Optional[str] = ""
    month: Optional[str] = ""
    premium: Optional[PremiumBreakdown] = None


@app.post("/api/grid/quote")
def quote_from_grids(body: QuoteRequest):
    """Broker commission for a vehicle, computed from the uploaded commission grids."""
    _require_history()
    try:
        grids = history_store.latest_grids_per_company(body.month or "")
    except PyMongoError as err:
        raise HTTPException(status_code=503, detail="Could not reach the history database.") from err
    if not grids:
        raise HTTPException(status_code=404, detail="No commission grids have been uploaded yet.")
    try:
        payload = body.model_dump()
        payload["premium"] = (body.premium.model_dump() if body.premium else {})
        result = grid_quote.quote_vehicle(payload, grids)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    result["gridsConsidered"] = [
        {"company": g["company"], "fileName": g["fileName"], "month": g["month"], "time": g["time"]} for g in grids
    ]
    return result


@app.get("/api/grid/history/{history_id}/file")
def get_history_file(history_id: str):
    _require_history()
    try:
        stored = history_store.get_original_file(history_id)
    except PyMongoError as err:
        raise HTTPException(status_code=503, detail="Could not reach the history database.") from err
    if not stored:
        raise HTTPException(status_code=404, detail="The original file was not stored for this entry.")
    return Response(
        content=stored["data"],
        media_type=stored["contentType"],
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(stored['fileName'])}"},
    )


@app.delete("/api/grid/history/{history_id}")
def delete_history(history_id: str):
    _require_history()
    try:
        deleted = history_store.delete_upload(history_id)
    except PyMongoError as err:
        raise HTTPException(status_code=503, detail="Could not reach the history database.") from err
    if not deleted:
        raise HTTPException(status_code=404, detail="History entry not found.")
    return {"deleted": True}


@app.on_event("startup")
def warn_if_unconfigured():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("WARNING: ANTHROPIC_API_KEY is not set. Grid extraction requests will fail.")
    history_store.log_connection_status()
