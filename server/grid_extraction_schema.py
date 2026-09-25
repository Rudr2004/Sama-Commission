"""Normalized shape we ask Claude to extract every commission grid into,
regardless of how the source document is laid out. Different insurers/
brokers ship wildly different table structures, so the schema favors
a flat list of line items over trying to mirror any one source layout.

Field descriptions are kept terse on purpose: this schema is resent in full
on every extraction call, including every chunk of a multi-sheet spreadsheet
(see anthropic_client.py), so wording here has a real, multiplied token cost.
"""

GRID_EXTRACTION_TOOL = {
    "name": "record_commission_grid",
    "description": "Record the structured contents of a commission grid document as a flat list of line items.",
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["documentTitle", "lineItems"],
        "properties": {
            "documentTitle": {
                "type": "string",
                "description": 'Document title/heading as printed, e.g. "Sama Grid - Sep-26".',
            },
            "validityPeriod": {
                "type": "string",
                "description": "Effective date/month/validity window, if stated. Else empty string.",
            },
            "issuingEntity": {
                "type": "string",
                "description": "Broker/company that issued this document (not the insurer column), if identifiable. Else empty string.",
            },
            "lineItems": {
                "type": "array",
                "description": "One entry per row/commission rule in the grid.",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["company", "product"],
                    "properties": {
                        "company": {
                            "type": "string",
                            "description": (
                                'Insurer name for this row (e.g. "TATA", "ICICI") ONLY if stated inside the '
                                "document itself (column/header/title). Never infer from filename/folder — "
                                "empty string if not stated in the content."
                            ),
                        },
                        "product": {
                            "type": "string",
                            "description": 'Top-level vehicle category, e.g. "2W", "CAR", "LCV", "GCV", "PCV", "TRACTOR".',
                        },
                        "subProduct": {
                            "type": "string",
                            "description": 'Sub-category (e.g. "SCOOTER", CC/tonnage band). Empty string if none.',
                        },
                        "policyType": {
                            "type": "string",
                            "description": 'Policy type, e.g. "TP", "PKG", "SAOD", "OD". Empty string if not stated.',
                        },
                        "rto": {
                            "type": "string",
                            "description": (
                                'RTO/state/district scope, only if short and clean (e.g. "BIHAR", "GJ01, GJ27"). '
                                "Empty if it applies broadly to all RTOs, or the scope is too complex to state "
                                "cleanly (then describe it in remarks instead)."
                            ),
                        },
                        "discountPercent": {
                            "type": ["number", "null"],
                            "description": 'Customer discount %, if numeric. Null if non-numeric (e.g. "as per system") or absent.',
                        },
                        "discountNote": {
                            "type": "string",
                            "description": 'Raw text when discount isn\'t a clean number, e.g. "as per system". Else empty string.',
                        },
                        "rates": {
                            "type": "array",
                            "description": (
                                "Commission/payout rate(s) for this row: one entry per distinct pricing tier/slab "
                                "in the document. Most rows have exactly one entry (a flat rate, or one entry with "
                                'a per-fuel breakdown). If the document has multiple tiers per row (e.g. "New" vs '
                                '"SAOD with NCB" vs "Used car"), add one entry per tier — never merge tiers or '
                                "describe them in remarks. This is the ONLY place numeric rates go; never restate "
                                "these numbers elsewhere."
                            ),
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "required": [],
                                "properties": {
                                    "slabLabel": {
                                        "type": "string",
                                        "description": (
                                            'Tier/slab name exactly as labeled in the document (e.g. "New", "Act '
                                            'only"). Empty string if the row has only one undifferentiated rate.'
                                        ),
                                    },
                                    "allFuelPercent": {
                                        "type": ["number", "null"],
                                        "description": "Rate for this slab when one number covers all fuel types. Null if broken out per fuel below, or not a clean number.",
                                    },
                                    "petrolPercent": {
                                        "type": ["number", "null"],
                                        "description": "Petrol rate for this slab. Null if n/a or not a clean number.",
                                    },
                                    "dieselPercent": {
                                        "type": ["number", "null"],
                                        "description": "Diesel rate for this slab. Null if n/a or not a clean number.",
                                    },
                                    "cngPercent": {
                                        "type": ["number", "null"],
                                        "description": "CNG rate for this slab. Null if n/a or not a clean number.",
                                    },
                                    "electricPercent": {
                                        "type": ["number", "null"],
                                        "description": "Electric rate for this slab. Null if n/a or not a clean number.",
                                    },
                                    "note": {
                                        "type": "string",
                                        "description": 'Raw text when this slab\'s value isn\'t a clean number, e.g. "IRDA", "-". Else empty string.',
                                    },
                                },
                            },
                        },
                        "remarks": {
                            "type": "string",
                            "description": (
                                "ADDITIONAL conditions not already captured by other fields (declined models, "
                                "age/year rules, exclusions, RTO sub-rates within one row). Never restate a value "
                                "already in company/product/rto/rates — if there's nothing extra, use an empty "
                                "string. Exception: a rate that varies by RTO too irregularly for \"rates\" to "
                                "express cleanly may be described here instead."
                            ),
                        },
                        "bookingEntity": {
                            "type": "string",
                            "description": 'Booking channel/branch if stated (e.g. "SAMA BROKER"). Else empty string.',
                        },
                    },
                },
            },
            "unparsedNotes": {
                "type": "string",
                "description": "Footnotes/disclaimers outside the main table (e.g. a global declined-model list). Else empty string.",
            },
        },
    },
}


def build_extraction_prompt(is_spreadsheet_text: bool = False) -> str:
    spreadsheet_note = (
        '\n\nThis document was converted from Excel to plain text: columns are tab-separated, each sheet '
        'starts with "## Sheet: <name>", and percentage cells are already rendered as "20%" text (store 20, '
        "not 0.2)."
        if is_spreadsheet_text
        else ""
    )

    return f"""You are extracting an insurance commission grid. Layouts vary by insurer/broker — clean tables, merged cells, multi-concept columns.{spreadsheet_note}

Read the entire document (all rows, all pages) and call record_commission_grid once with the complete extraction. Rules:

- Extract every row, even with blank fields or shorthand ("as per system", "-"). Do not summarize or skip rows for brevity.
- No duplication: each fact goes in exactly one field. Once a value is captured in a structured field, do not restate it in remarks. Leave remarks empty if there's nothing beyond the structured fields — never fill it with filler that repeats another field.
- All numeric rates go in "rates" (see its description for single vs. multi-tier rows), never in remarks — except a rate that varies by RTO too irregularly to reduce to clean values, which may go in remarks as a genuine exception, not a shortcut.
- Fill "rto" for a short, clean scope; leave it empty for broad/all-RTO rows.
- Fill "company" only from content inside the document — never from filename or folder.
- Put footnotes/disclaimers outside the main table into unparsedNotes."""
