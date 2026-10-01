import { maxPayout } from './payout.js';

// Builds a formatted .xlsx from commission grid line items. exceljs is loaded on
// demand so it doesn't weigh down the initial bundle.

const FUEL_KEYS = [
  ['petrolPercent', 'petrolNote'],
  ['dieselPercent', 'dieselNote'],
  ['cngPercent', 'cngNote'],
  ['electricPercent', 'electricNote'],
  ['allFuelPercent', 'note'],
];

const BASE_COLUMNS = [
  { header: 'Company', width: 18 },
  { header: 'Product', width: 14 },
  { header: 'Sub Product', width: 22 },
  { header: 'Policy Type', width: 14 },
  { header: 'RTO', width: 34 },
  { header: 'Discount', width: 12, rate: true },
  { header: 'Slab', width: 22 },
  { header: 'Petrol', width: 11, rate: true },
  { header: 'Diesel', width: 11, rate: true },
  { header: 'CNG', width: 11, rate: true },
  { header: 'Electric', width: 11, rate: true },
  { header: 'All Fuel', width: 11, rate: true },
  { header: 'Remarks', width: 40 },
  { header: 'Booking', width: 18 },
];

// Numbers become real percentages (so Excel can sort/filter/sum them); text like
// "IRDA" stays text. Empty cells stay empty.
function rateCell(value, note) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value / 100;
  return note || null;
}

function toRows(item, includePayout) {
  const base = [item.company, item.product, item.subProduct, item.policyType, item.rto];
  const discount = rateCell(item.discountPercent, item.discountNote);
  const tail = [item.remarks, item.bookingEntity].map((v) => v || null);
  const rates = item.rates?.length ? item.rates : [{}];
  const payout = includePayout ? maxPayout(item) : null;
  return rates.map((rate) => [
    ...base.map((v) => v || null),
    discount,
    ...(includePayout ? [payout === null ? null : payout / 100] : []),
    rate.slabLabel || null,
    ...FUEL_KEYS.map(([k, n]) => rateCell(rate[k], rate[n])),
    ...tail,
  ]);
}

export async function exportCommissionGridToExcel({ lineItems, title, fileName, includePayout = false }) {
  // Combined (multi-grid) exports get a Payout column: the row's highest rate, in the order shown on screen.
  const COLUMNS = includePayout
    ? [...BASE_COLUMNS.slice(0, 6), { header: 'Payout (max)', width: 13, rate: true }, ...BASE_COLUMNS.slice(6)]
    : BASE_COLUMNS;
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Commission Grid', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
  lineItems.forEach((item) => toRows(item, includePayout).forEach((row) => sheet.addRow(row)));

  const thin = { style: 'thin', color: { argb: 'FFCBD5E1' } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = border;
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const col = COLUMNS[colNumber - 1];
      cell.border = border;
      cell.alignment = {
        vertical: 'top',
        horizontal: col?.rate ? 'center' : 'left',
        wrapText: true,
      };
      if (col?.rate && typeof cell.value === 'number') cell.numFmt = '0.0#%';
      if (rowNumber % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  if (title) workbook.title = title;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
