"""MongoDB-backed history of commission grid uploads.

Entirely optional: when MONGODB_URL is not set (or MongoDB is unreachable) every
function degrades gracefully so extraction keeps working without history.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import gridfs
from bson import ObjectId
from bson.errors import InvalidId
from pymongo import DESCENDING, MongoClient
from pymongo.errors import PyMongoError

COLLECTION = "grid_history"

_client: Optional[MongoClient] = None
_collection = None


def _get_fs():
    col = _get_collection()
    return gridfs.GridFS(col.database, collection="grid_history_files") if col is not None else None


def is_configured() -> bool:
    return bool(os.environ.get("MONGODB_URL", "").strip())


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    if not is_configured():
        return None
    _client = MongoClient(os.environ["MONGODB_URL"].strip(), serverSelectionTimeoutMS=5000)
    db_name = os.environ.get("MONGODB_DB", "sama_commission")
    _collection = _client[db_name][COLLECTION]
    _collection.create_index([("createdAt", DESCENDING)])
    return _collection


def log_connection_status() -> None:
    """Pings MongoDB at startup and prints whether history storage is usable."""
    if not is_configured():
        print("[MongoDB] MONGODB_URL is not set - upload history is disabled.")
        return
    try:
        col = _get_collection()
        col.database.client.admin.command("ping")
        print(f"[MongoDB] Connected successfully - database '{col.database.name}', collection '{COLLECTION}'.")
    except PyMongoError as err:
        print(f"[MongoDB] Connection FAILED - upload history will not work: {err}")


def _summary(doc: dict) -> dict:
    extraction = doc.get("extraction") or {}
    return {
        "id": str(doc["_id"]),
        "company": doc.get("company", ""),
        "month": doc.get("month", ""),
        "time": doc.get("time", ""),
        "fileName": doc.get("fileName", ""),
        "documentTitle": extraction.get("documentTitle"),
        "lineItemCount": doc.get("lineItemCount", 0),
        "hasFile": bool(doc.get("hasFile")),
        "createdAt": doc["createdAt"].isoformat() if doc.get("createdAt") else None,
    }


def save_upload(
    company: str, month: str, time: str, file_name: str, extraction: dict,
    file_bytes: Optional[bytes] = None, content_type: Optional[str] = None,
) -> Optional[str]:
    """Stores one upload; returns its id, or None if history is unavailable."""
    try:
        col = _get_collection()
        if col is None:
            return None
        # The original upload is kept in GridFS (no 16MB document limit) so it can be reopened later.
        file_id = None
        if file_bytes:
            try:
                file_id = _get_fs().put(file_bytes, filename=file_name, content_type=content_type or "application/octet-stream")
            except PyMongoError as err:
                print(f"[MongoDB] Could not store original file (extraction still saved): {err}")
        res = col.insert_one(
            {
                "company": company,
                "month": month,
                "time": time,
                "fileName": file_name,
                "lineItemCount": len(extraction.get("lineItems") or []),
                "extraction": extraction,
                "fileId": file_id,
                "hasFile": file_id is not None,
                "createdAt": datetime.now(timezone.utc),
            }
        )
        print(f"[MongoDB] Saved upload to history (id={res.inserted_id}, company='{company}').")
        return str(res.inserted_id)
    except PyMongoError as err:
        print(f"[MongoDB] History save failed: {err}")
        return None


def list_uploads(limit: int = 100) -> list:
    col = _get_collection()
    docs = col.find({}, {"extraction.lineItems": 0}).sort("createdAt", DESCENDING).limit(limit)
    return [_summary(d) for d in docs]


def get_upload(history_id: str) -> Optional[dict]:
    col = _get_collection()
    try:
        doc = col.find_one({"_id": ObjectId(history_id)})
    except InvalidId:
        return None
    if not doc:
        return None
    return {**_summary(doc), "extraction": doc.get("extraction")}


def delete_upload(history_id: str) -> bool:
    col = _get_collection()
    try:
        doc = col.find_one_and_delete({"_id": ObjectId(history_id)}, {"fileId": 1})
    except InvalidId:
        return False
    if doc is None:
        return False
    if doc.get("fileId"):
        try:
            _get_fs().delete(doc["fileId"])
        except PyMongoError as err:
            print(f"[MongoDB] Could not delete stored file: {err}")
    return True


def get_original_file(history_id: str) -> Optional[dict]:
    """Returns {fileName, contentType, data} for the originally uploaded file, if it was stored."""
    col = _get_collection()
    try:
        doc = col.find_one({"_id": ObjectId(history_id)}, {"fileId": 1, "fileName": 1})
    except InvalidId:
        return None
    if not doc or not doc.get("fileId"):
        return None
    try:
        grid_out = _get_fs().get(doc["fileId"])
    except gridfs.errors.NoFile:
        return None
    return {
        "fileName": doc.get("fileName") or grid_out.filename,
        "contentType": grid_out.content_type or "application/octet-stream",
        "data": grid_out.read(),
    }


def latest_grids_per_company(month: str = "") -> list:
    """The grid to quote against for each company: the upload for `month` if there is one,
    otherwise that company's most recent upload. Returns full documents (with line items)."""
    col = _get_collection()
    summaries = list(col.find({}, {"extraction": 0, "fileId": 0}).sort("createdAt", DESCENDING))
    chosen = {}
    for doc in summaries:
        key = (doc.get("company") or "").strip().lower()
        if not key:
            continue
        current = chosen.get(key)
        in_month = bool(month) and doc.get("month") == month
        # summaries are newest-first, so the first doc seen is the newest; a month match overrides it
        if current is None or (in_month and current.get("month") != month):
            chosen[key] = doc
    grids = []
    for doc in chosen.values():
        full = col.find_one({"_id": doc["_id"]}, {"extraction.lineItems": 1, "extraction.documentTitle": 1})
        grids.append(
            {
                "id": str(doc["_id"]),
                "company": doc.get("company", ""),
                "month": doc.get("month", ""),
                "time": doc.get("time", ""),
                "fileName": doc.get("fileName", ""),
                "extraction": (full or {}).get("extraction") or {},
            }
        )
    return grids
