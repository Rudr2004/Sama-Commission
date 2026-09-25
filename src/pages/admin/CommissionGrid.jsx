import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12', // .xlsb
];
const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xlsb';
// Browsers frequently misreport .xlsb (and sometimes .xlsx) with a generic MIME
// type, so file validation falls back to checking the extension as well.
const ACCEPTED_EXTENSION_PATTERN = /\.(pdf|png|jpe?g|webp|xlsx|xlsb)$/i;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const PAGE_SIZE = 10;
const RESULT_STORAGE_KEY = 'sama.commissionGrid.lastResult';

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPercent(value, note) {
  if (typeof value === 'number' && !Number.isNaN(value)) return `${value}%`;
  if (note) return note;
  return '—';
}

const FUEL_COLUMNS = [
  { key: 'petrolPercent', noteKey: 'petrolNote', label: 'Petrol' },
  { key: 'dieselPercent', noteKey: 'dieselNote', label: 'Diesel' },
  { key: 'cngPercent', noteKey: 'cngNote', label: 'CNG' },
  { key: 'electricPercent', noteKey: 'electricNote', label: 'Electric' },
];

function slabHasAnyFuelValue(slab) {
  return FUEL_COLUMNS.some((col) => slab[col.key] != null || slab[col.noteKey]);
}

