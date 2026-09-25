// Seed data for the in-memory mock store. Structured so each entity list
// could later be swapped for a real API response with minimal refactor.

// `profile` fields are representative/illustrative figures compiled from
// public sources (IRDAI disclosures, insurer press material) — directionally
// realistic for a demo, not live/authoritative numbers. Shown in the
// Commission Checker's "View" modal so an agent has a reason beyond the
// bare commission % to explain why a company might be worth recommending.
export const seedInsurers = [
  {
    id: 'icici_lombard',
    name: 'ICICI Lombard General Insurance',
    shortCode: 'ICICI',
    baseCommissionRate: 10,
    profile: {
      type: 'Private',
      claimSettlementRatio: 94,
      cashlessGarages: 14500,
      note: "India's largest private non-life insurer by gross written premium, with the widest cashless garage network among private players.",
    },
  },
  {
    id: 'bajaj_allianz',
    name: 'Bajaj Allianz General Insurance',
    shortCode: 'BAJAJ',
    baseCommissionRate: 9,
    profile: {
      type: 'Private',
      claimSettlementRatio: 98,
      cashlessGarages: 7000,
      note: 'Backed by Bajaj Finserv, one of the most consistent claim-settlement performers among large private insurers.',
    },
  },
  {
    id: 'hdfc_ergo',
    name: 'HDFC ERGO General Insurance',
    shortCode: 'HDFC ERGO',
    baseCommissionRate: 11,
    profile: {
      type: 'Private',
      claimSettlementRatio: 95,
      cashlessGarages: 12000,
      note: 'Formed via the HDFC General Insurance + L&T General Insurance merger; a top-3 private general insurer by scale.',
    },
  },
  {
    id: 'tata_aig',
    name: 'Tata AIG General Insurance',
    shortCode: 'TATA AIG',
    baseCommissionRate: 8.5,
    profile: {
      type: 'Private',
      claimSettlementRatio: 95,
      cashlessGarages: 10000,
      note: 'Joint venture between the Tata Group and AIG, combining a trusted Indian brand with global underwriting expertise.',
    },
  },
  {
    id: 'magma_hdi',
    name: 'Magma HDI General Insurance',
    shortCode: 'MAGMA HDI',
    baseCommissionRate: 9.5,
    profile: {
      type: 'Private',
      claimSettlementRatio: 90,
      cashlessGarages: 4000,
      note: 'Joint venture between Magma Fincorp (India) and HDI Global SE (Germany) — competitive commercial/GCV grid strength.',
    },
  },
  {
    id: 'acko_general',
    name: 'ACKO General Insurance',
    shortCode: 'ACKO',
    baseCommissionRate: 7.5,
    profile: {
      type: 'Private',
      claimSettlementRatio: 99,
      cashlessGarages: 2000,
      note: "India's first fully digital-only insurer — no branches, lower overhead passed on as one of the industry's highest claim ratios.",
    },
  },
  {
    id: 'sbi_general',
    name: 'SBI General Insurance Company Limited',
    shortCode: 'SBI',
    baseCommissionRate: 10.5,
    profile: {
      type: 'Private',
      claimSettlementRatio: 96,
      cashlessGarages: 16000,
      note: 'Bank-backed insurer promoted by State Bank of India, with reach through the SBI branch network.',
    },
  },
  {
    id: 'go_digit',
    name: 'Go Digit General Insurance Limited',
    shortCode: 'DIGIT',
    baseCommissionRate: 8,
    profile: {
      type: 'Private',
      claimSettlementRatio: 92,
      cashlessGarages: 9000,
      note: 'Digital-first insurer with a large motor book — over a crore car policies sold, strong app-based claims experience.',
    },
  },
  {
    id: 'united_india',
    name: 'United India Insurance Company Limited',
    shortCode: 'UIIC',
    baseCommissionRate: 12,
    profile: {
      type: 'PSU (Government-owned)',
      claimSettlementRatio: 95,
      cashlessGarages: 3100,
      note: 'Wholly government-owned — one of the oldest PSU general insurers, offering the highest base commission in this panel.',
    },
  },
  {
    id: 'reliance_general',
    name: 'Reliance General Insurance',
    shortCode: 'RELIANCE',
    baseCommissionRate: 9.8,
    profile: {
      type: 'Private',
      claimSettlementRatio: 96,
      cashlessGarages: 7500,
      note: 'Established private general insurer with a broad motor and commercial vehicle grid across zones.',
    },
  },
  {
    id: 'iffco_tokio',
    name: 'IFFCO Tokio General Insurance',
    shortCode: 'IFFCO TOKIO',
    baseCommissionRate: 10.2,
    profile: {
      type: 'Private',
      claimSettlementRatio: 91,
      cashlessGarages: 4300,
      note: 'Joint venture between IFFCO and Tokio Marine (Japan) — strong rural and semi-urban distribution reach.',
    },
  },
];

