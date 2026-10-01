"""Quote a vehicle against the uploaded commission grids.

Given a vehicle (class, fuel, RTO/state, policy type, case type, NCB, age) and its premium
breakdown, find the best-matching row in each company's grid, pick the right rate slab and fuel
column, and compute the broker commission = rate% x premium base.

Grids are free-form (each insurer names classes, policy types, RTOs and slabs differently), so
matching is a scored heuristic and every result reports *what* it matched and how confident it
is. Nothing here calls an AI model - it is pure rule-based matching over data that is already
extracted, so quoting costs no tokens.
"""

import re
from typing import Optional

# --- Vehicle registration state codes -------------------------------------------------------

STATE_BY_CODE = {
    "AN": "ANDAMAN & NICOBAR ISLANDS", "AP": "ANDHRA PRADESH", "AR": "ARUNACHAL PRADESH",
    "AS": "ASSAM", "BR": "BIHAR", "CH": "CHANDIGARH", "CG": "CHHATTISGARH",
    "DD": "DAMAN & DIU", "DN": "DADRA & NAGAR HAVELI", "DL": "DELHI", "GA": "GOA",
    "GJ": "GUJARAT", "HP": "HIMACHAL PRADESH", "HR": "HARYANA", "JH": "JHARKHAND",
    "JK": "JAMMU & KASHMIR", "KA": "KARNATAKA", "KL": "KERALA", "LA": "LADAKH",
    "LD": "LAKSHADWEEP", "MH": "MAHARASHTRA", "ML": "MEGHALAYA", "MN": "MANIPUR",
    "MP": "MADHYA PRADESH", "MZ": "MIZORAM", "NL": "NAGALAND", "OD": "ODISHA", "OR": "ODISHA",
    "PB": "PUNJAB", "PY": "PUDUCHERRY", "RJ": "RAJASTHAN", "SK": "SIKKIM",
    "TN": "TAMIL NADU", "TR": "TRIPURA", "TS": "TELANGANA", "TG": "TELANGANA",
    "UK": "UTTARAKHAND", "UA": "UTTARAKHAND", "UP": "UTTAR PRADESH", "WB": "WEST BENGAL",
}
# Spelling variants grids use for the same state.
STATE_ALIASES = {
    "ORISSA": "ODISHA", "UTTARANCHAL": "UTTARAKHAND", "PONDICHERRY": "PUDUCHERRY",
    "J&K": "JAMMU & KASHMIR", "JAMMU AND KASHMIR": "JAMMU & KASHMIR", "A&N": "ANDAMAN & NICOBAR ISLANDS",
    "ANDAMAN AND NICOBAR ISLANDS": "ANDAMAN & NICOBAR ISLANDS", "NCR": "DELHI",
}
# Grids often lump these together, e.g. "6 North Eastern States (other than Assam)".
NORTH_EAST_OTHER_THAN_ASSAM = {"AR", "MN", "ML", "MZ", "NL", "TR"}

CLASS_LABELS = {
    "private_car": "Private Car", "two_wheeler": "Two-Wheeler", "commercial_gcv": "GCV",
    "commercial_pcv": "PCV", "misc_d": "Misc-D",
}


def _norm(text) -> str:
    return re.sub(r"\s+", " ", str(text or "").upper().replace("_", " ")).strip()


def state_code_from(rto: str, reg_number: str) -> Optional[str]:
    for source in (rto, reg_number):
        m = re.match(r"^\s*([A-Za-z]{2})", str(source or ""))
        if m and m.group(1).upper() in STATE_BY_CODE:
            return m.group(1).upper()
    return None


# --- Normalising grid text ---------------------------------------------------------------------


