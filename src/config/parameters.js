// Config-driven parameter registry.
//
// Every field the rule engine can evaluate — and every field the agent form
// collects — is declared once here. Adding a new field (e.g. "add-on cover")
// means adding one entry to PARAMETERS; the condition builder, the agent
// form, and the plain-English rule summary all pick it up automatically.

export const FIELD_TYPES = {
  SELECT: 'select', // single choice from options
  MULTI_SELECT: 'multi_select', // list-based field (supports in/not in)
  NUMBER: 'number', // supports between/gt/lt/equals
  TEXT: 'text',
};

export const OPERATORS = {
  equals: { label: 'equals', symbol: '=' },
  not_equals: { label: 'not equals', symbol: '≠' },
  in: { label: 'is any of', symbol: 'in' },
  not_in: { label: 'is none of', symbol: 'not in' },
  between: { label: 'is between', symbol: 'between' },
  gt: { label: 'greater than', symbol: '>' },
  lt: { label: 'less than', symbol: '<' },
};

// Which operators make sense for each field type.
export const OPERATORS_BY_TYPE = {
  [FIELD_TYPES.SELECT]: ['equals', 'not_equals', 'in', 'not_in'],
  [FIELD_TYPES.MULTI_SELECT]: ['in', 'not_in', 'equals', 'not_equals'],
  [FIELD_TYPES.NUMBER]: ['between', 'gt', 'lt', 'equals', 'not_equals'],
  [FIELD_TYPES.TEXT]: ['equals', 'not_equals', 'in', 'not_in'],
};

export const RTO_OPTIONS = [
  { value: 'GJ-01', label: 'GJ-01 — Ahmedabad' },
  { value: 'GJ-05', label: 'GJ-05 — Surat' },
  { value: 'GJ-18', label: 'GJ-18 — Gandhinagar' },
  { value: 'GJ-27', label: 'GJ-27 — Rajkot' },
  { value: 'MH-01', label: 'MH-01 — Mumbai South' },
  { value: 'MH-12', label: 'MH-12 — Pune' },
  { value: 'MH-14', label: 'MH-14 — Pimpri-Chinchwad' },
  { value: 'MH-20', label: 'MH-20 — Aurangabad (Sambhajinagar)' },
  { value: 'DL-01', label: 'DL-01 — Delhi Central' },
  { value: 'DL-08', label: 'DL-08 — Delhi West' },
  { value: 'KA-05', label: 'KA-05 — Bengaluru' },
  { value: 'MP-09', label: 'MP-09 — Indore' },
  { value: 'TN-09', label: 'TN-09 — Chennai' },
  { value: 'UP-32', label: 'UP-32 — Lucknow' },
  { value: 'RJ-14', label: 'RJ-14 — Jaipur' },
  { value: 'TS-08', label: 'TS-08 — Hyderabad' },
  { value: 'WB-06', label: 'WB-06 — Kolkata' },
];

// The 5 top-level categories real Indian motor broker payout grids use
// (TW / PC / GCV / PCV / MISC-D). Subclasses mirror how each category is
// actually underwritten:
//   - TW (two_wheeler): by engine cc band, since risk & payout differ by cc
//   - PC (private_car): by market segment (Mini/Compact/Mid-Size/MPV-SUV/
//     High-End/Ultra-High-End) — this is the dimension grids key off, not
//     body style
//   - GCV (commercial_gcv): by Gross Vehicle Weight (GVW) band — the
//     industry-standard way goods carriers are rated, plus a 3W goods line
//   - PCV (commercial_pcv): by use-type (3W auto, taxi, school bus vs.
//     other bus — school buses carry distinct risk/regulatory treatment)
//   - MISC-D (misc_d): the "miscellaneous & special types" catch-all —
//     tractors, construction equipment, harvesters, e-rickshaw/e-loader
export const VEHICLE_CLASSES = [
  {
    value: 'private_car',
    label: 'Private Car (PC)',
    subclasses: [
      { value: 'mini', label: 'Mini' },
      { value: 'compact', label: 'Compact' },
      { value: 'mid_size', label: 'Mid-Size' },
      { value: 'mpv_suv', label: 'MPV / SUV' },
      { value: 'high_end', label: 'High-End' },
      { value: 'ultra_high_end', label: 'Ultra High-End' },
    ],
  },
  {
    value: 'two_wheeler',
    label: 'Two-Wheeler (TW)',
    subclasses: [
      { value: 'tw_lt75cc', label: '<75cc' },
      { value: 'tw_75_150cc', label: '75-150cc' },
      { value: 'tw_150_350cc', label: '150-350cc' },
      { value: 'tw_gt350cc', label: '>350cc' },
      { value: 'tw_scooter', label: 'Scooter' },
    ],
  },
  {
    value: 'commercial_gcv',
    label: 'Commercial — GCV (Goods Carrying)',
    subclasses: [
      { value: 'gcv_3w', label: 'GCV 3-Wheeler' },
      { value: 'gcv_le_2_5t', label: '≤2.5T' },
      { value: 'gcv_2_5_3_5t', label: '2.5T - 3.5T' },
      { value: 'gcv_3_5_7_5t', label: '3.5T - 7.5T' },
      { value: 'gcv_7_5_12t', label: '7.5T - 12T' },
      { value: 'gcv_12_20t', label: '12T - 20T' },
      { value: 'gcv_20_40t', label: '20T - 40T' },
      { value: 'gcv_gt40t', label: '>40T' },
    ],
  },
  {
    value: 'commercial_pcv',
    label: 'Commercial — PCV (Passenger Carrying)',
    subclasses: [
      { value: 'pcv_3w', label: 'PCV 3-Wheeler (Auto)' },
      { value: 'pcv_taxi', label: 'Taxi' },
      { value: 'pcv_bus_school', label: 'Bus - School' },
      { value: 'pcv_bus_other', label: 'Bus - Other' },
    ],
  },
  {
    value: 'misc_d',
    label: 'Miscellaneous & Special Types (MISC-D)',
    subclasses: [
      { value: 'tractor_new', label: 'Tractor - New' },
      { value: 'tractor_old', label: 'Tractor - Old' },
      { value: 'construction_equipment', label: 'Construction Equipment (CE)' },
      { value: 'harvester_new', label: 'Harvester - New' },
      { value: 'harvester_old', label: 'Harvester - Old' },
      { value: 'e_rickshaw_loader', label: 'E-Rickshaw / E-Loader' },
    ],
  },
];

