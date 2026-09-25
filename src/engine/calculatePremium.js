// Premium calculator — pure function, no React.
//
// Real motor insurance premium = Own Damage (OD) Premium + Liability (Third
// Party / TP) Premium + Add-on Premiums, then 18% GST on top. This mirrors
// the structure on an actual policy schedule (see e.g. an IFFCO Tokio Pvt
// Car bundled policy: Net OD Premium + Net Liability Premium -> Total -> GST
// -> Gross Premium Paid).
//
//   OD Premium  = IDV × OD Rate% × (1 − NCB Discount%)
//     OD Rate is insurer-discretionary in reality (not IRDAI-tariff-fixed);
//     ~3.5% of IDV is a commonly-cited industry rule-of-thumb default for
//     private cars, used here as a reasonable POC baseline. NCB (No Claim
//     Bonus) applies to OD premium only — never to TP.
//
//   TP Premium  = a fixed slab by vehicle class + cc/GVW band. Real Third
//     Party premiums are set by IRDAI tariff, not negotiated by insurers —
//     these are the actual (recent) IRDAI-tariff-structured slabs.
//
//   Add-on Premiums = flat amounts for Zero Dep Cover / PA Owner Cover, if
//     selected — approximate typical market pricing for these add-ons.
//
//   GST = 18% on (OD + TP + Add-ons).

// IRDAI TP tariff, Private Car — by engine cc.
const PRIVATE_CAR_TP_SLABS = [
  { maxCc: 1000, premium: 2094 },
  { maxCc: 1500, premium: 3416 },
  { maxCc: Infinity, premium: 7897 },
];

// IRDAI TP tariff, Two-Wheeler — by engine cc.
const TWO_WHEELER_TP_SLABS = [
  { maxCc: 75, premium: 538 },
  { maxCc: 150, premium: 714 },
  { maxCc: 350, premium: 1366 },
  { maxCc: Infinity, premium: 2804 },
];

// Commercial GCV TP — directional only (real GCV tariff has more sub-slabs
// by public/private carrier & tonnage than are practical for a POC); banded
// by GVW to match the app's existing weight-band field.
const GCV_TP_BY_WEIGHT_BAND = {
  gcv_3w: 4500,
  le_2_5t: 7938,
  '2_5_3_5t': 9500,
  '3_5_7_5t': 11500,
  '7_5_12t': 14330,
  '12_20t': 18000,
  '20_40t': 24000,
  gt_40t: 32000,
};

// PCV and MISC-D TP — flat representative defaults by subclass, since these
// don't carry a cc/GVW dimension the same way PC/TW/GCV do.
const PCV_TP_DEFAULT = 9000;
const MISC_D_TP_DEFAULT = 6000;

const OD_RATE_DEFAULT = 0.035; // ~3.5% of IDV — industry rule-of-thumb default

const NCB_DISCOUNT_BY_SLAB = {
  0: 0,
  20: 0.2,
  25: 0.25,
  35: 0.35,
  45: 0.45,
  50: 0.5,
};

const ADDON_PREMIUM = {
  zeroDepCover: 3500,
  paOwnerCover: 500,
};

const GST_RATE = 0.18;

function findSlab(slabs, value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const slab = slabs.find((s) => v <= s.maxCc);
  return slab ? slab.premium : slabs[slabs.length - 1].premium;
}

/**
 * Third Party (Liability) premium — fixed by vehicle class + cc/GVW band,
 * matching real IRDAI tariff structure (not insurer-negotiable).
 * @param {object} input - { vehicleClass, cubicCapacity, weightBand }
 * @returns {number|null}
 */
export function calculateTpPremium({ vehicleClass, cubicCapacity, weightBand }) {
  if (vehicleClass === 'private_car') return findSlab(PRIVATE_CAR_TP_SLABS, cubicCapacity);
  if (vehicleClass === 'two_wheeler') return findSlab(TWO_WHEELER_TP_SLABS, cubicCapacity);
  if (vehicleClass === 'commercial_gcv') return GCV_TP_BY_WEIGHT_BAND[weightBand] ?? GCV_TP_BY_WEIGHT_BAND.le_2_5t;
  if (vehicleClass === 'commercial_pcv') return PCV_TP_DEFAULT;
  if (vehicleClass === 'misc_d') return MISC_D_TP_DEFAULT;
  return null;
}

/**
 * Own Damage premium — IDV × OD rate, reduced by the NCB discount slab.
 * @param {number} idv
 * @param {object} [options]
 * @param {number} [options.odRate] - defaults to OD_RATE_DEFAULT
 * @param {string|number} [options.ncb] - NCB slab (0/20/25/35/45/50)
 * @returns {number|null}
 */
export function calculateOdPremium(idv, options = {}) {
  const price = Number(idv);
  if (!Number.isFinite(price) || price <= 0) return null;
  const rate = options.odRate ?? OD_RATE_DEFAULT;
  const ncbDiscount = NCB_DISCOUNT_BY_SLAB[Number(options.ncb)] ?? 0;
  return Math.round(price * rate * (1 - ncbDiscount));
}

/**
 * Full premium breakdown for a policy, mirroring a real policy schedule:
 * OD Premium (A) + Liability/TP Premium (B) + Add-ons -> Total -> GST -> Gross.
 *
 * @param {object} input - the submitted policy input (vehicleClass, idv,
 *   cubicCapacity, weightBand, ncb, zeroDepCover, paOwnerCover)
 * @returns {object|null} { odPremium, tpPremium, addonPremium, netPremium, gstAmount, grossPremium }
 *   or null if IDV/vehicleClass are missing/invalid.
 */
export function calculatePremium(input) {
  if (!input) return null;
  const { vehicleClass, idv, cubicCapacity, weightBand, ncb, zeroDepCover, paOwnerCover } = input;

  const odPremium = calculateOdPremium(idv, { ncb });
  const tpPremium = calculateTpPremium({ vehicleClass, cubicCapacity, weightBand });
  if (odPremium === null || tpPremium === null) return null;

  let addonPremium = 0;
  if (zeroDepCover === 'yes') addonPremium += ADDON_PREMIUM.zeroDepCover;
  if (paOwnerCover === 'yes') addonPremium += ADDON_PREMIUM.paOwnerCover;

  const netPremium = odPremium + tpPremium + addonPremium;
  const gstAmount = Math.round(netPremium * GST_RATE);
  const grossPremium = netPremium + gstAmount;

  return { odPremium, tpPremium, addonPremium, netPremium, gstAmount, grossPremium };
}