def grid_class_of(item: dict) -> Optional[str]:
    """Which vehicle class a grid row is for, judged from its product column. Order matters:
    e.g. "Car Carrier" is a goods vehicle, not a private car."""
    product = _norm(item.get("product"))
    if not product:
        return None
    if re.search(r"GCV|GOODS|CARRIER|TRUCK|TIPPER|DUMPER|TRAILER", product):
        return "commercial_gcv"
    if re.search(r"PCV|TAXI|\bBUS\b|PASSENGER|PICK ?UP|SCHOOL|AMBULANCE|\bAUTO\b", product):
        return "commercial_pcv"
    if re.search(r"MISD|MISC|TRACTOR|HARVESTER|\bCPM\b|\bJCB\b|CONSTRUCTION", product):
        return "misc_d"
    if re.search(r"\b2W\b|\bTW\b|TWO ?WHEELER|BIKE|SCOOTER|MOTORCYCLE|MOPED", product):
        return "two_wheeler"
    if re.fullmatch(r"(CAR|PC|PRIVATE CARS?|PVT\.? CARS?)", product):
        return "private_car"
    return None


def grid_policy_kinds(item: dict) -> set:
    """Which cover types a row applies to. Empty set = the row doesn't say (applies to any)."""
    text = _norm(item.get("policyType"))
    if not text:
        return set()
    kinds = set()
    if re.search(r"\b(STP|SATP|TP|L|LIABILITY|ACT ONLY|THIRD PARTY)\b", text):
        kinds.add("liability")
    if re.search(r"SA ?-? ?OD|SAOD|STAND ?ALONE|\bOD\b", text):
        kinds.add("saod")
    if re.search(r"\b(P|COMP|COMPREHENSIVE|PACKAGE|BUNDLE|FRESH)\b|\(\d\+\d\)|\d\+\d", text):
        kinds.add("package")
    return kinds


def vehicle_policy_kind(policy_type: str) -> str:
    return {"liability": "liability", "saod": "saod"}.get(policy_type, "package")


def city_variants(city: str) -> list:
    """'Mumbai South' -> ['MUMBAI SOUTH','MUMBAI']; 'Aurangabad (Sambhajinagar)' -> ['AURANGABAD','SAMBHAJINAGAR']."""
    raw = _norm(city)
    if not raw:
        return []
    variants = []
    inner = re.findall(r"\(([^)]*)\)", raw)
    base = re.sub(r"\([^)]*\)", "", raw).strip()
    for v in [base, *inner]:
        v = v.strip()
        if v:
            variants.append(v)
            stripped = re.sub(r"\s+(NORTH|SOUTH|EAST|WEST|CENTRAL)$", "", v).strip()
            if stripped and stripped != v:
                variants.append(stripped)
    return list(dict.fromkeys(variants))


def grid_matches_state(rto_text: str, state_code: str, city: str):
    """Returns (score, why) for how well a grid RTO label covers the vehicle's RTO, or None."""
    rto = _norm(rto_text)
    state_name = STATE_BY_CODE[state_code]
    cities = city_variants(city)

    # "excl X" / "other than X" - the row covers the area *except* X.
    excluded = ""
    m = re.search(r"(?:EXCL(?:UDING|\.)?|EXCEPT|OTHER THAN|EX\.?)\s+([A-Z &]+)", rto)
    if m:
        excluded = m.group(1).strip()

    if not rto or rto in {"ALL", "ALL INDIA", "REST OF INDIA", "ROI", "OTHERS", "OTHER", "REST"}:
        return 20, "all-India / unspecified RTO"

    for c in cities:
        if c in rto and not (excluded and c in excluded):
            return 100, f"city match ({city})"

    for alias, target in STATE_ALIASES.items():
        if alias in rto:
            rto = rto.replace(alias, target)

    if "NORTH EAST" in rto:
        if state_code in NORTH_EAST_OTHER_THAN_ASSAM and "ASSAM" in rto and "OTHER THAN" in rto:
            return 55, "North-East group"
        if state_code == "AS" and "OTHER THAN ASSAM" not in rto:
            return 55, "North-East group"

    if state_name in rto:
        if excluded and any(c in excluded for c in cities):
            return None  # the vehicle's city is explicitly carved out of this row
        # "GUJARAT - Surat" is a row for that one city, not the whole state.
        if re.search(r"\b" + re.escape(state_name) + r"\s*[-–]\s*(.+)$", rto):
            return None
        return 60, f"state match ({state_name.title()})"
    return None


