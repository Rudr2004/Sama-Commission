import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { CommissionGridFilterSelect } from './CommissionGridFilterSelect.jsx';

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

// Color-codes a rate badge by its value so the table is scannable at a glance:
// higher commission/discount % reads as a stronger green, mid-range as blue,
// low values as amber, and non-numeric shorthand (IRDA, "as per system", etc.)
// as neutral slate rather than implying a judgment about the value.
function rateTone(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'slate';
  if (value >= 40) return 'green';
  if (value >= 20) return 'brand';
  return 'amber';
}

function RateBadge({ value, note }) {
  if (value == null && !note) return <span className="text-slate-300 text-sm">—</span>;
  return <Badge tone={rateTone(value)}>{formatPercent(value, note)}</Badge>;
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

// Deterministic color assignment so the same company/policy-type always gets
// the same pill color across every row and every re-render, without needing
// to track assignments in state.
const PILL_PALETTE = [
  'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  'bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200',
  'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
  'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
  'bg-cyan-50 text-cyan-700 ring-1 ring-inset ring-cyan-200',
];

function pillClassFor(label) {
  if (!label) return PILL_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return PILL_PALETTE[hash % PILL_PALETTE.length];
}

function IdentityPill({ label }) {
  if (!label) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${pillClassFor(label)}`}>
      {label}
    </span>
  );
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

  const handleCompanyFilterChange = (value) => {
    setCompanyFilter(value);
    setPage(1);
  };

  const handleProductFilterChange = (value) => {
    setProductFilter(value);
    setSubProductFilter('all'); // sub-product options depend on the selected class, so reset it
    setPage(1);
  };

  const handleSubProductFilterChange = (value) => {
    setSubProductFilter(value);
    setPage(1);
  };

  const handlePolicyTypeFilterChange = (value) => {
    setPolicyTypeFilter(value);
    setPage(1);
  };

  const handleRtoFilterChange = (value) => {
    setRtoFilter(value);
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
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {isExtracting && (
            <div className="relative overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50 px-5 py-4">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-100 overflow-hidden">
                <div className="h-full w-1/3 bg-brand-500 rounded-full animate-loading-bar" />
              </div>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 w-9 h-9">
                  <div className="absolute inset-0 rounded-full border-2 border-brand-200" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-600 animate-spin" />
                  <svg className="absolute inset-0 m-auto w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-800">AI is reading your document…</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    Parsing rows, matching commission slabs, and structuring the data. Usually 1–3 minutes; large
                    multi-sheet spreadsheets can take 10+ minutes. Keep this tab open.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pl-12">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {result && (
        <Card className="animate-result-fade-in overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-5 py-4 bg-gradient-to-r from-emerald-50 via-white to-white border-b border-slate-100">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 truncate">
                  {result.extraction.documentTitle || result.fileName}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {result.extraction.issuingEntity && (
                    <Badge tone="slate">{result.extraction.issuingEntity}</Badge>
                  )}
                  {result.extraction.validityPeriod && (
                    <Badge tone="slate">{result.extraction.validityPeriod}</Badge>
                  )}
                  <Badge tone="brand">{result.extraction.lineItems.length} line items</Badge>
                  <Badge tone="violet">{companies.length} {companies.length === 1 ? 'company' : 'companies'}</Badge>
                  <Badge tone="amber">{rtos.length} RTOs</Badge>
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={handleReset} className="shrink-0">
              Upload Another
            </Button>
          </div>
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
                  <CommissionGridFilterSelect
                    value={companyFilter}
                    onChange={handleCompanyFilterChange}
                    options={companies}
                    allLabel={`All companies (${companies.length})`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Class</span>
                  <CommissionGridFilterSelect
                    value={productFilter}
                    onChange={handleProductFilterChange}
                    options={products}
                    allLabel={`All classes (${products.length})`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Sub Product</span>
                  <CommissionGridFilterSelect
                    value={subProductFilter}
                    onChange={handleSubProductFilterChange}
                    options={subProducts}
                    allLabel={`All sub products (${subProducts.length})`}
                    disabled={subProducts.length === 0}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Policy Type</span>
                  <CommissionGridFilterSelect
                    value={policyTypeFilter}
                    onChange={handlePolicyTypeFilterChange}
                    options={policyTypes}
                    allLabel={`All types (${policyTypes.length})`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">RTO</span>
                  <CommissionGridFilterSelect
                    value={rtoFilter}
                    onChange={handleRtoFilterChange}
                    options={rtos}
                    allLabel={`All RTOs (${rtos.length})`}
                    disabled={rtos.length === 0}
                  />
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

            <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm">
              <table className="w-full min-w-[1400px] text-sm border-collapse">
                <thead>
                  <tr className="text-center text-slate-600 bg-gradient-to-b from-slate-100 to-slate-100/70">
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Company</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Product</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Sub Product</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Type</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">RTO</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Discount</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider min-w-[280px] border border-slate-300">Rates</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider min-w-[220px] border border-slate-300">Remarks</th>
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap border border-slate-300">Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLineItems.map((item, idx) => {
                    const rates = item.rates || [];
                    const isMultiSlab = rates.length > 1;
                    return (
                      <tr
                        key={idx}
                        className={`align-top transition-colors hover:bg-brand-50/50 ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                      >
                        <td className="py-3 px-3 align-top border border-slate-200">
                          <IdentityPill label={item.company} />
                        </td>
                        <td className="py-3 px-3 text-left text-slate-700 align-top whitespace-nowrap border border-slate-200">{item.product}</td>
                        <td className="py-3 px-3 text-left text-slate-600 align-top border border-slate-200">{item.subProduct || <span className="text-slate-300">—</span>}</td>
                        <td className="py-3 px-3 align-top border border-slate-200">
                          {item.policyType ? <IdentityPill label={item.policyType} /> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-3 text-left text-slate-700 align-top border border-slate-200">{item.rto || <span className="text-slate-300">—</span>}</td>
                        <td className="py-3 px-3 align-top border border-slate-200">
                          <RateBadge value={item.discountPercent} note={item.discountNote} />
                        </td>
                        <td className="py-3 px-3 align-top border border-slate-200">
                          {rates.length === 0 ? (
                            <span className="text-slate-300">—</span>
                          ) : !isMultiSlab && !slabHasAnyFuelValue(rates[0]) ? (
                            <RateBadge value={rates[0].allFuelPercent} note={rates[0].note} />
                          ) : (
                            <table className="w-full border-collapse border border-slate-300 rounded-md overflow-hidden">
                              <thead>
                                <tr className="bg-slate-100 text-center">
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 whitespace-nowrap border border-slate-300">
                                    Slab
                                  </th>
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-slate-300">
                                    Petrol
                                  </th>
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-slate-300">
                                    Diesel
                                  </th>
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-slate-300">
                                    CNG
                                  </th>
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-slate-300">
                                    Electric
                                  </th>
                                  <th className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider px-2.5 py-1.5 border border-slate-300">
                                    All Fuel
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rates.map((rate, rIdx) => (
                                  <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                                    <td className="px-2.5 py-1.5 text-slate-700 font-medium whitespace-nowrap border border-slate-200">
                                      {rate.slabLabel || '—'}
                                    </td>
                                    <td className="px-2.5 py-1.5 border border-slate-200">
                                      <RateBadge value={rate.petrolPercent} note={rate.petrolNote} />
                                    </td>
                                    <td className="px-2.5 py-1.5 border border-slate-200">
                                      <RateBadge value={rate.dieselPercent} note={rate.dieselNote} />
                                    </td>
                                    <td className="px-2.5 py-1.5 border border-slate-200">
                                      <RateBadge value={rate.cngPercent} note={rate.cngNote} />
                                    </td>
                                    <td className="px-2.5 py-1.5 border border-slate-200">
                                      <RateBadge value={rate.electricPercent} note={rate.electricNote} />
                                    </td>
                                    <td className="px-2.5 py-1.5 border border-slate-200">
                                      <RateBadge value={rate.allFuelPercent} note={rate.note} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left text-slate-600 whitespace-pre-wrap align-top border border-slate-200">
                          {item.remarks || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-3 text-left text-slate-500 align-top whitespace-nowrap border border-slate-200">
                          {item.bookingEntity || <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLineItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          <span>No line items match your filters.</span>
                        </div>
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