// GCV Gross Vehicle Weight bands — the real dimension broker payout grids
// key off for goods-carrying commission (e.g. Magma's grid pays 17.5% for
// 12-20T but 21% for 20-40T on the same route). Kept as a separate field
// (rather than folded only into vehicleSubclass) so it's directly usable
// as its own rule-condition field, matching how underwriters describe it.
export const GCV_WEIGHT_BANDS = [
  { value: 'gcv_3w', label: 'GCV 3-Wheeler (no weight band)' },
  { value: 'le_2_5t', label: '≤ 2.5 Tonnes' },
  { value: '2_5_3_5t', label: '2.5 - 3.5 Tonnes' },
  { value: '3_5_7_5t', label: '3.5 - 7.5 Tonnes' },
  { value: '7_5_12t', label: '7.5 - 12 Tonnes' },
  { value: '12_20t', label: '12 - 20 Tonnes' },
  { value: '20_40t', label: '20 - 40 Tonnes' },
  { value: 'gt_40t', label: '> 40 Tonnes' },
];

// Vehicle manufacturers ("Motor Company") with their models, per vehicle
// class — drives the Make -> Model cascading dropdowns on the entry form.
// Each model carries its own realistic `fuelTypes` list (values from
// FUEL_TYPES below) so the Fuel Type field can be filtered to only what
// that model is actually sold as — e.g. a Splendor never offers Diesel.
export const VEHICLE_MAKES = [
  {
    value: 'maruti_suzuki',
    label: 'Maruti Suzuki',
    vehicleClass: 'private_car',
    models: [
      { value: 'swift', label: 'Swift', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 725000 },
      { value: 'baleno', label: 'Baleno', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 790000 },
      { value: 'wagonr', label: 'WagonR', fuelTypes: ['petrol', 'cng'], cubicCapacity: 998, seatingCapacity: 5, exShowroomPrice: 620000 },
      { value: 'brezza', label: 'Brezza', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1462, seatingCapacity: 5, exShowroomPrice: 1050000 },
      { value: 'ertiga', label: 'Ertiga', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1462, seatingCapacity: 7, exShowroomPrice: 1150000 },
    ],
  },
  {
    value: 'hyundai',
    label: 'Hyundai',
    vehicleClass: 'private_car',
    models: [
      { value: 'i20', label: 'i20', fuelTypes: ['petrol'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 780000 },
      { value: 'creta', label: 'Creta', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1493, seatingCapacity: 5, exShowroomPrice: 1850000 },
      { value: 'venue', label: 'Venue', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 950000 },
      { value: 'verna', label: 'Verna', fuelTypes: ['petrol'], cubicCapacity: 1497, seatingCapacity: 5, exShowroomPrice: 1150000 },
    ],
  },
  {
    value: 'tata_motors',
    label: 'Tata Motors',
    vehicleClass: 'private_car',
    models: [
      { value: 'nexon', label: 'Nexon', fuelTypes: ['petrol', 'diesel', 'electric'], cubicCapacity: 1199, seatingCapacity: 5, exShowroomPrice: 1050000 },
      { value: 'punch', label: 'Punch', fuelTypes: ['petrol', 'electric'], cubicCapacity: 1199, seatingCapacity: 5, exShowroomPrice: 700000 },
      { value: 'tiago', label: 'Tiago', fuelTypes: ['petrol', 'cng', 'electric'], cubicCapacity: 1199, seatingCapacity: 5, exShowroomPrice: 600000 },
      { value: 'harrier', label: 'Harrier', fuelTypes: ['diesel'], cubicCapacity: 1956, seatingCapacity: 5, exShowroomPrice: 1650000 },
    ],
  },
  {
    value: 'honda_cars',
    label: 'Honda Cars',
    vehicleClass: 'private_car',
    models: [
      { value: 'city', label: 'City', fuelTypes: ['petrol', 'hybrid'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1520000 },
      { value: 'amaze', label: 'Amaze', fuelTypes: ['petrol'], cubicCapacity: 1199, seatingCapacity: 5, exShowroomPrice: 850000 },
      { value: 'elevate', label: 'Elevate', fuelTypes: ['petrol'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1300000 },
    ],
  },
  {
    value: 'mahindra_cars',
    label: 'Mahindra',
    vehicleClass: 'private_car',
    models: [
      { value: 'xuv700', label: 'XUV700', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 2198, seatingCapacity: 7, exShowroomPrice: 2350000 },
      { value: 'scorpio_n', label: 'Scorpio-N', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 2198, seatingCapacity: 7, exShowroomPrice: 1650000 },
      { value: 'thar', label: 'Thar', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1997, seatingCapacity: 4, exShowroomPrice: 1550000 },
      { value: 'xuv300', label: 'XUV300', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 950000 },
    ],
  },
  {
    value: 'toyota',
    label: 'Toyota',
    vehicleClass: 'private_car',
    models: [
      { value: 'innova_crysta', label: 'Innova Crysta', fuelTypes: ['diesel', 'petrol'], cubicCapacity: 2393, seatingCapacity: 7, exShowroomPrice: 2100000 },
      { value: 'fortuner', label: 'Fortuner', fuelTypes: ['diesel', 'petrol'], cubicCapacity: 2755, seatingCapacity: 7, exShowroomPrice: 4200000 },
      { value: 'glanza', label: 'Glanza', fuelTypes: ['petrol', 'hybrid'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 800000 },
      { value: 'urban_cruiser_hyryder', label: 'Urban Cruiser Hyryder', fuelTypes: ['petrol', 'hybrid'], cubicCapacity: 1462, seatingCapacity: 5, exShowroomPrice: 1550000 },
    ],
  },
  {
    value: 'kia',
    label: 'Kia',
    vehicleClass: 'private_car',
    models: [
      { value: 'seltos', label: 'Seltos', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1497, seatingCapacity: 5, exShowroomPrice: 1650000 },
      { value: 'sonet', label: 'Sonet', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 950000 },
      { value: 'carens', label: 'Carens', fuelTypes: ['petrol', 'diesel'], cubicCapacity: 1497, seatingCapacity: 6, exShowroomPrice: 1450000 },
    ],
  },
  {
    value: 'skoda',
    label: 'Skoda',
    vehicleClass: 'private_car',
    models: [
      { value: 'kushaq', label: 'Kushaq', fuelTypes: ['petrol'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1250000 },
      { value: 'slavia', label: 'Slavia', fuelTypes: ['petrol'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1200000 },
    ],
  },
  {
    value: 'volkswagen',
    label: 'Volkswagen',
    vehicleClass: 'private_car',
    models: [
      { value: 'taigun', label: 'Taigun', fuelTypes: ['petrol'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1280000 },
      { value: 'virtus', label: 'Virtus', fuelTypes: ['petrol'], cubicCapacity: 1498, seatingCapacity: 5, exShowroomPrice: 1230000 },
    ],
  },
  {
    value: 'renault',
    label: 'Renault',
    vehicleClass: 'private_car',
    models: [
      { value: 'kwid', label: 'Kwid', fuelTypes: ['petrol'], cubicCapacity: 999, seatingCapacity: 5, exShowroomPrice: 480000 },
      { value: 'triber', label: 'Triber', fuelTypes: ['petrol', 'cng'], cubicCapacity: 999, seatingCapacity: 7, exShowroomPrice: 640000 },
    ],
  },
  {
    value: 'mg_motor',
    label: 'MG Motor',
    vehicleClass: 'private_car',
    models: [
      { value: 'hector', label: 'Hector', fuelTypes: ['petrol', 'diesel', 'hybrid'], cubicCapacity: 1497, seatingCapacity: 5, exShowroomPrice: 1650000 },
      { value: 'astor', label: 'Astor', fuelTypes: ['petrol'], cubicCapacity: 1349, seatingCapacity: 5, exShowroomPrice: 1150000 },
      { value: 'comet_ev', label: 'Comet EV', fuelTypes: ['electric'], cubicCapacity: 0, seatingCapacity: 4, exShowroomPrice: 850000 },
    ],
  },
  {
    value: 'royal_enfield',
    label: 'Royal Enfield',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'classic_350', label: 'Classic 350', fuelTypes: ['petrol'], cubicCapacity: 349, seatingCapacity: 2, exShowroomPrice: 195000 },
      { value: 'hunter_350', label: 'Hunter 350', fuelTypes: ['petrol'], cubicCapacity: 349, seatingCapacity: 2, exShowroomPrice: 170000 },
      { value: 'meteor_350', label: 'Meteor 350', fuelTypes: ['petrol'], cubicCapacity: 349, seatingCapacity: 2, exShowroomPrice: 205000 },
    ],
  },
  {
    value: 'hero_motocorp',
    label: 'Hero MotoCorp',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'splendor', label: 'Splendor', fuelTypes: ['petrol'], cubicCapacity: 97, seatingCapacity: 2, exShowroomPrice: 85000 },
      { value: 'hf_deluxe', label: 'HF Deluxe', fuelTypes: ['petrol'], cubicCapacity: 97, seatingCapacity: 2, exShowroomPrice: 68000 },
      { value: 'passion', label: 'Passion', fuelTypes: ['petrol'], cubicCapacity: 113, seatingCapacity: 2, exShowroomPrice: 92000 },
      { value: 'xtreme', label: 'Xtreme', fuelTypes: ['petrol'], cubicCapacity: 160, seatingCapacity: 2, exShowroomPrice: 135000 },
    ],
  },
  {
    value: 'honda_motorcycle',
    label: 'Honda Motorcycle & Scooter',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'activa', label: 'Activa', fuelTypes: ['petrol', 'electric'], cubicCapacity: 110, seatingCapacity: 2, exShowroomPrice: 82000 },
      { value: 'shine', label: 'Shine', fuelTypes: ['petrol'], cubicCapacity: 124, seatingCapacity: 2, exShowroomPrice: 88000 },
      { value: 'unicorn', label: 'Unicorn', fuelTypes: ['petrol'], cubicCapacity: 162, seatingCapacity: 2, exShowroomPrice: 118000 },
    ],
  },
  {
    value: 'bajaj_auto',
    label: 'Bajaj Auto',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'pulsar', label: 'Pulsar', fuelTypes: ['petrol'], cubicCapacity: 199, seatingCapacity: 2, exShowroomPrice: 155000 },
      { value: 'platina', label: 'Platina', fuelTypes: ['petrol'], cubicCapacity: 100, seatingCapacity: 2, exShowroomPrice: 72000 },
      { value: 'avenger', label: 'Avenger', fuelTypes: ['petrol'], cubicCapacity: 220, seatingCapacity: 2, exShowroomPrice: 175000 },
    ],
  },
  {
    value: 'tvs_motor',
    label: 'TVS Motor',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'jupiter', label: 'Jupiter', fuelTypes: ['petrol', 'electric'], cubicCapacity: 110, seatingCapacity: 2, exShowroomPrice: 85000 },
      { value: 'apache', label: 'Apache', fuelTypes: ['petrol'], cubicCapacity: 160, seatingCapacity: 2, exShowroomPrice: 128000 },
      { value: 'ntorq', label: 'NTORQ', fuelTypes: ['petrol'], cubicCapacity: 125, seatingCapacity: 2, exShowroomPrice: 95000 },
    ],
  },
  {
    value: 'yamaha',
    label: 'Yamaha',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'fascino', label: 'Fascino 125', fuelTypes: ['petrol'], cubicCapacity: 125, seatingCapacity: 2, exShowroomPrice: 90000 },
      { value: 'ray_zr', label: 'RayZR 125', fuelTypes: ['petrol'], cubicCapacity: 125, seatingCapacity: 2, exShowroomPrice: 92000 },
      { value: 'mt15', label: 'MT-15', fuelTypes: ['petrol'], cubicCapacity: 155, seatingCapacity: 2, exShowroomPrice: 175000 },
      { value: 'r15', label: 'R15 V4', fuelTypes: ['petrol'], cubicCapacity: 155, seatingCapacity: 2, exShowroomPrice: 195000 },
    ],
  },
  {
    value: 'suzuki_motorcycle',
    label: 'Suzuki Motorcycle',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 'access', label: 'Access 125', fuelTypes: ['petrol'], cubicCapacity: 125, seatingCapacity: 2, exShowroomPrice: 88000 },
      { value: 'gixxer', label: 'Gixxer', fuelTypes: ['petrol'], cubicCapacity: 155, seatingCapacity: 2, exShowroomPrice: 145000 },
    ],
  },
  {
    value: 'ola_electric',
    label: 'Ola Electric',
    vehicleClass: 'two_wheeler',
    models: [
      { value: 's1_pro', label: 'S1 Pro', fuelTypes: ['electric'], cubicCapacity: 0, seatingCapacity: 2, exShowroomPrice: 145000 },
      { value: 's1_air', label: 'S1 Air', fuelTypes: ['electric'], cubicCapacity: 0, seatingCapacity: 2, exShowroomPrice: 110000 },
    ],
  },
  {
    value: 'ashok_leyland',
    label: 'Ashok Leyland',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'dost', label: 'Dost', fuelTypes: ['diesel', 'cng'], cubicCapacity: 1478, seatingCapacity: 2, exShowroomPrice: 750000, weightBand: 'le_2_5t' },
      { value: 'bada_dost', label: 'Bada Dost', fuelTypes: ['diesel', 'cng'], cubicCapacity: 2500, seatingCapacity: 2, exShowroomPrice: 950000, weightBand: '2_5_3_5t' },
      { value: 'partner', label: 'Partner', fuelTypes: ['diesel'], cubicCapacity: 2500, seatingCapacity: 2, exShowroomPrice: 1050000, weightBand: '3_5_7_5t' },
      { value: 'ecomet_1215', label: 'Ecomet 1215', fuelTypes: ['diesel'], cubicCapacity: 3300, seatingCapacity: 2, exShowroomPrice: 1850000, weightBand: '7_5_12t' },
      { value: 'boss_1618', label: 'Boss 1618', fuelTypes: ['diesel'], cubicCapacity: 5660, seatingCapacity: 2, exShowroomPrice: 2650000, weightBand: '12_20t' },
      { value: 'captain_3123', label: 'Captain 3123', fuelTypes: ['diesel'], cubicCapacity: 7200, seatingCapacity: 3, exShowroomPrice: 3900000, weightBand: '20_40t' },
    ],
  },
  {
    value: 'tata_commercial',
    label: 'Tata Motors Commercial',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'ace', label: 'Ace', fuelTypes: ['diesel', 'cng', 'electric'], cubicCapacity: 700, seatingCapacity: 2, exShowroomPrice: 550000, weightBand: 'le_2_5t' },
      { value: 'intra_v30', label: 'Intra V30', fuelTypes: ['diesel', 'cng'], cubicCapacity: 1478, seatingCapacity: 2, exShowroomPrice: 780000, weightBand: '2_5_3_5t' },
      { value: '407', label: '407 Gold', fuelTypes: ['diesel'], cubicCapacity: 2956, seatingCapacity: 3, exShowroomPrice: 1450000, weightBand: '3_5_7_5t' },
      { value: '709g', label: '709 G', fuelTypes: ['diesel'], cubicCapacity: 3785, seatingCapacity: 2, exShowroomPrice: 1950000, weightBand: '7_5_12t' },
      { value: 'lpt_1618', label: 'LPT 1618', fuelTypes: ['diesel'], cubicCapacity: 5675, seatingCapacity: 2, exShowroomPrice: 2750000, weightBand: '12_20t' },
      { value: 'signa', label: 'Signa 4223', fuelTypes: ['diesel'], cubicCapacity: 5883, seatingCapacity: 3, exShowroomPrice: 2800000, weightBand: '20_40t' },
      { value: 'signa_4830', label: 'Signa 4830 (Multi-Axle)', fuelTypes: ['diesel'], cubicCapacity: 6702, seatingCapacity: 3, exShowroomPrice: 4200000, weightBand: 'gt_40t' },
    ],
  },
  {
    value: 'eicher',
    label: 'Eicher',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'pro_2049', label: 'Pro 2049', fuelTypes: ['diesel'], cubicCapacity: 2596, seatingCapacity: 2, exShowroomPrice: 1350000, weightBand: '3_5_7_5t' },
      { value: 'pro_2110', label: 'Pro 2110', fuelTypes: ['diesel'], cubicCapacity: 3298, seatingCapacity: 2, exShowroomPrice: 1750000, weightBand: '7_5_12t' },
      { value: 'pro_3015', label: 'Pro 3015', fuelTypes: ['diesel'], cubicCapacity: 5883, seatingCapacity: 2, exShowroomPrice: 2600000, weightBand: '12_20t' },
      { value: 'pro_6037', label: 'Pro 6037 (Multi-Axle)', fuelTypes: ['diesel'], cubicCapacity: 8224, seatingCapacity: 3, exShowroomPrice: 4500000, weightBand: 'gt_40t' },
    ],
  },
  {
    value: 'bharatbenz',
    label: 'BharatBenz',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: '911r', label: '911R', fuelTypes: ['diesel'], cubicCapacity: 2998, seatingCapacity: 2, exShowroomPrice: 1600000, weightBand: '7_5_12t' },
      { value: '1217c', label: '1217C', fuelTypes: ['diesel'], cubicCapacity: 4570, seatingCapacity: 2, exShowroomPrice: 2450000, weightBand: '12_20t' },
      { value: '2823c', label: '2823C', fuelTypes: ['diesel'], cubicCapacity: 6871, seatingCapacity: 2, exShowroomPrice: 3600000, weightBand: '20_40t' },
      { value: '3123c', label: '3123C (Multi-Axle)', fuelTypes: ['diesel'], cubicCapacity: 7201, seatingCapacity: 3, exShowroomPrice: 4400000, weightBand: 'gt_40t' },
    ],
  },
  {
    value: 'piaggio',
    label: 'Piaggio',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'ape_xtra_ldx', label: 'Ape Xtra LDX (3W Goods)', fuelTypes: ['diesel', 'cng'], cubicCapacity: 499, seatingCapacity: 1, exShowroomPrice: 320000, weightBand: 'gcv_3w' },
    ],
  },
  {
    value: 'mahindra_gcv',
    label: 'Mahindra',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'jeeto', label: 'Jeeto', fuelTypes: ['diesel', 'cng'], cubicCapacity: 800, seatingCapacity: 2, exShowroomPrice: 500000, weightBand: 'le_2_5t' },
      { value: 'bolero_pikup_gcv', label: 'Bolero Pik-Up', fuelTypes: ['diesel'], cubicCapacity: 1493, seatingCapacity: 2, exShowroomPrice: 900000, weightBand: '2_5_3_5t' },
      { value: 'furio_7', label: 'Furio 7', fuelTypes: ['diesel'], cubicCapacity: 2956, seatingCapacity: 2, exShowroomPrice: 1550000, weightBand: '3_5_7_5t' },
      { value: 'blazo_x_28', label: 'Blazo X 28', fuelTypes: ['diesel'], cubicCapacity: 6690, seatingCapacity: 2, exShowroomPrice: 3200000, weightBand: '20_40t' },
    ],
  },
  {
    value: 'force_motors_gcv',
    label: 'Force Motors',
    vehicleClass: 'commercial_gcv',
    models: [
      { value: 'trump_40', label: 'Trump 40', fuelTypes: ['diesel'], cubicCapacity: 2596, seatingCapacity: 2, exShowroomPrice: 1350000, weightBand: '3_5_7_5t' },
    ],
  },

  {
    value: 'mahindra_commercial',
    label: 'Mahindra',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 'bolero_pickup', label: 'Bolero Pickup', fuelTypes: ['diesel'], cubicCapacity: 1493, seatingCapacity: 3, exShowroomPrice: 900000, pcvType: 'pcv_taxi' },
      { value: 'supro', label: 'Supro', fuelTypes: ['diesel', 'cng'], cubicCapacity: 1493, seatingCapacity: 3, exShowroomPrice: 700000, pcvType: 'pcv_taxi' },
    ],
  },
  {
    value: 'force_motors',
    label: 'Force Motors',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 'traveller_school', label: 'Traveller (School Bus)', fuelTypes: ['diesel'], cubicCapacity: 2596, seatingCapacity: 26, exShowroomPrice: 2100000, pcvType: 'pcv_bus_school' },
      { value: 'traveller_staff', label: 'Traveller (Staff/Other Bus)', fuelTypes: ['diesel'], cubicCapacity: 2596, seatingCapacity: 26, exShowroomPrice: 2050000, pcvType: 'pcv_bus_other' },
    ],
  },
  {
    value: 'ashok_leyland_bus',
    label: 'Ashok Leyland (Bus)',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 'lynx_school', label: 'Lynx (School Bus)', fuelTypes: ['diesel'], cubicCapacity: 3300, seatingCapacity: 40, exShowroomPrice: 3200000, pcvType: 'pcv_bus_school' },
      { value: 'viking_staff', label: 'Viking (Staff/Other Bus)', fuelTypes: ['diesel'], cubicCapacity: 3300, seatingCapacity: 40, exShowroomPrice: 3350000, pcvType: 'pcv_bus_other' },
    ],
  },
  {
    value: 'bajaj_auto_3w',
    label: 'Bajaj Auto (3W)',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 're_compact', label: 'RE Compact (Auto-Rickshaw)', fuelTypes: ['cng', 'petrol'], cubicCapacity: 236, seatingCapacity: 4, exShowroomPrice: 250000, pcvType: 'pcv_3w' },
      { value: 'maxima_cargo', label: 'Maxima Z (Taxi)', fuelTypes: ['cng', 'petrol'], cubicCapacity: 236, seatingCapacity: 4, exShowroomPrice: 280000, pcvType: 'pcv_taxi' },
    ],
  },
  {
    value: 'maruti_taxi',
    label: 'Maruti Suzuki',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 'dzire_taxi', label: 'Dzire Tour', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1197, seatingCapacity: 5, exShowroomPrice: 720000, pcvType: 'pcv_taxi' },
      { value: 'ertiga_taxi', label: 'Ertiga Tour', fuelTypes: ['petrol', 'cng'], cubicCapacity: 1462, seatingCapacity: 7, exShowroomPrice: 950000, pcvType: 'pcv_taxi' },
    ],
  },
  {
    value: 'tata_winger',
    label: 'Tata Motors',
    vehicleClass: 'commercial_pcv',
    models: [
      { value: 'winger_school', label: 'Winger (School Bus)', fuelTypes: ['diesel'], cubicCapacity: 2179, seatingCapacity: 26, exShowroomPrice: 1900000, pcvType: 'pcv_bus_school' },
      { value: 'starbus_staff', label: 'Starbus (Staff/Other Bus)', fuelTypes: ['diesel'], cubicCapacity: 3300, seatingCapacity: 40, exShowroomPrice: 3050000, pcvType: 'pcv_bus_other' },
    ],
  },

  {
    value: 'mahindra_tractors',
    label: 'Mahindra Tractors',
    vehicleClass: 'misc_d',
    models: [
      { value: 'jivo_245', label: 'Jivo 245 DI', fuelTypes: ['diesel'], cubicCapacity: 1200, seatingCapacity: 1, exShowroomPrice: 550000, miscType: 'tractor_new' },
      { value: 'yuvo_575', label: 'Yuvo Tech+ 575', fuelTypes: ['diesel'], cubicCapacity: 2500, seatingCapacity: 1, exShowroomPrice: 850000, miscType: 'tractor_new' },
    ],
  },
  {
    value: 'swaraj_tractors',
    label: 'Swaraj Tractors',
    vehicleClass: 'misc_d',
    models: [
      { value: 'swaraj_735', label: 'Swaraj 735 FE', fuelTypes: ['diesel'], cubicCapacity: 2000, seatingCapacity: 1, exShowroomPrice: 700000, miscType: 'tractor_new' },
      { value: 'swaraj_855', label: 'Swaraj 855 FE', fuelTypes: ['diesel'], cubicCapacity: 3000, seatingCapacity: 1, exShowroomPrice: 950000, miscType: 'tractor_new' },
    ],
  },
  {
    value: 'john_deere',
    label: 'John Deere',
    vehicleClass: 'misc_d',
    models: [
      { value: 'jd_5050d', label: '5050 D', fuelTypes: ['diesel'], cubicCapacity: 2900, seatingCapacity: 1, exShowroomPrice: 900000, miscType: 'tractor_new' },
      { value: 'jd_s670', label: 'S670 Combine Harvester', fuelTypes: ['diesel'], cubicCapacity: 9000, seatingCapacity: 1, exShowroomPrice: 4500000, miscType: 'harvester_new' },
    ],
  },
  {
    value: 'jcb',
    label: 'JCB',
    vehicleClass: 'misc_d',
    models: [
      { value: 'jcb_3dx', label: '3DX Backhoe Loader', fuelTypes: ['diesel'], cubicCapacity: 4400, seatingCapacity: 1, exShowroomPrice: 2650000, miscType: 'construction_equipment' },
      { value: 'jcb_js205', label: 'JS205 Excavator', fuelTypes: ['diesel'], cubicCapacity: 4800, seatingCapacity: 1, exShowroomPrice: 3800000, miscType: 'construction_equipment' },
    ],
  },
  {
    value: 'caterpillar',
    label: 'Caterpillar',
    vehicleClass: 'misc_d',
    models: [
      { value: 'cat_424', label: '424 Backhoe Loader', fuelTypes: ['diesel'], cubicCapacity: 4400, seatingCapacity: 1, exShowroomPrice: 2900000, miscType: 'construction_equipment' },
    ],
  },
  {
    value: 'escorts_kubota',
    label: 'Escorts Kubota',
    vehicleClass: 'misc_d',
    models: [
      { value: 'harvmaster_h4400', label: 'HarvMaster H-4400', fuelTypes: ['diesel'], cubicCapacity: 4400, seatingCapacity: 1, exShowroomPrice: 2200000, miscType: 'harvester_new' },
    ],
  },
  {
    value: 'mini_metro_erickshaw',
    label: 'Mini Metro (E-Rickshaw)',
    vehicleClass: 'misc_d',
    models: [
      { value: 'e_rickshaw_std', label: 'E-Rickshaw Standard', fuelTypes: ['electric'], cubicCapacity: 0, seatingCapacity: 4, exShowroomPrice: 180000, miscType: 'e_rickshaw_loader' },
      { value: 'e_loader_std', label: 'E-Loader Standard', fuelTypes: ['electric'], cubicCapacity: 0, seatingCapacity: 1, exShowroomPrice: 220000, miscType: 'e_rickshaw_loader' },
    ],
  },
  {
    value: 'new_holland',
    label: 'New Holland',
    vehicleClass: 'misc_d',
    models: [
      { value: 'nh_3630', label: '3630 TX Super', fuelTypes: ['diesel'], cubicCapacity: 2900, seatingCapacity: 1, exShowroomPrice: 780000, miscType: 'tractor_new' },
    ],
  },
  {
    value: 'sonalika',
    label: 'Sonalika Tractors',
    vehicleClass: 'misc_d',
    models: [
      { value: 'di_745_iii', label: 'DI 745 III', fuelTypes: ['diesel'], cubicCapacity: 2700, seatingCapacity: 1, exShowroomPrice: 620000, miscType: 'tractor_new' },
      { value: 'di_35_rx', label: 'DI 35 RX (Old Series)', fuelTypes: ['diesel'], cubicCapacity: 2500, seatingCapacity: 1, exShowroomPrice: 480000, miscType: 'tractor_old' },
    ],
  },
  {
    value: 'kubota_construction',
    label: 'Kubota',
    vehicleClass: 'misc_d',
    models: [
      { value: 'kx_080', label: 'KX080-4 Excavator', fuelTypes: ['diesel'], cubicCapacity: 4400, seatingCapacity: 1, exShowroomPrice: 3300000, miscType: 'construction_equipment' },
    ],
  },
];

