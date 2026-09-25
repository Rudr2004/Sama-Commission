"""Pipeline step 6: validation + normalization of the AI's structured output
before it's returned to the client."""


def apply_fallback_company(extraction: dict, fallback_company: str) -> dict:
    """Backfills the company field on any line item the document itself left
    blank, using the company name supplied by the uploader in the UI."""
    if not fallback_company:
        return extraction

    line_items = extraction.get("lineItems", [])
    normalized_items = [
        item if (item.get("company") or "").strip() else {**item, "company": fallback_company}
        for item in line_items
    ]
    return {**extraction, "lineItems": normalized_items}


def validate_extraction(extraction: dict) -> None:
    """Raises if the extraction doesn't have the minimal shape the frontend expects."""
    if not isinstance(extraction, dict) or not isinstance(extraction.get("lineItems"), list):
        raise ValueError("Extraction result is missing a valid lineItems list.")