def parse_cc_band(text: str):
    """'75-150cc' -> (75,150); '<75cc' -> (0,75); '>350cc' -> (350,inf); else None."""
    t = _norm(text).replace("CC", "").replace(" ", "")
    m = re.search(r"(\d+)-(\d+)", t)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.search(r"[<≤](\d+)", t)
    if m:
        return 0, int(m.group(1))
    m = re.search(r"[>≥](\d+)", t)
    if m:
        return int(m.group(1)), float("inf")
    return None


# --- Rate slab selection -----------------------------------------------------------------------

FUEL_KEYS = {
    "petrol": ("petrolPercent", "petrolNote"),
    "hybrid": ("petrolPercent", "petrolNote"),
    "diesel": ("dieselPercent", "dieselNote"),
    "cng": ("cngPercent", "cngNote"),
    "electric": ("electricPercent", "electricNote"),
}


def rate_for_fuel(slab: dict, fuel: str):
    """Returns (percent|None, note|None) for the vehicle's fuel from one slab."""
    key, note_key = FUEL_KEYS.get(fuel, ("allFuelPercent", "note"))
    value = slab.get(key)
    if isinstance(value, (int, float)):
        return float(value), None
    all_fuel = slab.get("allFuelPercent")
    if isinstance(all_fuel, (int, float)):
        return float(all_fuel), None
    return None, slab.get(note_key) or slab.get("note") or None


def score_slab(label: str, case_type: str, policy_kind: str, ncb: int):
    """Positive when the slab label fits the vehicle's situation, negative when it contradicts it."""
    text = _norm(label)
    if not text:
        return 0
    score = 0

    is_new_label = bool(re.search(r"\bNEW\b|FRESH|\(1\+\d\)|1\+3|3\+3|1\+5|5\+5", text))
    is_old_label = bool(re.search(r"RENEW|ROLLOVER|ROLL OVER|USED|NON NCB|\bOLD\b", text))
    if case_type == "new":
        score += 3 if is_new_label else (-3 if is_old_label else 0)
    elif case_type in {"renewal", "rollover", "break_in"}:
        score += 3 if is_old_label else (-3 if is_new_label else 0)

    saod_label = bool(re.search(r"SA ?-? ?OD|SAOD", text))
    act_label = bool(re.search(r"ACT ONLY|\bTP\b|LIABILITY|NET GWP", text))
    if policy_kind == "saod":
        score += 3 if saod_label else (-3 if act_label else 0)
    elif policy_kind == "liability":
        score += 3 if act_label else (-3 if saod_label else 0)
    else:
        score += -3 if (saod_label or act_label) and not re.search(r"COMP", text) else 0
        score += 1 if re.search(r"COMP|PACKAGE|BUNDLE", text) else 0

    if re.search(r"NCB\s*>\s*0", text):
        score += 2 if ncb > 0 else -3
    elif re.search(r"NON ?-? ?NCB|NCB\s*=\s*0|WITHOUT NCB|NO NCB", text):
        score += 2 if ncb == 0 else -3
    return score


def basis_for(label: str, policy_kind: str):
    """Which premium the rate applies to: ('OD'|'TP'|'NET', stated_by_grid)."""
    text = _norm(label)
    if re.search(r"NET GWP|NET PREMIUM|\bNET\b", text):
        return "NET", True
    if re.search(r"\(OD|\bOD ?%|OD PREMIUM", text):
        return "OD", True
    if re.search(r"\bTP\b|ACT ONLY|LIABILITY", text):
        return "TP", True
    return {"liability": "TP", "saod": "OD"}.get(policy_kind, "NET"), False