// Sourced from Record/Aug Month 2026/Royal/FW_ SAMA BROKER AUGUST 2026 MOTOR
// GRID...eml — the real internal distribution list Sama Insurance's broker
// grids get forwarded through (Account Officer / Sales & broking desk).
// Designations and branches are the POC's best-effort read of each person's
// role in that email chain; emails/names are exactly as they appear there.
export const seedAgents = [
  { id: 'AGT-1001', name: 'Krupal Prajapati', designation: 'Account Officer', email: 'krupalprajapati@samainsurance.in', mobile: '+91-8866886657', branch: 'Ahmedabad' },
  { id: 'AGT-1002', name: 'Yamin Visalpurwala', designation: 'Broking Executive', email: 'yaminvisalpurwala@samainsurance.in', mobile: '+91-98250-11234', branch: 'Ahmedabad' },
  { id: 'AGT-1003', name: 'Saurabh Singh', designation: 'Broking Executive', email: 'saurabh.singh@samainsurance.in', mobile: '+91-98250-11235', branch: 'Mumbai' },
  { id: 'AGT-1004', name: 'Himanshu Ray', designation: 'Broking Executive', email: 'himanshu.ray@samainsurance.in', mobile: '+91-98250-11236', branch: 'Mumbai' },
  { id: 'AGT-1005', name: 'Imran Sama', designation: 'Sales Head', email: 'imransama@samainsurance.in', mobile: '+91-98250-11237', branch: 'Ahmedabad' },
  { id: 'AGT-1006', name: 'Subhash Goenka', designation: 'Director', email: 'subhash.goenka@samainsurance.com', mobile: '+91-98250-11238', branch: 'Head Office' },
];

