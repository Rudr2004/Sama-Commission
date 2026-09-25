// Mock pincode -> City/State/RTO lookup — stands in for the pincode
// autofill real aggregators (Acko, Paytm Insurance) use when capturing a
// policyholder's current address. There is no free public India Post /
// pincode API suitable for this POC, so a small demo dataset covers one
// representative pincode per RTO already in RTO_OPTIONS. Every field this
// populates remains manually editable afterward.
export const seedPincodeRecords = [
  { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', rto: 'GJ-01' },
  { pincode: '395003', city: 'Surat', state: 'Gujarat', rto: 'GJ-05' },
  { pincode: '382010', city: 'Gandhinagar', state: 'Gujarat', rto: 'GJ-18' },
  { pincode: '360001', city: 'Rajkot', state: 'Gujarat', rto: 'GJ-27' },
  { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', rto: 'MH-01' },
  { pincode: '411001', city: 'Pune', state: 'Maharashtra', rto: 'MH-12' },
  { pincode: '411017', city: 'Pimpri-Chinchwad', state: 'Maharashtra', rto: 'MH-14' },
  { pincode: '431001', city: 'Aurangabad (Sambhajinagar)', state: 'Maharashtra', rto: 'MH-20' },
  { pincode: '110001', city: 'New Delhi', state: 'Delhi', rto: 'DL-01' },
  { pincode: '110018', city: 'West Delhi', state: 'Delhi', rto: 'DL-08' },
  { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', rto: 'KA-05' },
  { pincode: '452001', city: 'Indore', state: 'Madhya Pradesh', rto: 'MP-09' },
  { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', rto: 'TN-09' },
  { pincode: '226001', city: 'Lucknow', state: 'Uttar Pradesh', rto: 'UP-32' },
  { pincode: '302001', city: 'Jaipur', state: 'Rajasthan', rto: 'RJ-14' },
  { pincode: '500001', city: 'Hyderabad', state: 'Telangana', rto: 'TS-08' },
  { pincode: '700001', city: 'Kolkata', state: 'West Bengal', rto: 'WB-06' },
];

/**
 * Looks up City/State/RTO for a 6-digit Indian pincode in the mock dataset.
 * @returns {object|null}
 */
export function lookupByPincode(pincode) {
  const normalized = (pincode || '').replace(/\D/g, '');
  if (normalized.length !== 6) return null;
  return seedPincodeRecords.find((r) => r.pincode === normalized) ?? null;
}