export function getMakesForClass(vehicleClass) {
  if (!vehicleClass) return VEHICLE_MAKES;
  return VEHICLE_MAKES.filter((m) => m.vehicleClass === vehicleClass);
}

export function getModelsForMake(makeValue) {
  const make = VEHICLE_MAKES.find((m) => m.value === makeValue);
  return make ? make.models : [];
}

// Returns the fuel type values a specific model is actually sold with. Falls
// back to all fuel types if the model isn't found or has no list defined,
// so the form never ends up with an empty dropdown.
export function getFuelTypesForModel(makeValue, modelValue) {
  const models = getModelsForMake(makeValue);
  const model = models.find((m) => m.value === modelValue);
  if (model?.fuelTypes?.length) return model.fuelTypes;
  return FUEL_TYPES.map((f) => f.value);
}

// Returns the full model record (cc, seating capacity, ex-showroom price)
// used to auto-fill specs and calculate IDV once a model is selected.
export function getModelSpec(makeValue, modelValue) {
  const models = getModelsForMake(makeValue);
  return models.find((m) => m.value === modelValue) ?? null;
}

// GCV models carry their real GVW band (see GCV_WEIGHT_BANDS above) so the
// entry form and rule engine can key commission off weight, the way real
// broker payout grids do.
export function getWeightBandForModel(makeValue, modelValue) {
  const spec = getModelSpec(makeValue, modelValue);
  return spec?.weightBand ?? null;
}