// Commission rules seeded from real Aug'26 broker payout grids
// (Record/Aug Month 2026/{Insurer}/...), 6-7 rules per insurer, covering
// the RTOs/states already used elsewhere in this app. Rates are the actual
// negotiated broker payout percentages from each insurer's grid — only the
// RTO groupings were narrowed to a representative subset for the POC.
export const seedRules = [
  // ---- ICICI Lombard — Private Car grid (Sheet1: RTO State vs policy/fuel) ----
  {
    id: 'rule_icici_gujarat_new_allfuel',
    name: 'ICICI — Gujarat, New (1+3/3+3) All Fuel',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 27.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_maharashtra_comp_petrol',
    name: 'ICICI — Maharashtra, Comprehensive Petrol (>0% NCB)',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01', 'MH-12', 'MH-14', 'MH-20'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 15 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_karnataka_saod_petrol',
    name: 'ICICI — Karnataka, SAOD Petrol (>0% NCB)',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['KA-05'] },
        { field: 'policyType', operator: 'equals', value: 'saod' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 25 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_tamilnadu_new_allfuel',
    name: 'ICICI — Tamil Nadu, New (1+3/3+3) All Fuel',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['TN-09'] },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 20 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_rajasthan_comp_diesel',
    name: 'ICICI — Rajasthan, Comprehensive Diesel (>0% NCB)',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['RJ-14'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'equals', value: 'diesel' },
      ],
    },
    outcome: { type: 'percentage', value: 15 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_westbengal_saod_allfuel',
    name: 'ICICI — West Bengal, New (1+3/3+3) All Fuel',
    insurerId: 'icici_lombard',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['WB-06'] },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 20.16 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_icici_usedcar_gujarat',
    name: 'ICICI — Gujarat, Used Car (All Fuel)',
    insurerId: 'icici_lombard',
    scopeType: 'vehicleParam',
    priority: 30,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'caseType', operator: 'equals', value: 'rollover' },
      ],
    },
    outcome: { type: 'percentage', value: 25 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Bajaj Allianz — PC SATP grid (Table 1: RTO/State vs fuel) ----
  {
    id: 'rule_bajaj_gujarat_petrol_satp',
    name: 'Bajaj — Gujarat SATP, Petrol',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 48 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_mumbai_petrol_satp',
    name: 'Bajaj — Mumbai SATP, Petrol',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 55.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_mumbai_diesel_satp',
    name: 'Bajaj — Mumbai SATP, Diesel',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'diesel' },
      ],
    },
    outcome: { type: 'percentage', value: 54.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_pune_petrol_satp',
    name: 'Bajaj — Pune SATP, Petrol',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-12', 'MH-14'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 54.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_pune_cng_satp',
    name: 'Bajaj — Pune SATP, CNG',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-12', 'MH-14'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'cng' },
      ],
    },
    outcome: { type: 'percentage', value: 34.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_westbengal_petrol_satp',
    name: 'Bajaj — Kolkata SATP, Petrol',
    insurerId: 'bajaj_allianz',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['WB-06'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 44 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_bajaj_uttarakhand_petrol_satp',
    name: 'Bajaj — Rest of state SATP fallback, Petrol',
    insurerId: 'bajaj_allianz',
    scopeType: 'vehicleParam',
    priority: 40,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 20 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Tata AIG — Pvt Car SATP grid (city-wise, by segment/fuel) ----
  {
    id: 'rule_tataaig_mumbai_electric_satp',
    name: 'Tata AIG — Mumbai SATP, Electric/Other',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'electric' },
      ],
    },
    outcome: { type: 'percentage', value: 46 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_tataaig_mumbai_diesel_satp',
    name: 'Tata AIG — Mumbai SATP, Diesel/CNG',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'in', value: ['diesel', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 37 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_tataaig_pune_electric_satp',
    name: 'Tata AIG — Pune SATP, Electric/Other',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-12', 'MH-14'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'electric' },
      ],
    },
    outcome: { type: 'percentage', value: 46 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_tataaig_delhi_electric_satp',
    name: 'Tata AIG — Delhi SATP, Electric/Other',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'electric' },
      ],
    },
    outcome: { type: 'percentage', value: 36 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_tataaig_delhi_diesel_satp',
    name: 'Tata AIG — Delhi SATP, Diesel/CNG',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'in', value: ['diesel', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 20 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_tataaig_ahmedabad_electric_satp',
    name: 'Tata AIG — Ahmedabad SATP, Electric/Other',
    insurerId: 'tata_aig',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'policyType', operator: 'equals', value: 'liability' },
        { field: 'fuelType', operator: 'equals', value: 'electric' },
      ],
    },
    outcome: { type: 'percentage', value: 31 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Magma HDI — Pvt Car grid (RTO Vs Cluster + '>5 to <=18' payout sheet) ----
  {
    id: 'rule_magma_gujarat_petrol_ncb',
    name: 'Magma — Gujarat (GJ2 cluster), Petrol with NCB',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
        { field: 'ncb', operator: 'not_equals', value: '0' },
      ],
    },
    outcome: { type: 'percentage', value: 13.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_gujarat_diesel_zero_ncb',
    name: 'Magma — Gujarat (GJ2 cluster), Diesel Zero NCB',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'fuelType', operator: 'equals', value: 'diesel' },
        { field: 'ncb', operator: 'equals', value: '0' },
      ],
    },
    outcome: { type: 'percentage', value: 24.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_delhi_petrol',
    name: 'Magma — Delhi NCR cluster, Petrol',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
      ],
    },
    outcome: { type: 'percentage', value: 21.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_delhi_diesel',
    name: 'Magma — Delhi NCR cluster, Diesel',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'fuelType', operator: 'equals', value: 'diesel' },
      ],
    },
    outcome: { type: 'percentage', value: 15.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_mumbai_petrol_ncb',
    name: 'Magma — Mumbai (MH1 cluster), Petrol with NCB',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'fuelType', operator: 'equals', value: 'petrol' },
        { field: 'ncb', operator: 'not_equals', value: '0' },
      ],
    },
    outcome: { type: 'percentage', value: 17.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_pune_diesel_ncb',
    name: 'Magma — Pune (MH2 cluster), Diesel with NCB',
    insurerId: 'magma_hdi',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-12', 'MH-14'] },
        { field: 'fuelType', operator: 'equals', value: 'diesel' },
        { field: 'ncb', operator: 'not_equals', value: '0' },
      ],
    },
    outcome: { type: 'percentage', value: 18.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_commercial_renewal',
    name: 'Magma — Commercial GCV renewals (cross-cluster)',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 25,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'commercial_gcv' },
        { field: 'caseType', operator: 'equals', value: 'renewal' },
      ],
    },
    outcome: { type: 'percentage', value: 19 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Magma HDI — GCV by GVW weight band (Aug'26 grid, '>5 to <=18' payout sheet) ----
  {
    id: 'rule_magma_gcv_gujarat_le2_5t',
    name: 'Magma — Gujarat (GJ2), GCV ≤2.5T',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'weightBand', operator: 'equals', value: 'le_2_5t' },
      ],
    },
    outcome: { type: 'percentage', value: 56 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_gcv_gujarat_12_20t',
    name: 'Magma — Gujarat (GJ2), GCV 12T-20T (Age ≥5 yrs)',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'weightBand', operator: 'equals', value: '12_20t' },
        { field: 'vehicleAge', operator: 'gt', value: 4.9 },
      ],
    },
    outcome: { type: 'percentage', value: 36 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_gcv_delhi_3_5_7_5t',
    name: 'Magma — Delhi NCR, GCV 3.5T-7.5T',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'weightBand', operator: 'equals', value: '3_5_7_5t' },
      ],
    },
    outcome: { type: 'percentage', value: 22 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_gcv_mumbai_7_5_12t',
    name: 'Magma — Mumbai (MH1), GCV 7.5T-12T',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01'] },
        { field: 'weightBand', operator: 'equals', value: '7_5_12t' },
      ],
    },
    outcome: { type: 'percentage', value: 37 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Magma HDI — MISC-D (Tractor) ----
  {
    id: 'rule_magma_tractor_gujarat_new',
    name: 'Magma — Gujarat (GJ2), Tractor New',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['GJ-01', 'GJ-05', 'GJ-18', 'GJ-27'] },
        { field: 'vehicleClass', operator: 'equals', value: 'misc_d' },
        { field: 'vehicleSubclass', operator: 'equals', value: 'tractor_new' },
      ],
    },
    outcome: { type: 'percentage', value: 21 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_magma_tractor_delhi_new',
    name: 'Magma — Delhi NCR, Tractor New',
    insurerId: 'magma_hdi',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'vehicleClass', operator: 'equals', value: 'misc_d' },
        { field: 'vehicleSubclass', operator: 'equals', value: 'tractor_new' },
      ],
    },
    outcome: { type: 'percentage', value: 24 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Cross-insurer business rules (apply across ALL insurers) ----
  {
    id: 'rule_saod_reduced_commission',
    name: 'SAOD (Standalone Own Damage) policies — reduced commission',
    insurerId: 'ALL',
    scopeType: 'vehicleParam',
    priority: 5,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [{ field: 'policyType', operator: 'equals', value: 'saod' }],
    },
    outcome: { type: 'percentage', value: 6 },
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'rule_breakin_reduced_commission',
    name: 'Break-In cases — reduced commission across insurers',
    insurerId: 'ALL',
    scopeType: 'vehicleParam',
    priority: 6,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [{ field: 'caseType', operator: 'equals', value: 'break_in' }],
    },
    outcome: { type: 'percentage', value: 5 },
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    id: 'rule_high_seating_pcv_bonus',
    name: 'High seating capacity (7+) PCV — Go Digit bonus',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 20,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'commercial_pcv' },
        { field: 'seatingCapacity', operator: 'gt', value: 6 },
      ],
    },
    outcome: { type: 'percentage', value: 10.5 },
    effectiveFrom: null,
    effectiveTo: null,
  },

  // ---- Reliance General — Private Car Base Grid (zone x fuel, Jun 2026) ----
  {
    id: 'rule_reliance_west_petrol_comp',
    name: 'Reliance — Mumbai/Pune/Goa, Petrol/Bifuel Comprehensive',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01', 'MH-12', 'MH-14'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'in', value: ['petrol', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 22.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_reliance_west_diesel_comp',
    name: 'Reliance — Mumbai/Pune/Goa, Diesel/EV Comprehensive',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['MH-01', 'MH-12', 'MH-14'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'in', value: ['diesel', 'electric'] },
      ],
    },
    outcome: { type: 'percentage', value: 10 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_reliance_delhi_petrol_comp',
    name: 'Reliance — Delhi, Petrol/Bifuel Comprehensive',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'in', value: ['petrol', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 20 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_reliance_bangalore_petrol_comp',
    name: 'Reliance — Bangalore/Hyderabad, Petrol/Bifuel Comprehensive',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'rto', operator: 'in', value: ['KA-05', 'TS-08'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
        { field: 'fuelType', operator: 'in', value: ['petrol', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 17.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_reliance_saod_all',
    name: 'Reliance — SAOD (all zones)',
    insurerId: 'reliance_general',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'private_car' },
        { field: 'policyType', operator: 'equals', value: 'saod' },
      ],
    },
    outcome: { type: 'percentage', value: 22.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Reliance General — Two-Wheeler Scooter Grid (zone-based, Jun 2026) ----
  {
    id: 'rule_reliance_tw_north_comp',
    name: 'Reliance TW — Delhi/Punjab/Chandigarh, Comprehensive',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'two_wheeler' },
        { field: 'rto', operator: 'in', value: ['DL-01', 'DL-08'] },
        { field: 'policyType', operator: 'equals', value: 'package' },
      ],
    },
    outcome: { type: 'percentage', value: 57.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_reliance_tw_south_saod',
    name: 'Reliance TW — Bangalore/Karnataka, SAOD (no EV/battery payout)',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 10,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'two_wheeler' },
        { field: 'rto', operator: 'in', value: ['KA-05'] },
        { field: 'policyType', operator: 'equals', value: 'saod' },
        { field: 'fuelType', operator: 'not_equals', value: 'electric' },
      ],
    },
    outcome: { type: 'percentage', value: 30 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Reliance General — Short Term Taxi Grid (zone-based, Jun 2026) ----
  {
    id: 'rule_reliance_taxi_mumbai_petrol',
    name: 'Reliance — Short-Term Taxi, Mumbai/Pune, Petrol/CNG (Non ND)',
    insurerId: 'reliance_general',
    scopeType: 'rto',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'commercial_pcv' },
        { field: 'vehicleSubclass', operator: 'equals', value: 'pcv_taxi' },
        { field: 'rto', operator: 'in', value: ['MH-01', 'MH-12'] },
        { field: 'fuelType', operator: 'in', value: ['petrol', 'cng'] },
      ],
    },
    outcome: { type: 'percentage', value: 37.5 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },

  // ---- Go Digit — Private Car Grid, make-specific (FW Grid, New Business) ----
  {
    id: 'rule_digit_pvtcar_hyundai_nb',
    name: 'Digit — Private Car New Business, Hyundai (Pune/ROM, 1+3 90:10)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleMake', operator: 'equals', value: 'hyundai' },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 26 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_digit_pvtcar_mahindra_nb',
    name: 'Digit — Private Car New Business, Mahindra & Mahindra (Pune/ROM, 1+3 90:10)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleMake', operator: 'equals', value: 'mahindra_cars' },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 30 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_digit_pvtcar_tata_nb',
    name: 'Digit — Private Car New Business, Tata Motors (Pune/ROM, 1+3 90:10)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleMake', operator: 'equals', value: 'tata_motors' },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 25 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_digit_pvtcar_toyota_nb',
    name: 'Digit — Private Car New Business, Toyota (Pune/ROM, 1+3 90:10)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleMake', operator: 'equals', value: 'toyota' },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 26 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_digit_pvtcar_kia_nb',
    name: 'Digit — Private Car New Business, Kia (Pune/ROM, 1+3 90:10)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 15,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleMake', operator: 'equals', value: 'kia' },
        { field: 'caseType', operator: 'equals', value: 'new' },
      ],
    },
    outcome: { type: 'percentage', value: 24 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
  {
    id: 'rule_digit_pvtcar_oldbiz_saod',
    name: 'Digit — Private Car Old Business, SAOD (>0% NCB, 1-3 Lac IDV slab)',
    insurerId: 'go_digit',
    scopeType: 'vehicleParam',
    priority: 12,
    active: true,
    conditionTree: {
      logic: 'AND',
      conditions: [
        { field: 'vehicleClass', operator: 'equals', value: 'private_car' },
        { field: 'policyType', operator: 'equals', value: 'saod' },
        { field: 'caseType', operator: 'equals', value: 'renewal' },
      ],
    },
    outcome: { type: 'percentage', value: 26 },
    effectiveFrom: '2026-08-01',
    effectiveTo: null,
  },
];