BASIS_LABELS = {"OD": "Own-damage premium", "TP": "Third-party premium", "NET": "Net premium (before GST)"}


# --- Matching a vehicle to rows ------------------------------------------------------------------


GENERIC_ONLY_WORDS = {"MANUFACTURE", "MANUFACTURER", "MANUFACTURED", "DEAL", "BASED", "NND", "JCB", "SA", "OD", "STP", "TP"}


def check_remarks(remarks: str, vehicle: dict):
    """Applies the conditions insurers write into remarks. Returns (ok, notes, bonus)."""
    text = _norm(remarks)
    if not text:
        return True, [], 0
    notes, bonus = [], 0
    age = vehicle.get("vehicleAge")

    m = re.search(r"UP ?TO\s*(\d+)\s*YEARS?", text)
    if m and age is not None and age > int(m.group(1)):
        return False, [], 0
    m = re.search(r"(\d+)\s*(?:TO|-)\s*(\d+)\s*YEARS?", text)
    if m and age is not None and not (int(m.group(1)) <= age <= int(m.group(2))):
        return False, [], 0

    # "NEW" rows are only for new-business cases.
    if re.search(r"(^|;\s*)NEW\b", text):
        if vehicle.get("caseType") and vehicle["caseType"] != "new":
            return False, [], 0
        bonus += 3 if vehicle.get("caseType") == "new" else 0

    m = re.search(r"NCB\s*(?:=>|>=|≥|>)\s*(\d+)", text)
    if m and vehicle.get("ncb", 0) < int(m.group(1)):
        return False, [], 0

    m = re.search(r"EXCLUDING\s*(\d+)\s*CC\s*TO\s*(\d+)\s*CC", text)
    cc = vehicle.get("cubicCapacity")
    if m and cc is not None and int(m.group(1)) <= cc <= int(m.group(2)):
        return False, [], 0

    # "Only HONDA & HYUNDAI & KIA manufacture only" / "Only EECO" - restricted to certain makes/models.
    m = re.search(r"\bONLY\s+([A-Z0-9 &,/+-]+?)(?:\(|;|$)", text)
    if m:
        tokens = [t.strip() for t in re.split(r"&|,|/|\bAND\b", m.group(1)) if t.strip()]
        tokens = [" ".join(w for w in t.split() if w not in GENERIC_ONLY_WORDS) for t in tokens]
        tokens = [t for t in tokens if t]
        label = _norm(f"{vehicle.get('vehicleMake', '')} {vehicle.get('vehicleModel', '')}")
        if tokens and label:
            if not any(t in label for t in tokens):
                return False, [], 0
            bonus += 5
        elif tokens:
            notes.append("Applies only to: " + ", ".join(t.title() for t in tokens) + " - select the make/model to confirm.")
    return True, notes, bonus


