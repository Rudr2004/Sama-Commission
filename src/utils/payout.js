// "Payout" for a commission grid row = the highest numeric rate found across all of its
// slabs and fuel columns. Rows that only carry text (e.g. "IRDA") have no payout number.
const RATE_KEYS = ['petrolPercent', 'dieselPercent', 'cngPercent', 'electricPercent', 'allFuelPercent'];

export function maxPayout(item) {
  let best = null;
  for (const rate of item.rates || []) {
    for (const key of RATE_KEYS) {
      const v = rate[key];
      if (typeof v === 'number' && !Number.isNaN(v) && (best === null || v > best)) best = v;
    }
  }
  return best;
}

export function formatPayout(value) {
  return value === null || value === undefined ? null : `${value}%`;
}

// Orders rows by payout; rows without a number always go last, whichever direction.
export function sortByPayout(items, direction) {
  const keyed = items.map((item, index) => ({ item, index, payout: maxPayout(item) }));
  keyed.sort((a, b) => {
    if (a.payout === null && b.payout === null) return a.index - b.index;
    if (a.payout === null) return 1;
    if (b.payout === null) return -1;
    const diff = direction === 'desc' ? b.payout - a.payout : a.payout - b.payout;
    return diff || a.index - b.index;
  });
  return keyed.map((k) => k.item);
}

// Merges several single-grid results into one "combined" result. sourceSheet is dropped
// because sheet names from different files collide (e.g. every workbook has a "Sheet1");
// the Company filter tells the grids apart instead.
export function mergeGridResults(results) {
  const companies = [...new Set(results.flatMap((r) => r.extraction.lineItems.map((i) => i.company)).filter(Boolean))];
  return {
    combined: true,
    fileName: `Combined – ${results.map((r) => r.fileName).join(' + ')}`,
    extraction: {
      documentTitle: `Combined grids${companies.length ? `: ${companies.join(' + ')}` : ''}`,
      lineItems: results.flatMap((r) => r.extraction.lineItems.map(({ sourceSheet: _sheet, ...rest }) => rest)),
    },
  };
}