// Issued policy certificates — modeled on a real motor insurance "Certificate
// cum Policy Schedule" (policy number, vehicle details, IDV, premium
// schedule, dates). Deliberately excludes any policyholder-identifying data
// (name, contact, registration/engine/chassis numbers) since these are
// browsed by agents/users as general product records, not private records.
// Admin uploads these one at a time; agents/users browse the grid.
export const seedPolicies = [
  {
    id: 'policy_cert_001',
    insurerId: 'reliance_general',
    policyNumber: '231702312310000060',
    certificateNumber: '2317/PVT CAR/1234567/00/000',
    category: 'private_car',
    policyType: 'package',

    vehicleMake: 'mahindra_cars',
    vehicleModel: 'xuv700',
    vehicleVariant: 'AX7',
    cubicCapacity: 2198,
    seatingCapacity: 7,
    yearOfManufacture: 2022,
    registrationDate: '2022-03-18',
    rto: 'GJ-01',
    fuelType: 'diesel',

    idv: 1645000,
    idvBreakup: {
      vehicle: 1595000,
      accessories: 30000,
      electricalFittings: 12000,
      nonElectricalFittings: 8000,
    },

    premium: {
      odPremium: 47820.15,
      tpPremium: 7897,
      addonPremium: 46890,
      netPremium: 102607.15,
      gstPercent: 18,
      gstAmount: 18469.29,
      finalPremium: 121080,
      totalDiscountPercent: 23.5,
    },

    ncbPercent: 0,

    policyIssueDate: '2026-03-20',
    periodFrom: '2026-03-20',
    periodTo: '2027-03-19',

    claimSettlementRatio: 98.6,
    cashlessGarages: 8500,
    active: true,
  },
  {
    id: 'policy_cert_002',
    insurerId: 'icici_lombard',
    policyNumber: '301500312310004521',
    certificateNumber: '3015/PVT CAR/0045210/00/000',
    category: 'private_car',
    policyType: 'package',

    vehicleMake: 'maruti_suzuki',
    vehicleModel: 'swift',
    vehicleVariant: 'VXI',
    cubicCapacity: 1197,
    seatingCapacity: 5,
    yearOfManufacture: 2022,
    registrationDate: '2022-06-15',
    rto: 'MH-12',
    fuelType: 'petrol',

    idv: 507500,
    idvBreakup: {
      vehicle: 492000,
      accessories: 8000,
      electricalFittings: 5000,
      nonElectricalFittings: 2500,
    },

    premium: {
      odPremium: 11286.8,
      tpPremium: 3416,
      addonPremium: 14460,
      netPremium: 29162.8,
      gstPercent: 18,
      gstAmount: 5249.3,
      finalPremium: 34410,
      totalDiscountPercent: 30.5,
    },

    ncbPercent: 25,

    policyIssueDate: '2026-06-10',
    periodFrom: '2026-06-15',
    periodTo: '2027-06-14',

    claimSettlementRatio: 98.2,
    cashlessGarages: 4200,
    active: true,
  },
  {
    id: 'policy_cert_003',
    insurerId: 'hdfc_ergo',
    policyNumber: '204103312310007788',
    certificateNumber: '2041/PVT CAR/0077880/00/000',
    category: 'private_car',
    policyType: 'saod',

    vehicleMake: 'honda_cars',
    vehicleModel: 'city',
    vehicleVariant: 'V CVT',
    cubicCapacity: 1498,
    seatingCapacity: 5,
    yearOfManufacture: 2023,
    registrationDate: '2023-08-05',
    rto: 'MP-09',
    fuelType: 'petrol',

    idv: 1292000,
    idvBreakup: {
      vehicle: 1265000,
      accessories: 15000,
      electricalFittings: 8000,
      nonElectricalFittings: 4000,
    },

    premium: {
      odPremium: 24599.68,
      tpPremium: 3416,
      addonPremium: 36830,
      netPremium: 64845.68,
      gstPercent: 18,
      gstAmount: 11672.22,
      finalPremium: 76520,
      totalDiscountPercent: 40.5,
    },

    ncbPercent: 35,

    policyIssueDate: '2026-07-28',
    periodFrom: '2026-08-05',
    periodTo: '2027-08-04',

    claimSettlementRatio: 99.1,
    cashlessGarages: 7200,
    active: true,
  },
  {
    id: 'policy_cert_004',
    insurerId: 'go_digit',
    policyNumber: '506207312310001199',
    certificateNumber: '5062/TWO WHLR/0011990/00/000',
    category: 'two_wheeler',
    policyType: 'liability',

    vehicleMake: 'bajaj_auto',
    vehicleModel: 'pulsar',
    vehicleVariant: 'NS200 Std',
    cubicCapacity: 199,
    seatingCapacity: 2,
    yearOfManufacture: 2022,
    registrationDate: '2022-02-28',
    rto: 'RJ-14',
    fuelType: 'petrol',

    idv: 0,
    idvBreakup: null,

    premium: {
      odPremium: 0,
      tpPremium: 1366,
      addonPremium: 0,
      netPremium: 1366,
      gstPercent: 18,
      gstAmount: 245.88,
      finalPremium: 1610,
      totalDiscountPercent: 26.5,
    },

    ncbPercent: 20,

    policyIssueDate: '2026-02-20',
    periodFrom: '2026-02-28',
    periodTo: '2027-02-27',

    claimSettlementRatio: 97.3,
    cashlessGarages: 3700,
    active: true,
  },
  {
    id: 'policy_cert_005',
    insurerId: 'tata_aig',
    policyNumber: '108509312310003345',
    certificateNumber: '1085/COMM GCV/0033450/00/000',
    category: 'commercial_gcv',
    policyType: 'package',

    vehicleMake: 'tata_commercial',
    vehicleModel: 'ace',
    vehicleVariant: 'Gold',
    cubicCapacity: 2393,
    seatingCapacity: 7,
    yearOfManufacture: 2020,
    registrationDate: '2020-09-25',
    rto: 'TN-09',
    fuelType: 'diesel',

    idv: 1050000,
    idvBreakup: {
      vehicle: 1010000,
      accessories: 20000,
      electricalFittings: 12000,
      nonElectricalFittings: 8000,
    },

    premium: {
      odPremium: 13965,
      tpPremium: 7897,
      addonPremium: 29930,
      netPremium: 51792,
      gstPercent: 18,
      gstAmount: 9322.56,
      finalPremium: 61110,
      totalDiscountPercent: 65,
    },

    ncbPercent: 50,

    policyIssueDate: '2026-09-15',
    periodFrom: '2026-09-25',
    periodTo: '2027-09-24',

    claimSettlementRatio: 94.8,
    cashlessGarages: 2600,
    active: true,
  },
];

// Agent-specific overrides — highest precedence tier in the engine.
export const seedAgentOverrides = [
  {
    id: 'override_krupal_icici',
    agentId: 'AGT-1001',
    name: 'Krupal Prajapati — ICICI Lombard loyalty override',
    insurerId: 'icici_lombard',
    conditionTree: null, // applies regardless of other params, for this agent+insurer
    outcome: { type: 'percentage', value: 16 },
    effectiveFrom: null,
    effectiveTo: null,
  },
];
