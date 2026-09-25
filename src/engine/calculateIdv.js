// Insured Declared Value (IDV) calculator — pure function, no React.
//
// IDV is not stored anywhere in vehicle registration data (Vahan/Parivahan
// included); insurers compute it per policy as:
//   IDV = manufacturer's listed ex-showroom price × (1 − age-based depreciation)
// using a depreciation schedule. Real aggregators (Acko, Digit, PolicyBazaar)
// apply this per vehicle category, since the fixed IRDAI motor-tariff slab
// below is specifically defined for Private Cars & Two-Wheelers — Commercial
// (GCV/PCV) and special types (MISC-D: tractors/CE/harvesters) don't follow
// that same curve in practice; their depreciation is negotiated and
// generally flatter since these assets are valued for working life rather
// than resale/market comparables.
//
// Private Car / Two-Wheeler schedule (age since manufacture -> depreciation %):
//   <= 6 months   : 5%
//   6mo - 1 year  : 15%
//   1 - 2 years   : 20%
//   2 - 3 years   : 30%
//   3 - 4 years   : 40%
//   4 - 5 years   : 50%
//   > 5 years     : negotiated (no fixed IRDAI slab); we extend the 50% band
//                   as a reasonable POC estimate.
const PC_TW_DEPRECIATION_SLABS = [
  { maxYears: 0.5, rate: 0.05 },
  { maxYears: 1, rate: 0.15 },
  { maxYears: 2, rate: 0.2 },
  { maxYears: 3, rate: 0.3 },
  { maxYears: 4, rate: 0.4 },
  { maxYears: 5, rate: 0.5 },
];

// Commercial (GCV/PCV) & MISC-D schedule — flatter, since goods carriers,
// passenger vehicles, tractors and construction equipment are valued for
// working life rather than a private resale market. Loosely reflects how
// brokers actually negotiate commercial IDV in practice.
const COMMERCIAL_DEPRECIATION_SLABS = [
  { maxYears: 1, rate: 0.1 },
  { maxYears: 2, rate: 0.15 },
  { maxYears: 3, rate: 0.2 },
  { maxYears: 4, rate: 0.28 },
  { maxYears: 5, rate: 0.35 },
  { maxYears: 7, rate: 0.42 },
];

const BEYOND_SCHEDULE_RATE = {
  pc_tw: 0.5,
  commercial: 0.45,
};

const COMMERCIAL_VEHICLE_CLASSES = ['commercial_gcv', 'commercial_pcv', 'misc_d'];

function getDepreciationSchedule(vehicleClass) {
  // Defaults to the PC/TW schedule (the IRDAI-defined curve) unless the
  // vehicle is explicitly a commercial/MISC-D class.
  return COMMERCIAL_VEHICLE_CLASSES.includes(vehicleClass)
    ? { slabs: COMMERCIAL_DEPRECIATION_SLABS, beyondRate: BEYOND_SCHEDULE_RATE.commercial }
    : { slabs: PC_TW_DEPRECIATION_SLABS, beyondRate: BEYOND_SCHEDULE_RATE.pc_tw };
}

/**
 * @param {number} vehicleAgeYears
 * @param {string} [vehicleClass] - 'private_car' | 'two_wheeler' | 'commercial_gcv' | 'commercial_pcv' | 'misc_d'
 * @returns {number|null} depreciation rate (0-1), or null if age is invalid
 */
export function getDepreciationRate(vehicleAgeYears, vehicleClass) {
  if (vehicleAgeYears === '' || vehicleAgeYears === null || vehicleAgeYears === undefined) return null;
  const age = Number(vehicleAgeYears);
  if (!Number.isFinite(age) || age < 0) return null;
  const { slabs, beyondRate } = getDepreciationSchedule(vehicleClass);
  const slab = slabs.find((s) => age <= s.maxYears);
  return slab ? slab.rate : beyondRate;
}

/**
 * @param {number} exShowroomPrice
 * @param {number} vehicleAgeYears
 * @param {object} [options]
 * @param {string} [options.vehicleClass] - selects the depreciation curve; defaults to the PC/TW schedule
 * @returns {number|null} IDV rounded to the nearest rupee, or null if inputs are invalid
 */
export function calculateIdv(exShowroomPrice, vehicleAgeYears, options = {}) {
  const { vehicleClass } = options;
  const price = Number(exShowroomPrice);
  const rate = getDepreciationRate(vehicleAgeYears, vehicleClass);
  if (!Number.isFinite(price) || price <= 0 || rate === null) return null;

  return Math.round(price * (1 - rate));
}