// "Case Type" — the business/underwriting case for the policy being quoted.
export const CASE_TYPES = [
  { value: 'new', label: 'New' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'break_in', label: 'Break-In' },
  { value: 'rollover', label: 'Rollover' },
];

export const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'cng', label: 'CNG' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
];

// "Policy Type" — the cover structure being sold (comprehensive package vs
// own-damage-only vs liability-only), matching real motor insurance products.
export const POLICY_TYPES = [
  { value: 'package', label: 'Package' },
  { value: 'bundle', label: 'Bundle' },
  { value: 'saod', label: 'SAOD (Standalone Own Damage)' },
  { value: 'liability', label: 'Liability Only' },
];

// Two-wheelers are overwhelmingly petrol in the Indian market — used to
// auto-default the Fuel Type field when Vehicle Class = Two-Wheeler, before
// a specific make/model narrows it further.
export const DEFAULT_FUEL_BY_CLASS = {
  two_wheeler: 'petrol',
};

export const BOOLEAN_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

// The master field registry used by the condition builder + agent form.
// `core: true` fields render as dedicated inputs on the agent form; anything
// else falls under the extensible "additional parameters" section.
export const PARAMETERS = [
  {
    key: 'rto',
    label: 'RTO',
    type: FIELD_TYPES.MULTI_SELECT,
    options: RTO_OPTIONS,
    core: true,
  },
  {
    key: 'vehicleClass',
    label: 'Vehicle Class',
    type: FIELD_TYPES.SELECT,
    options: VEHICLE_CLASSES.map(({ value, label }) => ({ value, label })),
    core: true,
  },
  {
    key: 'vehicleSubclass',
    label: 'Vehicle Subclass',
    type: FIELD_TYPES.SELECT,
    options: VEHICLE_CLASSES.flatMap((c) => c.subclasses),
    core: true,
  },
  {
    key: 'vehicleMake',
    label: 'Motor Company (Make)',
    type: FIELD_TYPES.SELECT,
    options: VEHICLE_MAKES.map(({ value, label }) => ({ value, label })),
    core: true,
  },
  {
    key: 'vehicleModel',
    label: 'Vehicle Model',
    type: FIELD_TYPES.SELECT,
    options: VEHICLE_MAKES.flatMap((m) => m.models),
    core: true,
  },
  {
    key: 'fuelType',
    label: 'Fuel Type',
    type: FIELD_TYPES.SELECT,
    options: FUEL_TYPES,
    core: true,
  },
  {
    key: 'cubicCapacity',
    label: 'Cubic Capacity (cc)',
    type: FIELD_TYPES.NUMBER,
    core: true,
  },
  {
    key: 'seatingCapacity',
    label: 'Seating Capacity',
    type: FIELD_TYPES.NUMBER,
    core: true,
  },
  {
    key: 'weightBand',
    label: 'GCV Weight Band (GVW)',
    type: FIELD_TYPES.SELECT,
    options: GCV_WEIGHT_BANDS,
    core: true,
  },
  {
    key: 'vehicleAge',
    label: 'Vehicle Age (years)',
    type: FIELD_TYPES.NUMBER,
    core: true,
  },
  {
    key: 'policyType',
    label: 'Policy Type',
    type: FIELD_TYPES.SELECT,
    options: POLICY_TYPES,
    core: true,
  },
  {
    key: 'caseType',
    label: 'Case Type',
    type: FIELD_TYPES.SELECT,
    options: CASE_TYPES,
    core: true,
  },
  {
    key: 'agentId',
    label: 'Agent ID',
    type: FIELD_TYPES.MULTI_SELECT,
    options: [], // populated dynamically from the agent store where used
    core: false,
  },
  // Extensible "other parameter" example — new fields can be appended here
  // (or added by an admin at runtime) without touching the engine or UI.
  {
    key: 'idv',
    label: 'IDV (₹, Insured Declared Value)',
    type: FIELD_TYPES.NUMBER,
    core: false,
  },
  {
    key: 'premiumAmount',
    label: 'Premium Amount (₹)',
    type: FIELD_TYPES.NUMBER,
    core: false,
  },
  {
    key: 'ncb',
    label: 'NCB Slab (%)',
    type: FIELD_TYPES.SELECT,
    options: [
      { value: '0', label: '0%' },
      { value: '20', label: '20%' },
      { value: '25', label: '25%' },
      { value: '35', label: '35%' },
      { value: '45', label: '45%' },
      { value: '50', label: '50%' },
    ],
    core: false,
  },
  // Addon toggles — collected on the entry form and evaluable by the rules
  // engine like any other field (e.g. a rule could give higher commission
  // when Zero Dep Cover is selected).
  {
    key: 'zeroDepCover',
    label: 'Zero Dep Cover',
    type: FIELD_TYPES.SELECT,
    options: BOOLEAN_OPTIONS,
    core: false,
  },
  {
    key: 'paOwnerCover',
    label: 'PA Owner Cover',
    type: FIELD_TYPES.SELECT,
    options: BOOLEAN_OPTIONS,
    core: false,
  },
  {
    key: 'isCngLpg',
    label: 'Is CNG/LPG Fitted',
    type: FIELD_TYPES.SELECT,
    options: BOOLEAN_OPTIONS,
    core: false,
  },
];

export function getParameter(key) {
  return PARAMETERS.find((p) => p.key === key);
}

export function getOptionLabel(paramKey, value) {
  const param = getParameter(paramKey);
  if (!param || !param.options) return value;
  const opt = param.options.find((o) => String(o.value) === String(value));
  return opt ? opt.label : value;
}

export function getSubclassesForClass(classValue) {
  const cls = VEHICLE_CLASSES.find((c) => c.value === classValue);
  return cls ? cls.subclasses : [];
}
