import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardBody } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { useToast } from '../../components/common/ToastContext.jsx';
import { CommissionGridFilterSelect } from './CommissionGridFilterSelect.jsx';
import { apiUrl } from '../../config/api.js';
import { BulkGridUpload, MAX_BULK_FILES } from './BulkGridUpload.jsx';
import { formatPayout, maxPayout, sortByPayout } from '../../utils/payout.js';
import { exportCommissionGridToExcel } from '../../utils/exportCommissionGrid.js';

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

// Every distinct rate value shown in an item's Rates column (e.g. "45%", "IRDA"),
// used both to build the Rates filter options and to match items against it.
function rateLabelsFor(item) {
  const labels = [];
  for (const rate of item.rates || []) {
    for (const col of FUEL_COLUMNS) {
      const label = formatPercent(rate[col.key], rate[col.noteKey]);
      if (label !== '—') labels.push(label);
    }
    const allFuel = formatPercent(rate.allFuelPercent, rate.note);
    if (allFuel !== '—') labels.push(allFuel);
  }
  return labels;
}

function compareRateLabels(a, b) {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  const aNum = a.endsWith('%') && !Number.isNaN(na);
  const bNum = b.endsWith('%') && !Number.isNaN(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.localeCompare(b);
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

// Upload month choices: the current month and the next one, as { value: 'YYYY-MM', label }.
function getMonthOptions() {
  const now = new Date();
  return [0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { value, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
  });
}

function currentTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatMonthLabel(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return value || '—';
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function formatTimeLabel(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return value || '—';
  const h = Number(match[1]);
  return `${h % 12 || 12}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

// Shared by the single and bulk uploaders; returns a user-facing problem or null if the file is fine.
function getFileError(file) {
  if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSION_PATTERN.test(file.name)) {
    return 'Unsupported file type. Please upload a PDF, PNG, JPG, WEBP, XLSX, or XLSB file.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File is too large. Maximum size is 20MB.';
  return null;
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
  const resultsRef = useRef(null);

  const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'bulk'
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
  const [rateFilter, setRateFilter] = useState('all');
  const [payoutSort, setPayoutSort] = useState('asc'); // combined view only: 'asc' | 'desc' | 'original'
  const [page, setPage] = useState(1);
  const [activeSheet, setActiveSheet] = useState('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const monthOptions = useMemo(getMonthOptions, []);
  const [uploadMonth, setUploadMonth] = useState(() => getMonthOptions()[0].value);
  const [uploadTime, setUploadTime] = useState(currentTimeValue);
  const [history, setHistory] = useState({ enabled: false, items: [], status: 'loading' }); // status: loading | ready | error
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // history entry awaiting delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);

  // History lives in MongoDB behind the API, so every browser sees the same list. The hosted
  // backend can be asleep (cold start) or briefly unreachable, so failures are retried and
  // surfaced with a Retry button instead of silently showing an empty list.
  const refreshHistory = async (attempt = 0) => {
    if (attempt === 0) setHistory((h) => ({ ...h, status: 'loading' }));
    try {
      const response = await fetch(apiUrl('/api/grid/history'), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setHistory({ enabled: !!data.enabled, items: data.items || [], status: 'ready' });
    } catch {
      if (attempt < 3) {
        setTimeout(() => refreshHistory(attempt + 1), 4000 * (attempt + 1));
      } else {
        setHistory((h) => ({ ...h, status: 'error' }));
      }
    }
  };

  useEffect(() => {
    refreshHistory();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshHistory(1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

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
  const allLineItems = useMemo(() => resultLineItems ?? [], [resultLineItems]);

  // Spreadsheet uploads stamp each line item with the workbook sheet it came
  // from (see server/anthropic_client.py); PDFs/images have no sheet concept,
  // so sourceSheet is absent there and the tab bar never renders.
  const sheetNames = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    for (const item of allLineItems) {
      if (item.sourceSheet && !seen.has(item.sourceSheet)) {
        seen.add(item.sourceSheet);
        ordered.push(item.sourceSheet);
      }
    }
    return ordered;
  }, [allLineItems]);

  // A combined result merges several bulk-uploaded grids; it shows "Payout" instead of "Rates" and can be sorted by it.
  const isCombined = !!result?.combined;

  const lineItems = useMemo(() => {
    if (activeSheet === 'all') return allLineItems;
    return allLineItems.filter((item) => item.sourceSheet === activeSheet);
  }, [allLineItems, activeSheet]);

  const handleSheetChange = (sheetName) => {
    setActiveSheet(sheetName);
    setSearch('');
    setCompanyFilter('all');
    setProductFilter('all');
    setSubProductFilter('all');
    setPolicyTypeFilter('all');
    setRtoFilter('all');
    setRateFilter('all');
    setPage(1);
  };

  const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const companies = useMemo(() => uniqueSorted(lineItems.map((item) => item.company)), [lineItems]);
  const products = useMemo(() => uniqueSorted(lineItems.map((item) => item.product)), [lineItems]);
  const policyTypes = useMemo(() => uniqueSorted(lineItems.map((item) => item.policyType)), [lineItems]);
  const rtos = useMemo(() => uniqueSorted(lineItems.map((item) => item.rto)), [lineItems]);
  const rateOptions = useMemo(() => {
    if (isCombined) {
      const values = lineItems.map(maxPayout).filter((v) => v !== null);
      return Array.from(new Set(values)).sort((a, b) => a - b).map(formatPayout);
    }
    return Array.from(new Set(lineItems.flatMap(rateLabelsFor))).sort(compareRateLabels);
  }, [lineItems, isCombined]);

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
    rateFilter !== 'all' && { key: 'rate', label: `${isCombined ? 'Payout' : 'Rate'}: ${rateFilter}`, clear: () => setRateFilter('all') },
    search.trim() && { key: 'search', label: `Search: "${search.trim()}"`, clear: () => setSearch('') },
  ].filter(Boolean);

  const filteredLineItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = lineItems.filter((item) => {
      if (companyFilter !== 'all' && item.company !== companyFilter) return false;
      if (productFilter !== 'all' && item.product !== productFilter) return false;
      if (subProductFilter !== 'all' && item.subProduct !== subProductFilter) return false;
      if (policyTypeFilter !== 'all' && item.policyType !== policyTypeFilter) return false;
      if (rtoFilter !== 'all' && item.rto !== rtoFilter) return false;
      if (rateFilter !== 'all') {
        const matches = isCombined ? formatPayout(maxPayout(item)) === rateFilter : rateLabelsFor(item).includes(rateFilter);
        if (!matches) return false;
      }
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
    return isCombined && payoutSort !== 'original' ? sortByPayout(matched, payoutSort) : matched;
  }, [lineItems, search, companyFilter, productFilter, subProductFilter, policyTypeFilter, rtoFilter, rateFilter, isCombined, payoutSort]);

  const totalPages = Math.max(1, Math.ceil(filteredLineItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLineItems = useMemo(
    () => filteredLineItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredLineItems, currentPage]
  );

  const validateAndSetFile = (file) => {
    setError(null);
    if (!file) return;
    const problem = getFileError(file);
    if (problem) {
      setError(problem);
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
      formData.append('month', uploadMonth);
      formData.append('time', uploadTime);

      const response = await fetch(apiUrl('/api/grid/extract'), {
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
      setRateFilter('all');
      setPage(1);
      setActiveSheet('all');
      if (data.historyId) refreshHistory();
      toast.success('Grid extracted', `Parsed ${data.extraction?.lineItems?.length ?? 0} line item(s) from ${data.fileName}.`);
    } catch (err) {
      setError(err.message || 'Something went wrong while extracting the grid.');
      // The server may have finished and saved the upload even though the response never arrived (e.g. a proxy timeout).
      refreshHistory();
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
    setRateFilter('all');
    setPage(1);
    setActiveSheet('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Exports exactly what the admin is looking at: current sheet tab + filters, all pages.
  const handleDownload = async () => {
    if (filteredLineItems.length === 0) return;
    setIsDownloading(true);
    try {
      const base = (result?.fileName || 'commission-grid').replace(/\.[^.]+$/, '');
      await exportCommissionGridToExcel({
        lineItems: filteredLineItems,
        title: result?.extraction?.documentTitle,
        fileName: `${base}-commission-grid.xlsx`,
        includePayout: isCombined,
      });
      toast.success('Download ready', `Exported ${filteredLineItems.length} line item(s) to Excel.`);
    } catch (err) {
      toast.error('Download failed', err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Shows a freshly extracted bulk result in the grid below, with filters reset.
  const handleOpenBulkResult = (data) => {
    setResult(data);
    setError(null);
    handleClearAllFilters();
    setPayoutSort('asc');
    setActiveSheet('all');
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleViewHistory = async (id) => {
    setLoadingHistoryId(id);
    try {
      const response = await fetch(apiUrl(`/api/grid/history/${id}`));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load this history entry.');
      if (!Array.isArray(data?.extraction?.lineItems)) throw new Error('This history entry is corrupted.');
      setSelectedFile(null);
      setResult(data);
      setError(null);
      handleClearAllFilters();
      setActiveSheet('all');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      toast.error('Could not open history entry', err.message);
    } finally {
      setLoadingHistoryId(null);
    }
  };

  // Fetches the originally uploaded file: PDFs/images open in a new tab, spreadsheets download.
  const handleViewOriginalFile = async (entry) => {
    try {
      const response = await fetch(apiUrl(`/api/grid/history/${entry.id}/file`));
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to load the original file.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const viewable = /^(application\/pdf|image\/)/.test(blob.type);
      const a = document.createElement('a');
      a.href = url;
      if (viewable) {
        a.target = '_blank';
        a.rel = 'noopener';
      } else {
        a.download = entry.fileName || 'grid-file';
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (!viewable) toast.success('Download started', entry.fileName);
    } catch (err) {
      toast.error('Could not open file', err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(apiUrl(`/api/grid/history/${deleteTarget.id}`), { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete.');
      }
      setHistory((h) => ({ ...h, items: h.items.filter((i) => i.id !== deleteTarget.id) }));
      toast.success('Deleted', `${deleteTarget.fileName} was removed from history.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Delete failed', err.message);
    } finally {
      setIsDeleting(false);
    }
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

  const handleRateFilterChange = (value) => {
    setRateFilter(value);
    setPage(1);
  };

  const handleClearAllFilters = () => {
    setSearch('');
    setCompanyFilter('all');
    setProductFilter('all');
    setSubProductFilter('all');
    setPolicyTypeFilter('all');
    setRtoFilter('all');
    setRateFilter('all');
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
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[
              { key: 'single', label: 'Single upload' },
              { key: 'bulk', label: `Bulk upload (up to ${MAX_BULK_FILES})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setUploadMode(tab.key)}
                disabled={isExtracting}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed ${
                  uploadMode === tab.key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {uploadMode === 'single' && (
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
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">Month</span>
              <select
                value={uploadMonth}
                onChange={(e) => setUploadMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">Time</span>
              <input
                type="time"
                value={uploadTime}
                onChange={(e) => setUploadTime(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
          </div>

          {uploadMode === 'bulk' ? (
            <BulkGridUpload
              month={uploadMonth}
              time={uploadTime}
              getFileError={getFileError}
              onOpenResult={handleOpenBulkResult}
              onSaved={refreshHistory}
              toast={toast}
            />
          ) : (
            <>
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
            </>
          )}
        </CardBody>
      </Card>

      {result && (
        <div ref={resultsRef} className="scroll-mt-4">
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
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDownload}
                disabled={isDownloading || filteredLineItems.length === 0}
              >
                {isDownloading ? 'Preparing…' : 'Download Excel'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset}>
                Upload Another
              </Button>
            </div>
          </div>

          {sheetNames.length > 1 && (
            <div className="flex items-center gap-1 px-5 pt-3 overflow-x-auto border-b border-slate-100 bg-white">
              <button
                type="button"
                onClick={() => handleSheetChange('all')}
                className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeSheet === 'all'
                    ? 'border-brand-500 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                All Sheets
                <span className="ml-1.5 text-xs text-slate-400">({allLineItems.length})</span>
              </button>
              {sheetNames.map((name) => {
                const count = allLineItems.filter((item) => item.sourceSheet === name).length;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSheetChange(name)}
                    className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                      activeSheet === name
                        ? 'border-brand-500 text-brand-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {name}
                    <span className="ml-1.5 text-xs text-slate-400">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

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
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">{isCombined ? 'Payout' : 'Rates'}</span>
                  <CommissionGridFilterSelect
                    value={rateFilter}
                    onChange={handleRateFilterChange}
                    options={rateOptions}
                    allLabel={`${isCombined ? 'All payouts' : 'All rates'} (${rateOptions.length})`}
                    disabled={rateOptions.length === 0}
                  />
                </label>
                {isCombined && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Sort by payout</span>
                    <select
                      value={payoutSort}
                      onChange={(e) => {
                        setPayoutSort(e.target.value);
                        setPage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="asc">Low → High</option>
                      <option value="desc">High → Low</option>
                      <option value="original">Original order</option>
                    </select>
                  </label>
                )}
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
                    <th className="py-3 px-3 font-semibold text-[11px] uppercase tracking-wider min-w-[280px] border border-slate-300">{isCombined ? 'Payout' : 'Rates'}</th>
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
                          {isCombined && (
                            <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                              Max payout
                              {maxPayout(item) === null ? (
                                <span className="text-slate-300">—</span>
                              ) : (
                                <Badge tone={rateTone(maxPayout(item))}>{formatPayout(maxPayout(item))}</Badge>
                              )}
                            </div>
                          )}
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
        </div>
      )}

      <Card>
        <CardHeader
          title="Upload History"
          subtitle="Previously uploaded grids. View the original file, or open the extracted grid to review and download it again."
        />
        {history.items.length === 0 ? (
          <CardBody>
            {history.status === 'loading' ? (
              <p className="text-sm text-slate-500">Loading history… the server may take a few seconds to wake up.</p>
            ) : history.status === 'error' ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-red-600">Couldn't load history from the server.</p>
                <Button size="sm" onClick={() => refreshHistory()}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500">No uploads yet.</p>
                {!history.enabled && (
                  <p className="text-xs text-slate-400 mt-1">History storage isn't connected yet (MONGODB_URL not set on the server).</p>
                )}
              </>
            )}
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-5 font-semibold">Company</th>
                  <th className="py-2.5 px-3 font-semibold">Month</th>
                  <th className="py-2.5 px-3 font-semibold">Time</th>
                  <th className="py-2.5 px-3 font-semibold">File</th>
                  <th className="py-2.5 px-3 font-semibold">Line items</th>
                  <th className="py-2.5 px-3 font-semibold">Uploaded</th>
                  <th className="py-2.5 px-5" />
                </tr>
              </thead>
              <tbody>
                {history.items.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="py-2.5 px-5 font-medium text-slate-800">{entry.company || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatMonthLabel(entry.month)}</td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatTimeLabel(entry.time)}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[240px] truncate" title={entry.fileName}>{entry.fileName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{entry.lineItemCount}</td>
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-5 whitespace-nowrap text-right space-x-2">
                      {/* <Button
                        size="sm"
                        onClick={() => handleViewOriginalFile(entry)}
                        disabled={!entry.hasFile}
                        title={entry.hasFile ? 'Open the original uploaded file' : 'Original file was not stored for this older entry'}
                      >
                        View
                      </Button> */}
                      <Button size="sm" onClick={() => handleViewHistory(entry.id)} disabled={loadingHistoryId === entry.id}>
                        {loadingHistoryId === entry.id ? 'Opening…' : 'View Grid'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(entry)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 animate-modal-backdrop"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4">
              <h3 className="font-semibold text-slate-900">Delete this upload?</h3>
              <p className="text-sm text-slate-500 mt-1.5">
                <span className="font-medium text-slate-700">{deleteTarget.fileName}</span>
                {deleteTarget.company && <> ({deleteTarget.company})</>} will be permanently removed from history.
                This cannot be undone.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="!bg-red-600 hover:!bg-red-700"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