def match_item(item: dict, vehicle: dict):
    """Score one grid row against the vehicle. Returns None if the row can't apply."""
    if grid_class_of(item) != vehicle["vehicleClass"]:
        return None

    score = 10
    reasons = []

    # RTO / state
    rto_match = grid_matches_state(item.get("rto"), vehicle["stateCode"], vehicle.get("rtoCity", ""))
    if rto_match is None:
        return None
    score += rto_match[0]
    reasons.append(rto_match[1])

    # Fuel stated on the row (Shriram puts PETROL / DIESEL in the sub-product column)
    sub = _norm(item.get("subProduct"))
    fuel = vehicle.get("fuelType") or ""
    row_fuels = {f for f in ("PETROL", "DIESEL", "CNG", "ELECTRIC") if f in sub}
    if row_fuels:
        wanted = "PETROL" if fuel == "hybrid" else fuel.upper()
        if wanted not in row_fuels:
            return None
        score += 15
        reasons.append(f"{wanted.title()} row")

    # Scooter vs bike, cc bands on two-wheelers
    if vehicle["vehicleClass"] == "two_wheeler":
        if "SCOOTER" in sub:
            if vehicle.get("vehicleSubclass") != "tw_scooter":
                return None
            score += 10
        cc = vehicle.get("cubicCapacity")
        band = parse_cc_band(sub) if cc else None
        if band:
            if not (band[0] <= cc <= band[1] if band[1] != float("inf") else cc >= band[0]):
                return None
            score += 10
            reasons.append(f"{int(cc)}cc band")

    # Policy cover type
    row_kinds = grid_policy_kinds(item)
    pkind = vehicle["policyKind"]
    if row_kinds:
        if pkind not in row_kinds:
            return None
        score += 20
        reasons.append("policy type match")
        # Rows labelled "Fresh (1+5)" / "Bundle (1+3)" are new-business products; "Comp" / "P" are for renewals.
        row_is_new = bool(re.search(r"FRESH|BUNDLE|\d\+\d", _norm(item.get("policyType"))))
        case = vehicle.get("caseType")
        if pkind == "package" and row_is_new:
            if case in {"renewal", "rollover", "break_in"}:
                return None
            if case == "new":
                score += 8
        elif pkind == "package" and case == "new" and row_kinds == {"package"}:
            score -= 2

    # Conditions written in remarks (age limits, make restrictions, NCB minimums, new-only ...)
    ok, remark_notes, bonus = check_remarks(item.get("remarks"), vehicle)
    if not ok:
        return None
    score += bonus

    # Pick the best slab for the case type / NCB
    rates = item.get("rates") or []
    best = None
    for slab in rates:
        percent, note = rate_for_fuel(slab, fuel)
        slab_score = score_slab(slab.get("slabLabel"), vehicle.get("caseType"), pkind, vehicle.get("ncb", 0))
        candidate = {"slab": slab, "percent": percent, "note": note, "slabScore": slab_score}
        if best is None or (slab_score, percent is not None, percent or 0) > (
            best["slabScore"], best["percent"] is not None, best["percent"] or 0
        ):
            best = candidate
    if best is None:
        return None
    # A slab the label explicitly rules out (e.g. "New" label for a renewal) is not a match.
    if best["slabScore"] < 0:
        return None

    top_ties = [
        s for s in rates
        if score_slab(s.get("slabLabel"), vehicle.get("caseType"), pkind, vehicle.get("ncb", 0)) == best["slabScore"]
        and rate_for_fuel(s, fuel)[0] is not None
    ]
    distinct = {rate_for_fuel(s, fuel)[0] for s in top_ties}
    ambiguous = len(distinct) > 1

    return {
        "score": score + best["slabScore"],
        "item": item,
        "slab": best["slab"],
        "percent": best["percent"],
        "note": best["note"],
        "reasons": reasons,
        "remarkNotes": remark_notes,
        "ambiguous": ambiguous,
        "alternativeRates": sorted(distinct, reverse=True) if ambiguous else [],
    }