function loadStoredResult() {
  try {
    const raw = sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.extraction?.lineItems)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CommissionGrid() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(loadStoredResult); // { fileName, extraction }
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [subProductFilter, setSubProductFilter] = useState('all');
  const [policyTypeFilter, setPolicyTypeFilter] = useState('all');
  const [rtoFilter, setRtoFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      if (result) {
        sessionStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
      } else {
        sessionStorage.removeItem(RESULT_STORAGE_KEY);
      }
    } catch {
      // sessionStorage unavailable (private mode, quota, etc.) — extraction still works in-memory for this session.
    }
  }, [result]);

  const resultLineItems = result?.extraction?.lineItems;
  const lineItems = useMemo(() => resultLineItems ?? [], [resultLineItems]);

  const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const companies = useMemo(() => uniqueSorted(lineItems.map((item) => item.company)), [lineItems]);
  const products = useMemo(() => uniqueSorted(lineItems.map((item) => item.product)), [lineItems]);
  const policyTypes = useMemo(() => uniqueSorted(lineItems.map((item) => item.policyType)), [lineItems]);
  const rtos = useMemo(() => uniqueSorted(lineItems.map((item) => item.rto)), [lineItems]);

  // Sub-product options narrow to whatever's actually available under the selected product (class),
  // matching how these grids are organized (e.g. 2W -> SCOOTER/BIKE, CAR -> ALL/tonnage-or-CC bands).
  const subProducts = useMemo(
    () =>
      uniqueSorted(
        lineItems
          .filter((item) => productFilter === 'all' || item.product === productFilter)
          .map((item) => item.subProduct)
      ),
    [lineItems, productFilter]
  );

  const activeFilters = [
    companyFilter !== 'all' && { key: 'company', label: `Company: ${companyFilter}`, clear: () => setCompanyFilter('all') },
    productFilter !== 'all' && { key: 'product', label: `Class: ${productFilter}`, clear: () => setProductFilter('all') },
    subProductFilter !== 'all' && {
      key: 'subProduct',
      label: `Sub Product: ${subProductFilter}`,
      clear: () => setSubProductFilter('all'),
    },
    policyTypeFilter !== 'all' && {
      key: 'policyType',
      label: `Type: ${policyTypeFilter}`,
      clear: () => setPolicyTypeFilter('all'),
    },
    rtoFilter !== 'all' && { key: 'rto', label: `RTO: ${rtoFilter}`, clear: () => setRtoFilter('all') },
    search.trim() && { key: 'search', label: `Search: "${search.trim()}"`, clear: () => setSearch('') },
  ].filter(Boolean);

  const filteredLineItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lineItems.filter((item) => {
      if (companyFilter !== 'all' && item.company !== companyFilter) return false;
      if (productFilter !== 'all' && item.product !== productFilter) return false;
      if (subProductFilter !== 'all' && item.subProduct !== subProductFilter) return false;
      if (policyTypeFilter !== 'all' && item.policyType !== policyTypeFilter) return false;
      if (rtoFilter !== 'all' && item.rto !== rtoFilter) return false;
      if (!q) return true;
      const slabLabels = (item.rates || []).map((r) => r.slabLabel).filter(Boolean);
      const haystack = [
        item.company,
        item.product,
        item.subProduct,
        item.policyType,
        item.rto,
        item.remarks,
        item.bookingEntity,
        ...slabLabels,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lineItems, search, companyFilter, productFilter, subProductFilter, policyTypeFilter, rtoFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLineItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLineItems = useMemo(
    () => filteredLineItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredLineItems, currentPage]
  );

  const validateAndSetFile = (file) => {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSION_PATTERN.test(file.name)) {
      setError('Unsupported file type. Please upload a PDF, PNG, JPG, WEBP, XLSX, or XLSB file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum size is 20MB.');
      return;
    }
    setSelectedFile(file);
    setResult(null);
  };

  const handleFileInputChange = (e) => {
    validateAndSetFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (companyName.trim()) formData.append('company', companyName.trim());

      const response = await fetch('/api/grid/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to extract grid data.');
      }

      if (!Array.isArray(data?.extraction?.lineItems)) {
        throw new Error('The extraction came back in an unexpected format. Please try uploading again.');
      }

      setResult(data);
      setSearch('');
      setCompanyFilter('all');
      setProductFilter('all');
      setSubProductFilter('all');
      setPolicyTypeFilter('all');
      setRtoFilter('all');
      setPage(1);
      toast.success('Grid extracted', `Parsed ${data.extraction?.lineItems?.length ?? 0} line item(s) from ${data.fileName}.`);
    } catch (err) {
      setError(err.message || 'Something went wrong while extracting the grid.');
      toast.error('Extraction failed', err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCompanyName('');
    setResult(null);
    setError(null);
    setSearch('');
    setCompanyFilter('all');
    setProductFilter('all');
    setSubProductFilter('all');
    setPolicyTypeFilter('all');
    setRtoFilter('all');
    setPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCompanyFilterChange = (e) => {
    setCompanyFilter(e.target.value);
    setPage(1);
  };

  const handleProductFilterChange = (e) => {
    setProductFilter(e.target.value);
    setSubProductFilter('all'); // sub-product options depend on the selected class, so reset it
    setPage(1);
  };

  const handleSubProductFilterChange = (e) => {
    setSubProductFilter(e.target.value);
    setPage(1);
  };

  const handlePolicyTypeFilterChange = (e) => {
    setPolicyTypeFilter(e.target.value);
    setPage(1);
  };

  const handleRtoFilterChange = (e) => {
    setRtoFilter(e.target.value);
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setCompanyFilter('all');
    setProductFilter('all');
    setSubProductFilter('all');
    setPolicyTypeFilter('all');
    setRtoFilter('all');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Commission Grid Upload"
          subtitle="Upload a commission grid document from any insurer or broker — AI will read it and extract a structured breakdown."
        />
        <CardBody className="space-y-4">
          <label className="flex flex-col gap-1 max-w-sm">
            <span className="text-xs font-medium text-slate-500">
              Company / Insurer name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Bajaj Allianz, TATA AIG…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-slate-400">
              Used to fill in the Company column when the document itself doesn't state it.
            </span>
          </label>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleFileInputChange}
            />
            {selectedFile ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                    Choose a different file
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleExtract}
                    disabled={isExtracting || !companyName.trim()}
                    title={!companyName.trim() ? 'Enter the company / insurer name first' : undefined}
                  >
                    {isExtracting ? 'Extracting…' : 'Extract Grid Data'}
                  </Button>
                </div>
                {!companyName.trim() && (
                  <p className="text-xs text-amber-600">Enter the company name above before extracting.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Drag & drop a grid file here, or</p>
                <Button size="sm" variant="primary" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
                <p className="text-xs text-slate-400 pt-1">PDF, XLSX, or XLSB — up to 20MB</p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {isExtracting && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Reading the document and extracting commission data — this usually takes 1–3 minutes, and can take
              longer (up to 10+ minutes) for large multi-sheet spreadsheets. Please keep this tab open.
            </div>
          )}
        </CardBody>
      </Card>

      {result && (
        <Card>
          <CardHeader
            title={result.extraction.documentTitle || result.fileName}
            subtitle={[
              result.extraction.issuingEntity,
              result.extraction.validityPeriod,
              `${result.extraction.lineItems.length} line item(s)`,
            ]
              .filter(Boolean)
              .join(' · ')}
            action={
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Upload Another
              </Button>
            }
          />
          <CardBody className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <label className="flex flex-col gap-1 sm:col-span-2">
                  <span className="text-xs font-medium text-slate-500">Search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Product, RTO, remarks…"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Company</span>
                  <select
                    value={companyFilter}
                    onChange={handleCompanyFilterChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All companies ({companies.length})</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Class</span>
                  <select
                    value={productFilter}
                    onChange={handleProductFilterChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All classes ({products.length})</option>
                    {products.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Sub Product</span>
                  <select
                    value={subProductFilter}
                    onChange={handleSubProductFilterChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={subProducts.length === 0}
                  >
                    <option value="all">All sub products ({subProducts.length})</option>
                    {subProducts.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Policy Type</span>
                  <select
                    value={policyTypeFilter}
                    onChange={handlePolicyTypeFilterChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">All types ({policyTypes.length})</option>
                    {policyTypes.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">RTO</span>
                  <select
                    value={rtoFilter}
                    onChange={handleRtoFilterChange}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={rtos.length === 0}
                  >
                    <option value="all">All RTOs ({rtos.length})</option>
                    {rtos.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">Active filters:</span>
                  {activeFilters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={f.clear}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 text-brand-700 pl-2.5 pr-1.5 py-1 text-xs font-medium hover:bg-brand-200 transition-colors"
                    >
                      {f.label}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 underline underline-offset-2 ml-1"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[1400px] text-sm border-collapse">
                <thead>
                  <tr className="text-center text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Company</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Product</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Sub Product</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Type</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">RTO</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Discount</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 min-w-[280px]">Rates</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 min-w-[220px]">Remarks</th>
                    <th className="py-2.5 px-3 font-medium border border-slate-200 whitespace-nowrap">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLineItems.map((item, idx) => {
                    const rates = item.rates || [];
                    const isMultiSlab = rates.length > 1;
                    return (
                      <tr key={idx} className="align-top hover:bg-slate-50/60">
                        <td className="py-3 px-3 text-center font-medium text-slate-900 border border-slate-200 align-top">{item.company || '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-700 border border-slate-200 align-top">{item.product}</td>
                        <td className="py-3 px-3 text-center text-slate-700 border border-slate-200 align-top">{item.subProduct || '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-700 border border-slate-200 align-top">{item.policyType || '—'}</td>
                        <td className="py-3 px-3 text-center text-slate-700 border border-slate-200 align-top">{item.rto || '—'}</td>
                        <td className="py-3 px-3 text-center border border-slate-200 align-top">
                          <Badge tone="slate">{formatPercent(item.discountPercent, item.discountNote)}</Badge>
                        </td>
                        <td className="py-3 px-3 text-center border border-slate-200 align-top">
                          {rates.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : !isMultiSlab && !slabHasAnyFuelValue(rates[0]) ? (
                            <Badge tone="brand">{formatPercent(rates[0].allFuelPercent, rates[0].note)}</Badge>
                          ) : (
                            <table className="border-collapse border border-slate-200">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5 whitespace-nowrap">
                                    Slab
                                  </th>
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5">
                                    Petrol
                                  </th>
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5">
                                    Diesel
                                  </th>
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5">
                                    CNG
                                  </th>
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5">
                                    Electric
                                  </th>
                                  <th className="text-center font-medium text-slate-500 text-[11px] uppercase tracking-wide border border-slate-200 px-3 py-1.5">
                                    All Fuel
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rates.map((rate, rIdx) => (
                                  <tr key={rIdx}>
                                    <td className="text-center border border-slate-200 px-3 py-1.5 text-slate-700 font-medium whitespace-nowrap">
                                      {rate.slabLabel || '—'}
                                    </td>
                                    <td className="text-center border border-slate-200 px-3 py-1.5">
                                      {rate.petrolPercent != null || rate.petrolNote ? (
                                        <Badge tone="brand">{formatPercent(rate.petrolPercent, rate.petrolNote)}</Badge>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="text-center border border-slate-200 px-3 py-1.5">
                                      {rate.dieselPercent != null || rate.dieselNote ? (
                                        <Badge tone="brand">{formatPercent(rate.dieselPercent, rate.dieselNote)}</Badge>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="text-center border border-slate-200 px-3 py-1.5">
                                      {rate.cngPercent != null || rate.cngNote ? (
                                        <Badge tone="brand">{formatPercent(rate.cngPercent, rate.cngNote)}</Badge>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="text-center border border-slate-200 px-3 py-1.5">
                                      {rate.electricPercent != null || rate.electricNote ? (
                                        <Badge tone="brand">{formatPercent(rate.electricPercent, rate.electricNote)}</Badge>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="text-center border border-slate-200 px-3 py-1.5">
                                      {rate.allFuelPercent != null || rate.note ? (
                                        <Badge tone="brand">{formatPercent(rate.allFuelPercent, rate.note)}</Badge>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 border border-slate-200 whitespace-pre-wrap align-top">
                          {item.remarks || '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 border border-slate-200 align-top">
                          {item.bookingEntity || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLineItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No line items match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredLineItems.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLineItems.length)} of{' '}
                  {filteredLineItems.length} line item(s)
                  {activeFilters.length > 0 && lineItems.length !== filteredLineItems.length && (
                    <> (filtered from {lineItems.length} total)</>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500 px-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {result.extraction.unparsedNotes && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 whitespace-pre-wrap">
                <span className="font-semibold">Additional notes from document: </span>
                {result.extraction.unparsedNotes}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
