import { useState } from 'react';
import { Button } from '../../components/common/Button.jsx';
import { Badge } from '../../components/common/Badge.jsx';
import { apiUrl } from '../../config/api.js';
import { mergeGridResults } from '../../utils/payout.js';

export const MAX_BULK_FILES = 3;

const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xlsb';

const COMBINED_ID = 'combined';
let slotCounter = 0;
const newSlot = () => ({
  id: `slot-${Date.now()}-${slotCounter++}`,
  company: '',
  file: null,
  status: 'ready',
  error: null,
  data: null,
});

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_BADGE = {
  ready: { tone: 'slate', label: 'Ready' },
  queued: { tone: 'slate', label: 'Queued' },
  extracting: { tone: 'brand', label: 'Extracting…' },
  done: { tone: 'green', label: 'Done' },
  error: { tone: 'red', label: 'Failed' },
};

// Bulk upload: starts with one row (company + file) and the admin adds more with the "+"
// button, up to MAX_BULK_FILES. Files are extracted one at a time through the same
// /api/grid/extract endpoint the single upload uses, so token usage per file is identical
// to a normal upload (nothing is sent twice, finished files are never re-run, and there's
// no burst of parallel AI calls). Every successful extraction is saved to history by the server.
export function BulkGridUpload({ month, time, getFileError, onOpenResult, onSaved, toast }) {
  const [slots, setSlots] = useState(() => [newSlot()]);
  const [draggingId, setDraggingId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [openedId, setOpenedId] = useState(null);

  const patchSlot = (id, patch) => setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSlot = () => setSlots((prev) => (prev.length >= MAX_BULK_FILES ? prev : [...prev, newSlot()]));
  const removeSlot = (id) => setSlots((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));

  const setSlotFile = (id, file) => {
    if (!file) return;
    const problem = getFileError(file);
    if (problem) {
      toast.error(`Skipped ${file.name}`, problem);
      return;
    }
    const duplicate = slots.some((s) => s.id !== id && s.file && s.file.name === file.name && s.file.size === file.size);
    if (duplicate) {
      toast.error(`Skipped ${file.name}`, 'This file is already added in another row.');
      return;
    }
    patchSlot(id, { file, status: 'ready', error: null, data: null });
  };

  const active = slots.filter((s) => s.status !== 'done');
  const pending = active.filter((s) => s.file);
  const incomplete = active.some((s) => !s.file || !s.company.trim());
  const canStart = !isRunning && pending.length > 0 && !incomplete;
  const doneCount = slots.filter((s) => s.status === 'done').length;

  const extractOne = async (slot) => {
    patchSlot(slot.id, { status: 'extracting', error: null });
    try {
      const formData = new FormData();
      formData.append('file', slot.file);
      formData.append('company', slot.company.trim());
      formData.append('month', month);
      formData.append('time', time);

      const response = await fetch(apiUrl('/api/grid/extract'), { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to extract grid data.');
      if (!Array.isArray(data?.extraction?.lineItems)) {
        throw new Error('The extraction came back in an unexpected format.');
      }
      patchSlot(slot.id, { status: 'done', data });
      onSaved();
      return data;
    } catch (err) {
      patchSlot(slot.id, { status: 'error', error: err.message || 'Something went wrong.' });
      return null;
    }
  };

  const handleStart = async () => {
    const queue = pending;
    setIsRunning(true);
    queue.forEach((s) => patchSlot(s.id, { status: 'queued', error: null }));

    let succeeded = 0;
    let failed = 0;
    let firstSuccess = null;
    const newResults = [];
    for (const slot of queue) {
      const data = await extractOne(slot);
      if (data) {
        succeeded += 1;
        newResults.push(data);
        if (!firstSuccess && openedId === null) firstSuccess = { id: slot.id, data };
      } else {
        failed += 1;
      }
    }
    setIsRunning(false);

    // With 2+ finished grids, open the combined (payout-sorted) view; otherwise open the single grid.
    const allResults = [...slots.filter((s) => s.status === 'done').map((s) => s.data), ...newResults];
    if (allResults.length >= 2) {
      setOpenedId(COMBINED_ID);
      onOpenResult(mergeGridResults(allResults));
    } else if (firstSuccess) {
      setOpenedId(firstSuccess.id);
      onOpenResult(firstSuccess.data);
    }
    if (failed === 0) {
      toast.success('Bulk extraction complete', `${succeeded} grid(s) extracted and saved to history.`);
    } else {
      toast.error(
        'Bulk extraction finished with errors',
        `${succeeded} succeeded, ${failed} failed. You can retry the failed ones.`
      );
    }
  };

  const handleOpenCombined = () => {
    setOpenedId(COMBINED_ID);
    onOpenResult(mergeGridResults(slots.filter((s) => s.status === 'done').map((s) => s.data)));
  };

  const handleOpen = (slot) => {
    setOpenedId(slot.id);
    onOpenResult(slot.data);
  };

  const hasRetry = pending.some((s) => s.status === 'error');
  const startLabel = isRunning
    ? 'Extracting…'
    : `${hasRetry ? 'Retry / Extract' : 'Extract'} ${pending.length} file${pending.length === 1 ? '' : 's'}`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {slots.map((slot, index) => {
          const badge = STATUS_BADGE[slot.status];
          const locked = isRunning || slot.status === 'done';
          const inputId = `bulk-file-${slot.id}`;
          return (
            <div key={slot.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 truncate">
                    {slot.company.trim() || `Grid ${index + 1}`}
                  </span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  {slot.status === 'done' && (
                    <span className="text-xs text-slate-500">{slot.data.extraction.lineItems.length} line items</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {slot.status === 'done' && (
                    <Button size="sm" onClick={() => handleOpen(slot)} disabled={openedId === slot.id}>
                      {openedId === slot.id ? 'Shown below' : 'Open Grid'}
                    </Button>
                  )}
                  {slots.length > 1 && !isRunning && slot.status !== 'done' && (
                    <Button size="sm" variant="ghost" onClick={() => removeSlot(slot.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">
                    Company / Insurer name <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={slot.company}
                    disabled={locked}
                    onChange={(e) => patchSlot(slot.id, { company: e.target.value })}
                    placeholder="e.g. Bajaj Allianz, TATA AIG…"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </label>

                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">
                    Grid file <span className="text-red-500">*</span>
                  </span>
                  <input
                    id={inputId}
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    className="hidden"
                    disabled={locked}
                    onChange={(e) => {
                      setSlotFile(slot.id, e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!locked) setDraggingId(slot.id);
                    }}
                    onDragLeave={() => setDraggingId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDraggingId(null);
                      if (!locked) setSlotFile(slot.id, e.dataTransfer.files?.[0]);
                    }}
                    className={`flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 min-h-[38px] transition-colors ${
                      draggingId === slot.id ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {slot.file ? (
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate" title={slot.file.name}>
                          {slot.file.name}
                        </p>
                        <p className="text-xs text-slate-500">{formatFileSize(slot.file.size)}</p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 truncate">Drop a file here or browse</span>
                    )}
                    {!locked && (
                      <label
                        htmlFor={inputId}
                        className="shrink-0 cursor-pointer text-xs font-medium px-2.5 py-1.5 rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                      >
                        {slot.file ? 'Change' : 'Browse'}
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {slot.status === 'error' && <p className="text-xs text-red-600">{slot.error}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addSlot}
          disabled={isRunning || slots.length >= MAX_BULK_FILES}
          title={slots.length >= MAX_BULK_FILES ? `Bulk upload is limited to ${MAX_BULK_FILES} files` : 'Add another grid'}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-dashed border-brand-300 text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add another grid
          <span className="text-xs text-slate-400 font-normal">
            ({slots.length}/{MAX_BULK_FILES})
          </span>
        </button>

        <Button size="sm" variant="primary" onClick={handleStart} disabled={!canStart}>
          {startLabel}
        </Button>

        {!isRunning && incomplete && (
          <span className="text-xs text-amber-600">Add a company name and a file in every row to continue.</span>
        )}
        {isRunning && (
          <span className="text-xs text-slate-500">
            Files are processed one at a time. This can take a few minutes per file — keep this tab open.
          </span>
        )}
        {!isRunning && doneCount >= 2 && (
          <Button size="sm" onClick={handleOpenCombined} disabled={openedId === COMBINED_ID}>
            {openedId === COMBINED_ID ? 'Combined view shown below' : 'Combined view (sort by payout)'}
          </Button>
        )}
        {!isRunning && doneCount > 0 && (
          <span className="text-xs text-emerald-600">
            {doneCount} of {slots.length} extracted and saved to history.
          </span>
        )}
      </div>
    </div>
  );
}