def quote_company(grid: dict, vehicle: dict, premium: dict) -> dict:
    items = (grid.get("extraction") or {}).get("lineItems") or []
    matches = [m for m in (match_item(i, vehicle) for i in items) if m]
    if not matches:
        return {"company": grid["company"], "matched": False, "reason": "No row in this grid matches the vehicle's class, RTO, fuel and policy type."}

    # Best-scoring row; between equals prefer the one that actually has a number, then the higher rate.
    matches.sort(key=lambda m: (m["score"], m["percent"] is not None, m["percent"] or 0), reverse=True)
    best = matches[0]
    item, slab = best["item"], best["slab"]
    basis, stated = basis_for(slab.get("slabLabel"), vehicle["policyKind"])
    base_amount = {"OD": premium.get("odPremium"), "TP": premium.get("tpPremium"), "NET": premium.get("netPremium")}.get(basis)

    commission = None
    if best["percent"] is not None and isinstance(base_amount, (int, float)):
        commission = round(base_amount * best["percent"] / 100, 2)

    near_ties = [m for m in matches[1:] if m["score"] == best["score"] and m["percent"] != best["percent"]]
    confidence = "high"
    notes = []
    if best["ambiguous"] or near_ties:
        confidence = "low"
        rates = sorted({m["percent"] for m in near_ties if m["percent"] is not None} | set(best["alternativeRates"]) | ({best["percent"]} if best["percent"] is not None else set()), reverse=True)
        notes.append("More than one rate could apply (" + ", ".join(f"{r:g}%" for r in rates) + ") - showing the best match; please review.")
    elif not stated:
        confidence = "medium"
    if not stated and best["percent"] is not None:
        notes.append(f"The grid doesn't say which premium this rate applies to; assumed {BASIS_LABELS[basis].lower()}.")
    if best["percent"] is None:
        notes.append(f"No fixed percentage in the grid for this row ({best['note'] or 'not stated'}).")
    if best["percent"] is not None and base_amount is None:
        notes.append("Enter the IDV (or price) to see the amount in rupees.")
    notes.extend(best["remarkNotes"])
    if item.get("remarks"):
        notes.append(f"Grid remark: {item['remarks']}")

    return {
        "company": grid["company"],
        "matched": True,
        "ratePercent": best["percent"],
        "rateNote": best["note"],
        "basis": basis,
        "basisLabel": BASIS_LABELS[basis],
        "basisStated": stated,
        "premiumBase": base_amount,
        "commission": commission,
        "confidence": confidence,
        "notes": notes,
        "matchedRow": {
            "product": item.get("product") or "",
            "subProduct": item.get("subProduct") or "",
            "policyType": item.get("policyType") or "",
            "rto": item.get("rto") or "",
            "slab": slab.get("slabLabel") or "",
            "sourceSheet": item.get("sourceSheet") or "",
            "why": best["reasons"],
        },
        "grid": {
            "id": grid.get("id"),
            "fileName": grid.get("fileName"),
            "month": grid.get("month"),
            "time": grid.get("time"),
        },
    }


def build_vehicle(payload: dict) -> dict:
    state = state_code_from(payload.get("rto", ""), payload.get("regNumber", ""))
    if not state:
        raise ValueError("Could not work out the state - pick an RTO or enter a valid registration number.")
    cc = payload.get("cubicCapacity")
    age = payload.get("vehicleAge")
    return {
        "vehicleClass": payload["vehicleClass"],
        "vehicleSubclass": payload.get("vehicleSubclass") or "",
        "fuelType": (payload.get("fuelType") or "").lower(),
        "stateCode": state,
        "rtoCity": payload.get("rtoCity") or "",
        "policyKind": vehicle_policy_kind(payload.get("policyType")),
        "caseType": payload.get("caseType") or "",
        "ncb": int(payload.get("ncb") or 0),
        "vehicleAge": float(age) if age not in (None, "") else None,
        "cubicCapacity": float(cc) if cc not in (None, "") else None,
        "vehicleMake": payload.get("vehicleMake") or "",
        "vehicleModel": payload.get("vehicleModel") or "",
    }


def quote_vehicle(payload: dict, grids: list) -> dict:
    vehicle = build_vehicle(payload)
    premium = payload.get("premium") or {}
    results = [quote_company(g, vehicle, premium) for g in grids]
    matched = [r for r in results if r["matched"]]
    matched.sort(
        key=lambda r: (r["commission"] is not None, r["commission"] or 0, r["ratePercent"] is not None, r["ratePercent"] or 0),
        reverse=True,
    )
    return {
        "vehicle": {
            "class": CLASS_LABELS.get(vehicle["vehicleClass"], vehicle["vehicleClass"]),
            "state": STATE_BY_CODE[vehicle["stateCode"]].title(),
            "city": vehicle["rtoCity"],
            "fuel": vehicle["fuelType"],
            "cover": vehicle["policyKind"],
        },
        "quotes": matched,
        "unmatched": [r for r in results if not r["matched"]],
    }
