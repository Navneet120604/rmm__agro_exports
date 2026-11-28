import {
  add,
  childDocs,
  computeTotals,
  containerCount,
  CONTAINER_FIELDS,
  DOCS,
  formatAmount,
  getDoc,
  isDecimal,
  isPositive,
  lineAmount,
  mul,
  preCarriageFor,
  preCarriageReplaceable,
  round,
  statusLabel,
  VALUE_SUMMARY_FIELDS,
  valueTerm,
  chargesRequired,
  type DocDef,
  type EntityDef,
  type LiveRatesResponse,
} from '@rmm/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, FileText, History, Lock, Package, Pencil, Plus, Printer, Save, Ship, Trash2, Unlock } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { DocNumberInput } from '../components/DocNumberInput';
import { EntityForm, type Values } from '../components/EntityForm';
import { DraftBanner, UndoRedo } from '../components/FormCacheBar';
import { SuggestInput, type SuggestSource } from '../components/SuggestInput';
import { ReceiptsPanel } from '../components/ReceiptsPanel';
import { RefSelect } from '../components/RefSelect';
import { ConfirmDialog, Modal, UnsavedDialog } from '../components/Modal';
import { Badge, Button, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useFormCache } from '../lib/formCache';
import { useHotkeys } from '../lib/hotkeys';
import { useUnsavedGuard } from '../lib/useUnsavedGuard';
import { showError } from '../lib/notify';
import { useSession } from '../lib/session';
import { STATUS_TONE } from './DocumentListPage';

type Labels = Record<string, string | null | undefined>;
interface Line extends Values {
  _key: string;
  _labels: Labels;
}
interface Term {
  _key: string;
  tcTemplateId: string | null;
  content: string;
}
interface Container extends Values {
  _key: string;
}
interface Child {
  doc: keyof typeof DOCS;
  rows: { id: string; documentNumber: string; documentDate: string; status: string; totalQuantityMt: string }[];
  usedMt: string;
  remainingMt: string;
}
interface LetterChild {
  doc: keyof typeof DOCS;
  label: string;
  plural: string;
  module: string;
  rows: { id: string; documentNumber: string; documentDate: string; status: string }[];
}
type Loaded = Values & { id?: string; version?: number; lines: Values[]; terms: Values[]; containers: Values[]; children?: Child[]; letterChildren?: LetterChild[]; updatedAt?: string; amountInWords?: string; intake?: { id: string; fileId: string; fileName: string } };

let seq = 0;
const key = () => `k${++seq}`;
const asEntity = (k: string, fields: DocDef['header']) => ({ key: k, fields }) as unknown as EntityDef;
const labelsOf = (fields: DocDef['header'], src: Values): Labels => Object.fromEntries(fields.filter((f) => f.type === 'ref' || f.type === 'doc').map((f) => [f.name, (src[`${f.name}Label`] as string) ?? null]));

/** Splits a T&C template body into one term per line, dropping leading numbering. */
const splitTerms = (body: string) =>
  body
    .split(/\r?\n/)
    .map((x) => x.replace(/^\s*(\d+|[a-z])[.)]\s+/i, '').trim())
    .filter(Boolean);

export function DocumentFormPage() {
  const { doc = '', id = 'new' } = useParams();
  const [params] = useSearchParams();
  const def = getDoc(doc);
  if (!def) return <div className="p-6"><ErrorBox error={new Error(`Unknown document type: ${doc}`)} /></div>;
  const from = params.get('from') ?? '';
  const shipment = params.get('shipment') ?? '';
  // a new order filled from a buyer PO / PI in the document inbox
  const intake = def.key === 'proformaInvoices' && id === 'new' ? (params.get('intake') ?? '') : '';
  return <DocumentForm key={`${def.key}-${id}-${from}-${shipment}-${intake}`} def={def} id={id} from={from} shipment={shipment} intake={intake} />;
}

function DocumentForm({ def, id, from, shipment, intake }: { def: DocDef; id: string; from: string; shipment: string; intake: string }) {
  const isNew = id === 'new';
  const { can } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const containersTouched = useRef(false); // true once the user types their own container count

  const [header, setHeader] = useState<Values>({});
  const [labels, setLabels] = useState<Labels>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<unknown>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<{ group: number | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(true);
  const intakePrefilled = useRef(false);

  const draftQuery = from ? `?from=${from}` : shipment ? `?shipment=${shipment}` : '';
  const source = useQuery({
    queryKey: ['documents', def.key, 'one', id, from, shipment, intake],
    queryFn: () => api.get<Loaded>(intake ? `/intake/${intake}/order-draft` : isNew ? `/documents/${def.key}/draft${draftQuery}` : `/documents/${def.key}/${id}`),
    refetchOnWindowFocus: false,
    staleTime: 0, // always revalidate the single document on open, so a reopen never shows a stale cached copy
  });
  const record = source.data;
  const seededStamp = useRef(0); // which server snapshot (dataUpdatedAt) local state currently mirrors

  // Seed local state from the server on first load, and RE-seed whenever a newer server snapshot
  // arrives while the user has no unsaved edits. Without the re-seed, a background refetch updated the
  // query cache but the form kept showing the copy captured at mount (the "reopen shows old data" bug).
  useEffect(() => {
    if (!record) return;
    if (loaded && (dirty || source.dataUpdatedAt === seededStamp.current)) return;
    const h: Values = {};
    for (const f of def.header) {
      const raw = record[f.name];
      // A stored select value that is no longer one of the options (e.g. an old free-text pre-carriage)
      // would fail validation on save — show it blank so the user re-picks instead of being blocked.
      h[f.name] = f.type === 'select' && raw != null && !f.options?.includes(raw as string) ? null : raw ?? (f.type === 'boolean' ? false : null);
    }
    setHeader(h);
    setLabels(labelsOf(def.header, record));
    setLines(withGroups(def, record.lines));
    // A saved count that differs from the auto value was a manual override — keep it, don't recompute.
    containersTouched.current = record.noOfContainers != null && String(record.noOfContainers) !== String(containerCount(record.lines));
    setTerms(record.terms.map((t) => ({ _key: key(), tcTemplateId: (t.tcTemplateId as string) ?? null, content: String(t.content) })));
    setContainers(record.containers.map((c) => ({ ...c, _key: key() })));
    seededStamp.current = source.dataUpdatedAt;
    if (!loaded) {
      setLoaded(true);
      setTimeout(() => root.current?.querySelector<HTMLElement>('[data-nav]')?.focus(), 0);
    }
  }, [record, loaded, dirty, source.dataUpdatedAt, def]);

  const locked = !isNew && Boolean(record?.locked);
  const readOnly = isNew ? !can(def.module, 'create') : !can(def.module, 'edit') || locked;
  // same rule as the server: edit + delete rights on this document type
  const canLock = !isNew && can(def.module, 'edit') && can(def.module, 'delete');
  const back = () => navigate(`/d/${def.key}`);
  const touch = () => setDirty(true);
  const blocker = useUnsavedGuard(dirty);

  const cache = useFormCache({
    storageKey: readOnly ? null : `doc:${def.key}:${id}:${from}${intake ? `:intake:${intake}` : ''}`,
    snapshot: { header, labels, lines, terms, containers },
    apply: (s) => {
      setHeader(s.header);
      setLabels(s.labels);
      setLines(s.lines);
      setTerms(s.terms);
      setContainers(s.containers);
      setDirty(true);
    },
    ready: loaded,
    dirty,
    enabled: !readOnly,
    serverStamp: record?.updatedAt ? Date.parse(String(record.updatedAt)) : null,
  });

  const toggleLock = async () => {
    try {
      await api.post(`/documents/${def.key}/${id}/lock`, { locked: !locked });
      toast.success(locked ? `${def.label} unlocked` : `${def.label} locked`);
      qc.invalidateQueries({ queryKey: ['documents'] });
      setLoaded(false);
      await source.refetch();
    } catch (e) {
      showError(e);
    }
  };

  // ---------------------------------------------------------------- auto-fill from masters
  const liveRates = useQuery({ queryKey: ['exchange-rates'], queryFn: () => api.get<LiveRatesResponse>('/exchange-rates'), staleTime: 60_000, enabled: can('master.currencies', 'view') });

  const setField = (name: string, value: unknown, label?: string | null) => {
    setHeader((s) => ({ ...s, [name]: value }));
    if (label !== undefined) setLabels((s) => ({ ...s, [name]: label }));
  };

  const applyCurrency = async (currencyId: string | null, code: string | null) => {
    setRateNote(null);
    if (!currencyId) return;
    if (code === 'INR') {
      setField('exchangeRate', '1');
      return;
    }
    const live = liveRates.data?.rates.find((r) => r.code === code);
    if (live) {
      setField('exchangeRate', round(live.rateToInr, 4));
      setRateNote(`Live rate ${live.rateToInr} (${live.source}, ${live.rateDate}). Change it if your bank rate differs.`);
      return;
    }
    try {
      const cur = await api.get<Values>(`/masters/currencies/${currencyId}`);
      if (cur.exchangeRate) {
        setField('exchangeRate', String(cur.exchangeRate));
        setRateNote('No live rate for this currency: using the default rate from the currency master.');
      }
    } catch (e) {
      showError(e);
    }
  };

  const applyPaymentTerm = async (termId: string | null) => {
    if (!termId) return;
    try {
      const t = await api.get<Values>(`/masters/paymentTerms/${termId}`);
      setField('paymentTerms', (t.printText as string) || (t.name as string));
    } catch (e) {
      showError(e);
    }
  };

  /** Buyer defaults fill only the fields that are still empty. */
  const applyBuyer = async (buyerId: string | null) => {
    if (!buyerId) return;
    try {
      const c = await api.get<Values>(`/masters/customers/${buyerId}`);
      const fill: [string, string, string | null][] = [
        ['currencyId', 'defaultCurrencyId', null],
        ['paymentTermId', 'paymentTermId', null],
        ['portOfDischargeId', 'defaultPortId', null],
        ['destinationCountryId', 'countryId', null],
      ];
      const h = header;
      for (const [field, from] of fill) {
        if (!def.header.some((f) => f.name === field) || h[field] || !c[from]) continue;
        setField(field, c[from], (c[`${from}Label`] as string) ?? null);
        if (field === 'currencyId') await applyCurrency(c[from] as string, (c[`${from}Label`] as string) ?? null);
        if (field === 'paymentTermId' && !h.paymentTerms) await applyPaymentTerm(c[from] as string);
      }
      if (c.incoterm && ['FOB', 'CFR', 'CIF'].includes(c.incoterm as string) && h.incoterm === 'FOB') setField('incoterm', c.incoterm);
    } catch (e) {
      showError(e);
    }
  };

  useEffect(() => {
    if (!intake || !loaded || intakePrefilled.current || (can('master.currencies', 'view') && liveRates.isLoading)) return;
    intakePrefilled.current = true;
    (async () => {
      if (header.currencyId && !header.exchangeRate) await applyCurrency(header.currencyId as string, labels.currencyId ?? null);
      if (header.buyerId) await applyBuyer(header.buyerId as string);
      setDirty(true); // nothing is saved yet: leaving asks first
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake, loaded, liveRates.isLoading]);

  const onHeaderChange = (name: string, v: unknown, l?: string | null) => {
    setField(name, v, l);
    if (name === 'noOfContainers') containersTouched.current = true;
    setErrors((s) => {
      if (!s[name]) return s;
      const n = { ...s };
      delete n[name];
      return n;
    });
    touch();
    if (name === 'buyerId') void applyBuyer(v as string | null);
    if (name === 'currencyId') void applyCurrency(v as string | null, l ?? null);
    if (name === 'paymentTermId') void applyPaymentTerm(v as string | null);
    if (name === 'placeOfPreReceipt' && def.header.some((f) => f.name === 'preCarriageBy')) {
      // ICD → RAIL, Mundra / Kandla → ROAD; a mode typed by hand is left alone
      const mode = preCarriageFor(v);
      if (mode) setHeader((s) => (preCarriageReplaceable(s.preCarriageBy) && s.preCarriageBy !== mode ? { ...s, preCarriageBy: mode } : s));
    }
    if (isNew && def.parent && name === def.parent.field && v) {
      // generate against the chosen parent: reload the draft with its remaining quantities
      navigate(`/d/${def.key}/new?from=${v}`, { replace: true });
    }
  };

  // ---------------------------------------------------------------- totals (same code as the server)
  const totals = useMemo(() => {
    try {
      const ok = lines.every((l) => isDecimal(String(l.quantityMt ?? '0')) && (l.ratePerMt == null || l.ratePerMt === '' || isDecimal(String(l.ratePerMt))));
      return ok ? computeTotals(def, header, lines) : null;
    } catch {
      return null;
    }
  }, [def, header, lines]);

  // Keep the container count auto-filled from the products until the user types their own.
  useEffect(() => {
    if (readOnly || def.key !== 'commercialInvoices' || containersTouched.current) return;
    const n = containerCount(lines);
    if (n && String(header.noOfContainers ?? '') !== String(n)) setField('noOfContainers', n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, readOnly]);

  // ---------------------------------------------------------------- save
  const payload = () => {
    const body: Values = {};
    for (const f of def.header) body[f.name] = header[f.name];
    body.lines = lines.map((l) => {
      const x: Values = { sourceLineId: l.sourceLineId ?? null };
      for (const f of def.lines) x[f.name] = l[f.name];
      return x;
    });
    body.terms = terms.filter((t) => t.content.trim()).map((t) => ({ tcTemplateId: t.tcTemplateId, content: t.content }));
    body.containers = containers.map((c) => Object.fromEntries(CONTAINER_FIELDS.map((f) => [f.name, c[f.name]])));
    if (!isNew) body.version = record!.version;
    return body;
  };

  const save = async (opts?: { stay?: boolean }): Promise<boolean> => {
    if (readOnly || saving) return false;
    setSaving(true);
    setErrors({});
    setLineErrors({});
    setFormError(null);
    try {
      const saved = isNew ? await api.post<Loaded>(`/documents/${def.key}`, payload()) : await api.put<Loaded>(`/documents/${def.key}/${id}`, payload());
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['lookup', 'document'] });
      toast.success(`${def.label} ${saved.documentNumber} saved`);
      setDirty(false);
      cache.clear();
      if (isNew && intake) {
        try {
          await api.post(`/intake/${intake}/order`, { orderId: saved.id });
          qc.invalidateQueries({ queryKey: ['inbox'] });
        } catch (e) {
          showError(e);
        }
        if (!opts?.stay) navigate(`/orders/${saved.id}`, { replace: true });
      } else if (isNew) {
        // created from a shipment lot: link it back so it shows on the lot + pipeline, then return there
        if (shipment && def.key === 'commercialInvoices') {
          try {
            await api.post(`/shipments/${shipment}/link-invoice`, { commercialInvoiceId: saved.id });
          } catch (e) {
            showError(e);
          }
        }
        // `stay` (guard-triggered save): don't navigate here — the guard proceeds to the user's destination.
        if (!opts?.stay) {
          const piId = (saved as Record<string, unknown>).proformaInvoiceId as string | undefined;
          if (shipment && def.key === 'commercialInvoices') navigate(piId ? `/plan/${piId}` : `/d/${def.key}/${saved.id}`, { replace: true });
          else navigate(`/d/${def.key}/${saved.id}`, { replace: true });
        }
      } else if (!opts?.stay) {
        setLoaded(false);
        await source.refetch();
      }
      return true;
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fields).length) {
        const h: Record<string, string> = {};
        const le: Record<number, string> = {};
        for (const [k, msg] of Object.entries(e.fields)) {
          const m = /^lines\.(\d+)\./.exec(k);
          if (m) le[Number(m[1])] = msg;
          else h[k.replace(/^header\./, '')] = msg;
        }
        setErrors(h);
        setLineErrors(le);
        const first = Object.keys(h)[0];
        if (first) document.getElementById(`f-${first}`)?.focus();
      }
      setFormError(e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Guard dialog (Save / Don't save / Cancel) when leaving with unsaved changes.
  const guardSave = async () => {
    const ok = await save({ stay: true });
    if (ok) blocker.proceed?.();
    else blocker.reset?.(); // save failed: stay on the page so the errors can be fixed
  };

  const remove = async (reason: string) => {
    await api.del(`/documents/${def.key}/${id}`, { reason });
    qc.invalidateQueries({ queryKey: ['documents'] });
    toast.success(`${def.label} ${record?.documentNumber} deleted`);
    setDirty(false); // don't let the unsaved-changes guard fire on the way out
    back();
  };

  const openPdf = (kind: 'pdf' | 'packing-list.pdf') => {
    if (dirty) return showError(new Error('Save your changes first, then print.'));
    window.open(`/api/documents/${def.key}/${id}/${kind}`, '_blank', 'noopener');
  };

  useHotkeys(
    {
      'mod+s, mod+enter': () => save(),
      'alt+a': () => !readOnly && setEditing({ group: null }),
      'mod+p': () => (!isNew && can(def.module, 'print') ? openPdf('pdf') : window.print()),
      esc: () => (editing ? setEditing(null) : back()),
    },
    [header, lines, terms, containers, dirty, saving, record, editing],
    { inInputs: true },
  );

  if (source.isLoading) return <Spinner />;
  if (source.error) {
    return (
      <div className="space-y-3 p-6">
        <ErrorBox error={source.error} />
        <Button onClick={back}>Back to {def.plural.toLowerCase()}</Button>
      </div>
    );
  }

  const currency = labels.currencyId ?? '';
  const title = isNew ? `New ${def.label.toLowerCase()}` : `${def.label} ${record?.documentNumber ?? ''}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col" ref={root} data-form-root>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <button type="button" tabIndex={-1} onClick={back} className="rounded p-0.5 text-slate-400 hover:bg-slate-100" aria-label="Back">
              <ArrowLeft className="size-4" />
            </button>
            {title}
            {!isNew && <Badge tone={STATUS_TONE[String(header.status)] ?? 'slate'}>{statusLabel(String(header.status ?? ''))}</Badge>}
            {locked && (
              <Badge tone="amber">
                <Lock className="mr-1 inline size-3" /> Locked
              </Badge>
            )}
            {readOnly && !locked && <Badge>Read only</Badge>}
          </span>
        }
        subtitle={def.plural}
        actions={
          <>
            {!isNew && can('admin.audit', 'view') && (
              <Link to={`/admin/audit?entity=${def.key}&recordId=${id}`} className="inline-flex items-center gap-1 px-2 text-[12.5px] text-slate-500 hover:text-slate-800">
                <History className="size-3.5" /> History
              </Link>
            )}
            {!isNew && def.key === 'proformaInvoices' && (
              <Button onClick={() => navigate(`/orders/${id}`)}>Order file</Button>
            )}
            {!isNew && def.key === 'proformaInvoices' && can('sales.shipments', 'view') && (
              <Button icon={<Ship className="size-3.5" />} onClick={() => navigate(`/plan/${id}`)}>
                Plan shipments
              </Button>
            )}
            {!isNew && can(def.module, 'print') && (
              <>
                <Button icon={<Printer className="size-3.5" />} onClick={() => openPdf('pdf')} shortcut="mod+p">
                  Print PDF
                </Button>
                {def.containers && (
                  <Button icon={<Package className="size-3.5" />} onClick={() => openPdf('packing-list.pdf')}>
                    Packing list
                  </Button>
                )}
              </>
            )}
            {canLock && (
              <Button variant="ghost" icon={locked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />} onClick={toggleLock}>
                {locked ? 'Unlock' : 'Lock'}
              </Button>
            )}
            {record?.intake && (
              <Button icon={<FileText className="size-3.5" />} onClick={() => (window.matchMedia('(min-width: 1024px)').matches ? setShowSource((v) => !v) : window.open(`/api/files/${record.intake!.fileId}`, '_blank', 'noopener'))}>
                {showSource ? 'Hide' : 'Show'} the original
              </Button>
            )}
            {!readOnly && <UndoRedo cache={cache} />}
            {!isNew && can(def.module, 'delete') && !locked && (
              <Button variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            {!readOnly && (
              <Button variant="primary" data-nav-end icon={<Save className="size-3.5" />} loading={saving} onClick={() => save()} shortcut="mod+s">
                Save
              </Button>
            )}
          </>
        }
      />
      {record?.intake && showSource && (
        <aside className="fixed top-12 right-0 bottom-0 z-20 hidden w-[42vw] flex-col border-l border-slate-200 bg-white shadow-lg lg:flex print:hidden" aria-label="Original document">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-1.5 text-[12.5px] text-slate-600">
            <FileText className="size-3.5" />
            <span className="truncate">Read from: {record.intake.fileName}</span>
            <Link className="ml-auto text-brand-700 hover:underline" to={`/inbox/${record.intake.id}`}>
              Back to the review
            </Link>
          </div>
          <iframe title="Original document" src={`/api/files/${record.intake.fileId}`} className="min-h-0 flex-1" />
        </aside>
      )}
      <div className={`flex-1 overflow-y-auto p-3 sm:p-5 ${record?.intake && showSource ? 'lg:pr-[43vw]' : ''}`}>
        <div className="mx-auto max-w-6xl space-y-4">
          {formError != null && <ErrorBox error={formError} />}
          {record?.intake && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-[12.5px] text-slate-700">
              Filled from <b>{record.intake.fileName}</b>. Check everything against the original, complete what is missing, then save — the document is
              filed with this order. Values shown as <i>typed</i> are not in your masters; pick the master record or keep the text.
            </div>
          )}
          <DraftBanner cache={cache} />
          {!isNew && record?.children && <ChildrenPanel def={def} id={id} items={record.children} canCreate={(m) => can(m, 'create')} dirty={dirty} />}
          {!isNew && !!record?.letterChildren?.length && <LetterChildrenPanel id={id} items={record.letterChildren} canCreate={(m) => can(m, 'create')} dirty={dirty} />}
          <EntityForm
            def={asEntity(def.key, def.key === 'commercialInvoices' ? def.header.filter((f) => !(VALUE_SUMMARY_FIELDS as readonly string[]).includes(f.name)) : def.header)}
            values={header}
            labels={labels}
            errors={errors}
            readOnly={readOnly}
            onChange={onHeaderChange}
            suggestFrom={{ key: def.key, part: 'header' }}
            renderField={(f) =>
              f.name === 'documentNumber' ? (
                <DocNumberInput
                  docKey={def.key}
                  date={(header.documentDate as string) ?? null}
                  value={(header.documentNumber as string) ?? null}
                  onChange={(v) => onHeaderChange('documentNumber', v)}
                  readOnly={readOnly}
                  isNew={isNew}
                  invalid={!!errors.documentNumber}
                />
              ) : undefined
            }
          />
          {rateNote && <div className="-mt-2 text-[12px] text-slate-500">{rateNote}</div>}

          {!!def.lines.length && (
            <Section
              title={`Products (${groupIds(lines).length})${def.key === 'commercialInvoices' && containerCount(lines) ? ` · ~${containerCount(lines)} container${containerCount(lines) === 1 ? '' : 's'}` : ''}`}
              action={
                !readOnly && (
                  <Button icon={<Plus className="size-3.5" />} onClick={() => setEditing({ group: null })} shortcut="alt+a">
                    Add product
                  </Button>
                )
              }
            >
              <LinesTable
                def={def}
                lines={lines}
                currency={currency}
                errors={lineErrors}
                readOnly={readOnly}
                onEdit={(g) => setEditing({ group: g })}
                onRemove={(g) => {
                  setLines((s) => s.filter((l) => Number(l.packGroup) !== g));
                  touch();
                }}
                onMove={(g, d) => {
                  setLines((s) => moveGroup(s, g, d));
                  touch();
                }}
              />
              {errors.lines && <div className="mt-1 text-[12px] text-red-600">{errors.lines}</div>}
            </Section>
          )}

          {def.key === 'commercialInvoices' && (
            <ValueSummary header={header} totals={totals} currency={currency} readOnly={readOnly} errors={errors} onChange={(n, v) => onHeaderChange(n, v)} />
          )}

          {def.containers && (
            <Section title={`Containers (${containers.length}) · for the packing list`}>
              <ContainersEditor rows={containers} readOnly={readOnly} totalNetMt={totals?.totalQuantityMt} update={(fn) => (setContainers(fn), touch())} />
            </Section>
          )}

          {def.termsTable && (
            <Section title={`Terms & conditions (${terms.length})`}>
              <TermsEditor def={def} terms={terms} readOnly={readOnly} update={(fn) => (setTerms(fn), touch())} />
            </Section>
          )}

          {!!def.lines.length && <TotalsPanel def={def} totals={totals} currency={currency} words={!dirty ? record?.amountInWords : null} />}

          {def.key === 'commercialInvoices' && !isNew && <ReceiptsPanel invoiceId={id} />}

          <div className="flex flex-wrap items-center justify-between gap-2 pb-6 text-[12px] text-slate-500">
            <span className="max-sm:hidden">Enter = next field · Alt+A = add line · Ctrl+Z = undo · Ctrl+S = save · Ctrl+P = print · Ctrl+Shift+N = new</span>
            {record?.updatedAt && <span>Last changed {new Date(record.updatedAt).toLocaleString()} · v{record.version}</span>}
          </div>
        </div>
      </div>

      {editing && (
        <GroupEditor
          def={def}
          isNew={editing.group === null}
          rows={editing.group === null ? [] : lines.filter((l) => Number(l.packGroup) === editing.group)}
          onClose={() => setEditing(null)}
          onSave={(rows, again) => {
            setLines((s) => applyGroup(s, editing.group, rows));
            touch();
            if (again) setEditing({ group: null });
            else setEditing(null);
          }}
        />
      )}
      <UnsavedDialog
        open={blocker.state === 'blocked'}
        saving={saving}
        onSave={guardSave}
        onDiscard={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${def.label.toLowerCase()} ${record?.documentNumber ?? ''}?`}
        message="It disappears from lists and reports; the audit log keeps who deleted it and why. To keep it on record, set the status to Cancelled instead."
        confirmLabel="Delete"
        danger
        requireReason
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}

function blankLine(def: DocDef): Line {
  const l: Line = { _key: key(), _labels: {}, sourceLineId: null };
  for (const f of def.lines) l[f.name] = f.default ?? (f.type === 'boolean' ? false : null);
  return l;
}

// ---------------------------------------------------------------- packing groups
// Packing rows that belong to the same product card share a `packGroup` number.
// Fields that describe the product (not the packing) are the same across the group.
const SHARED_LINE_FIELDS = ['productId', 'productIdText', 'brand', 'cropYear', 'specifications'];

/** Give loaded lines stable client group numbers (existing single lines stay separate). */
function withGroups(def: DocDef, rows: Values[]): Line[] {
  let next = 1;
  const map = new Map<number, number>();
  return rows.map((l) => {
    const raw = Number(l.packGroup) || 0;
    let g: number;
    if (raw > 0) {
      if (!map.has(raw)) map.set(raw, next++);
      g = map.get(raw)!;
    } else g = next++;
    return { ...l, packGroup: g, _key: key(), _labels: labelsOf(def.lines, l) };
  });
}

/** Group numbers in first-appearance order. */
const groupIds = (ls: Line[]): number[] => [...new Set(ls.map((l) => Number(l.packGroup) || 0))];
const nextGroup = (ls: Line[]): number => (ls.length ? Math.max(...ls.map((l) => Number(l.packGroup) || 0)) + 1 : 1);

/** Replace (or add) all the rows of one product group, keeping the group's place. */
function applyGroup(ls: Line[], group: number | null, rows: Line[]): Line[] {
  if (group === null) {
    const g = nextGroup(ls);
    return [...ls, ...rows.map((r) => ({ ...r, packGroup: g }))];
  }
  const out: Line[] = [];
  let done = false;
  for (const l of ls) {
    if (Number(l.packGroup) === group) {
      if (!done) {
        out.push(...rows.map((r) => ({ ...r, packGroup: group })));
        done = true;
      }
    } else out.push(l);
  }
  if (!done) out.push(...rows.map((r) => ({ ...r, packGroup: group })));
  return out;
}

/** Move a whole product group up or down past its neighbour. */
function moveGroup(ls: Line[], group: number, dir: 1 | -1): Line[] {
  const ids = groupIds(ls);
  const i = ids.indexOf(group);
  const j = i + dir;
  if (j < 0 || j >= ids.length) return ls;
  const order = [...ids];
  [order[i], order[j]] = [order[j], order[i]];
  return order.flatMap((g) => ls.filter((l) => Number(l.packGroup) === g));
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
        <h2 className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">{title}</h2>
        {action}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- lines (grouped by product)
function LinesTable({
  def,
  lines,
  currency,
  errors,
  readOnly,
  onEdit,
  onRemove,
  onMove,
}: {
  def: DocDef;
  lines: Line[];
  currency: string;
  errors: Record<number, string>;
  readOnly: boolean;
  onEdit: (g: number) => void;
  onRemove: (g: number) => void;
  onMove: (g: number, d: 1 | -1) => void;
}) {
  if (!lines.length) return <div className="py-6 text-center text-[13px] text-slate-500">No products yet. Press Alt+A or “Add product”.</div>;
  const showRate = def.lines.some((f) => f.name === 'ratePerMt');
  const ids = groupIds(lines);
  const flat = new Map(lines.map((l, i) => [l._key, i]));
  const num = (v: unknown) => (isDecimal(String(v ?? '0')) ? String(v) : '0');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11.5px] text-slate-500 uppercase">
            <th className="w-8 py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Description of goods</th>
            <th className="py-1.5 pr-2">HS code</th>
            <th className="py-1.5 pr-2 text-right">Bags</th>
            <th className="py-1.5 pr-2 text-right">Net (MT)</th>
            {showRate && <th className="py-1.5 pr-2 text-right">Rate {currency}</th>}
            {showRate && <th className="py-1.5 pr-2 text-right">Amount</th>}
            <th className="w-28" />
          </tr>
        </thead>
        <tbody>
          {ids.map((g, gi) => {
            const rows = lines.filter((l) => Number(l.packGroup) === g);
            const multi = rows.length > 1;
            const err = rows.some((r) => errors[flat.get(r._key)!]);
            const gNet = safe(() => formatAmount(add(rows.map((r) => num(r.quantityMt)), 3), 3));
            const gBags = rows.reduce((a, r) => a + (Number(r.noOfBags) || 0), 0);
            const gAmt = safe(() => formatAmount(add(rows.map((r) => safe(() => lineAmount(r))), 2)));
            return (
              <Fragment key={g}>
                <tr className={`border-b border-slate-100 align-top ${err ? 'bg-red-50' : ''}`} onDoubleClick={() => !readOnly && onEdit(g)}>
                  <td className="py-1.5 pr-2 text-slate-400 tabular-nums">{gi + 1}</td>
                  <td className="py-1.5 pr-2">
                    <div className="font-medium text-slate-900">{rows[0]._labels.productId ?? ((rows[0].productIdText as string) || '—')}</div>
                    {multi && <div className="text-[12px] text-slate-500">{rows.length} packings</div>}
                    {!multi && Boolean(rows[0].packingText || rows[0]._labels.packingTypeId || rows[0].packingTypeIdText) && (
                      <div className="text-[12px] whitespace-pre-line text-slate-500">{String(rows[0].packingText || rows[0]._labels.packingTypeId || rows[0].packingTypeIdText)}</div>
                    )}
                    {err && <div className="text-[12px] text-red-600">Check the highlighted packing rows.</div>}
                  </td>
                  <td className="py-1.5 pr-2 text-slate-600">{multi ? '' : safe(() => String(rows[0].hsCode ?? '—'))}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{multi ? gBags : String(rows[0].noOfBags ?? 0)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{multi ? gNet : safe(() => formatAmount(num(rows[0].quantityMt), 3))}</td>
                  {showRate && <td className="py-1.5 pr-2 text-right tabular-nums">{multi ? '' : safe(() => formatAmount(num(rows[0].ratePerMt)))}</td>}
                  {showRate && <td className="py-1.5 pr-2 text-right font-medium tabular-nums">{gAmt}</td>}
                  <td className="py-1 text-right whitespace-nowrap">
                    {!readOnly && (
                      <>
                        <IconBtn label="Move up" onClick={() => onMove(g, -1)} icon={<ArrowUp className="size-3.5" />} />
                        <IconBtn label="Move down" onClick={() => onMove(g, 1)} icon={<ArrowDown className="size-3.5" />} />
                        <IconBtn label="Edit product" onClick={() => onEdit(g)} icon={<Pencil className="size-3.5" />} />
                        <IconBtn label="Remove product" onClick={() => onRemove(g)} icon={<Trash2 className="size-3.5" />} danger />
                      </>
                    )}
                  </td>
                </tr>
                {multi &&
                  rows.map((r) => (
                    <tr key={r._key} className={`border-b border-slate-50 align-top text-[12.5px] ${errors[flat.get(r._key)!] ? 'bg-red-50' : ''}`}>
                      <td />
                      <td className="py-1 pr-2 pl-3 text-slate-600">
                        <span className="text-slate-400">↳ </span>
                        {String(r.packingText || r._labels.packingTypeId || r.packingTypeIdText || 'Packing')}
                      </td>
                      <td className="py-1 pr-2 text-slate-600">{safe(() => String(r.hsCode ?? '—'))}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{String(r.noOfBags ?? 0)}</td>
                      <td className="py-1 pr-2 text-right tabular-nums">{safe(() => formatAmount(num(r.quantityMt), 3))}</td>
                      {showRate && <td className="py-1 pr-2 text-right tabular-nums">{safe(() => formatAmount(num(r.ratePerMt)))}</td>}
                      {showRate && <td className="py-1 pr-2 text-right tabular-nums">{safe(() => formatAmount(lineAmount(r)))}</td>}
                      <td />
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const safe = (fn: () => string) => {
  try {
    return fn();
  } catch {
    return '—';
  }
};

function IconBtn({ label, icon, onClick, danger }: { label: string; icon: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`rounded p-1 text-slate-400 hover:bg-slate-100 ${danger ? 'hover:text-red-600' : 'hover:text-slate-700'}`}>
      {icon}
    </button>
  );
}

/**
 * Add / edit one product and its packing rows. One product can ship in several packings
 * (e.g. 1000 MT in 30 kg bags + 500 MT in 20 kg bags); each packing keeps its own HS code,
 * quantity, rate and amount, and is stored as its own row so reports can total by packing.
 */
function GroupEditor({ def, rows, isNew, onClose, onSave }: { def: DocDef; rows: Line[]; isNew: boolean; onClose: () => void; onSave: (rows: Line[], again: boolean) => void }) {
  const showRate = def.lines.some((f) => f.name === 'ratePerMt');
  const rateRequired = def.lines.find((f) => f.name === 'ratePerMt')?.required ?? false;
  const base = rows[0] ?? blankLine(def);
  const [shared, setShared] = useState<Values>(() => ({
    productId: base.productId ?? null,
    productIdText: base.productIdText ?? null,
    brand: base.brand ?? null,
    cropYear: base.cropYear ?? null,
    specifications: base.specifications ?? null,
  }));
  const [productLabel, setProductLabel] = useState<string | null>(base._labels?.productId ?? (base.productIdText as string | null) ?? null);
  /** "Used before" source for a product-line box. */
  const ls = (field: string): SuggestSource => ({ key: def.key, part: 'lines', field });
  const [packs, setPacks] = useState<Line[]>(() => (rows.length ? rows.map((r) => ({ ...r, _labels: { ...r._labels } })) : [blankLine(def)]));
  const [error, setError] = useState<string | null>(null);

  const setPack = (i: number, patch: Partial<Line>, labels?: Record<string, string | null>) =>
    setPacks((s) => s.map((p, j) => (j === i ? { ...p, ...patch, _labels: labels ? { ...p._labels, ...labels } : p._labels } : p)));

  /** From the packing master (net wt per bag + empty-bag weight): bags = net ÷ bag net, gross = net + bags × tare. */
  const bagCalc = (net: unknown, pkg: Values | undefined): Partial<Line> | null => {
    const q = String(net ?? '');
    if (!pkg || !isPositive(String(pkg.netWeightKg ?? '')) || !isDecimal(q) || !isPositive(q)) return null;
    const bags = Math.round((Number(q) * 1000) / Number(pkg.netWeightKg));
    const tareMt = mul(mul(String(bags), String(pkg.tareWeightKg ?? '0'), 6), '0.001', 3);
    return { noOfBags: bags, grossWtMt: add([q, tareMt], 3) };
  };

  // Preload the packing master for rows that already have a packing, so auto-calc works on edit.
  useEffect(() => {
    packs.forEach((p, i) => {
      if (p.packingTypeId && !(p as Values)._packing) {
        api.get<Values>(`/masters/packingTypes/${p.packingTypeId}`).then(
          (m) =>
            setPacks((s) =>
              s.map((r, j) =>
                j === i && !(r as Values)._packing
                  ? { ...r, _packing: m, containerCapacityMt: (r.containerCapacityMt as string) ?? (m.containerCapacityMt as string) ?? null }
                  : r,
              ),
            ),
          () => {},
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onProduct = async (v: string | null, l: string | null) => {
    setShared((s) => ({ ...s, productId: v }));
    setProductLabel(l);
    if (!v) return;
    try {
      const p = await api.get<Values>(`/masters/products/${v}`);
      setShared((s) => ({ ...s, cropYear: s.cropYear || p.cropYear || null }));
      // fill empty HS codes on the packing rows from the product
      setPacks((s) => s.map((row) => ({ ...row, hsCode: row.hsCode || (p.hsnCode as string) || null })));
    } catch (e) {
      showError(e);
    }
  };

  const onPacking = async (i: number, v: string | null, l: string | null) => {
    setPack(i, { packingTypeId: v }, { packingTypeId: l });
    if (!v) return;
    try {
      const p = await api.get<Values>(`/masters/packingTypes/${v}`);
      setPacks((s) =>
        s.map((row, j) => {
          if (j !== i) return row;
          const updated = {
            ...row,
            packingText: (row.packingText as string) || (p.description as string) || (p.name as string),
            containerCapacityMt: (p.containerCapacityMt as string) ?? (row.containerCapacityMt as string) ?? null,
            _packing: p,
          };
          const calc = bagCalc(row.quantityMt, p);
          return calc ? { ...updated, ...calc } : updated;
        }),
      );
    } catch (e) {
      showError(e);
    }
  };

  /** Bags = net ÷ bag net; gross = net + bags × empty-bag weight (uses the packing master). */
  const calc = async (i: number) => {
    const row = packs[i];
    const qty = String(row.quantityMt ?? '');
    if (!isDecimal(qty) || !isPositive(qty)) return setError('Enter the net weight (MT) on that packing first.');
    let p = (row as Values)._packing as Values | undefined;
    if (!p && typeof row.packingTypeId === 'string') p = await api.get<Values>(`/masters/packingTypes/${row.packingTypeId}`).catch(() => undefined);
    const net = String(p?.netWeightKg ?? '');
    if (!isPositive(net)) return setError('Choose a packing that has a net weight per bag first.');
    const bags = Math.round((Number(qty) * 1000) / Number(net));
    const tareMt = mul(mul(String(bags), String(p?.tareWeightKg ?? '0'), 6), '0.001', 3);
    setPack(i, { noOfBags: bags, grossWtMt: add([qty, tareMt], 3) });
    setError(null);
  };

  const submit = (again: boolean) => {
    if (!shared.productId && !shared.productIdText) {
      setError('Pick a product, or type one.');
      return;
    }
    for (const [i, p] of packs.entries()) {
      if (!isPositive(String(p.quantityMt ?? '0'))) return setError(`Packing ${i + 1}: enter a net weight above 0.`);
      if (rateRequired && !isPositive(String(p.ratePerMt ?? '0'))) return setError(`Packing ${i + 1}: enter a rate.`);
    }
    const out: Line[] = packs.map((p) => {
      const line = blankLine(def);
      for (const f of def.lines) {
        if (SHARED_LINE_FIELDS.includes(f.name)) line[f.name] = shared[f.name] ?? line[f.name];
        else if (f.name !== 'packGroup' && p[f.name] !== undefined) line[f.name] = p[f.name];
      }
      line.sourceLineId = p.sourceLineId ?? null;
      line._labels = { productId: productLabel, packingTypeId: (p._labels?.packingTypeId as string) ?? null };
      return line;
    });
    onSave(out, again);
  };

  const groupNet = safe(() => formatAmount(add(packs.map((p) => (isDecimal(String(p.quantityMt ?? '0')) ? String(p.quantityMt) : '0')), 3), 3));
  const groupAmt = safe(() => formatAmount(add(packs.map((p) => safe(() => lineAmount(p))), 2)));

  return (
    <Modal
      open
      title={isNew ? 'Add product' : 'Edit product'}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <>
          <span className="mr-auto text-[12px] tabular-nums text-slate-500">
            {packs.length} packing{packs.length === 1 ? '' : 's'} · {groupNet} MT{showRate ? ` · Amount ${groupAmt}` : ''}
          </span>
          <Button onClick={onClose}>Cancel</Button>
          {isNew && <Button onClick={() => submit(true)}>Save & add another</Button>}
          <Button variant="primary" onClick={() => submit(false)} data-nav-end>
            {isNew ? 'Add' : 'Update'}
          </Button>
        </>
      }
    >
      <div data-form-root className="max-h-[64vh] space-y-4 overflow-y-auto pr-1">
        {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[12.5px] text-red-700">{error}</div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <FieldLabel>Variety *</FieldLabel>
            <RefSelect
              entity="products"
              value={(shared.productId as string) ?? null}
              label={shared.productId ? productLabel : null}
              allowCreate
              onChange={(v, l) => void onProduct(v, l)}
              freeText={{
                value: (shared.productIdText as string | null) ?? null,
                onChange: (t) => {
                  setShared((s) => ({ ...s, productIdText: t }));
                  if (t) setProductLabel(t);
                },
                suggest: ls('productIdText'),
              }}
            />
          </div>
          <div>
            <FieldLabel>Brand</FieldLabel>
            <SuggestInput className="field-input" source={ls('brand')} value={(shared.brand as string) ?? ''} onValue={(v) => setShared((s) => ({ ...s, brand: v }))} placeholder="e.g. AL WALIMAH" />
          </div>
          <div>
            <FieldLabel>Crop year</FieldLabel>
            <SuggestInput className="field-input" source={ls('cropYear')} value={(shared.cropYear as string) ?? ''} onValue={(v) => setShared((s) => ({ ...s, cropYear: v }))} />
          </div>
          <div className="sm:col-span-4">
            <FieldLabel>Description / specification</FieldLabel>
            <SuggestInput
              multiline
              rows={2}
              className="field-input resize-y"
              source={ls('specifications')}
              value={(shared.specifications as string) ?? ''}
              onValue={(v) => setShared((s) => ({ ...s, specifications: v }))}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">Packing rows</h3>
            <Button icon={<Plus className="size-3.5" />} onClick={() => setPacks((s) => [...s, blankLine(def)])}>
              Add packing
            </Button>
          </div>
          {packs.map((p, i) => (
            <div key={p._key} className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11.5px] font-medium text-slate-500">Packing {i + 1}</span>
                {packs.length > 1 && <IconBtn label="Remove packing" onClick={() => setPacks((s) => s.filter((_, j) => j !== i))} icon={<Trash2 className="size-3.5" />} danger />}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                  <FieldLabel>Packing type</FieldLabel>
                  <RefSelect
                    entity="packingTypes"
                    value={(p.packingTypeId as string) ?? null}
                    label={p.packingTypeId ? ((p._labels?.packingTypeId as string) ?? null) : null}
                    allowCreate
                    onChange={(v, l) => void onPacking(i, v, l)}
                    freeText={{
                      value: (p.packingTypeIdText as string | null) ?? null,
                      // clearing the text (a record was picked) must not wipe the picked record's label
                      onChange: (t) => setPack(i, { packingTypeIdText: t }, t ? { packingTypeId: t } : undefined),
                      suggest: ls('packingTypeIdText'),
                    }}
                  />
                  {(p as Values)._packing
                    ? (() => {
                        const pk = p._packing as Values;
                        const rice = Number(pk.netWeightKg ?? 0);
                        const bag = Number(pk.tareWeightKg ?? 0);
                        const kg = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 });
                        return (
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            1 bag = {kg(rice)} kg rice + {kg(bag)} kg bag = <b className="text-slate-500">{kg(rice + bag)} kg gross</b>
                            {pk.containerCapacityMt ? ` · ${kg(Number(pk.containerCapacityMt))} MT per container` : ''} · bags, gross &amp; containers auto
                          </p>
                        );
                      })()
                    : null}
                </div>
                <div className="col-span-2">
                  <FieldLabel>Packing details (printed)</FieldLabel>
                  <SuggestInput className="field-input" source={ls('packingText')} value={(p.packingText as string) ?? ''} onValue={(v) => setPack(i, { packingText: v })} placeholder="e.g. 30 KG BOPP bags" />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <FieldLabel>Extra printed note (optional)</FieldLabel>
                  <SuggestInput className="field-input" source={ls('packingNote')} value={(p.packingNote as string) ?? ''} onValue={(v) => setPack(i, { packingNote: v })} placeholder="extra line printed under this packing" />
                </div>
                <div>
                  <FieldLabel>HS code</FieldLabel>
                  <SuggestInput className="field-input" source={ls('hsCode')} value={(p.hsCode as string) ?? ''} onValue={(v) => setPack(i, { hsCode: v })} />
                </div>
                <div>
                  <FieldLabel>Bags</FieldLabel>
                  <input className="field-input text-right tabular-nums" inputMode="numeric" value={String(p.noOfBags ?? '')} onChange={(e) => setPack(i, { noOfBags: e.target.value === '' ? 0 : Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Net weight (MT) *</FieldLabel>
                  <input
                    className="field-input text-right tabular-nums"
                    inputMode="decimal"
                    value={String(p.quantityMt ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPacks((s) =>
                        s.map((row, j) => {
                          if (j !== i) return row;
                          const updated = { ...row, quantityMt: val };
                          const auto = bagCalc(val, (row as Values)._packing as Values | undefined);
                          return auto ? { ...updated, ...auto } : updated;
                        }),
                      );
                    }}
                  />
                </div>
                <div>
                  <FieldLabel>Gross weight (MT)</FieldLabel>
                  <input className="field-input text-right tabular-nums" inputMode="decimal" value={String(p.grossWtMt ?? '')} onChange={(e) => setPack(i, { grossWtMt: e.target.value })} />
                </div>
                {showRate && (
                  <div>
                    <FieldLabel>Rate per MT{rateRequired ? ' *' : ''}</FieldLabel>
                    <SuggestInput
                      className="field-input text-right tabular-nums"
                      inputMode="decimal"
                      source={ls('ratePerMt')}
                      value={String(p.ratePerMt ?? '')}
                      onValue={(v) => setPack(i, { ratePerMt: v })}
                    />
                  </div>
                )}
                <div className="flex items-end justify-between gap-2 sm:col-span-3">
                  <Button onClick={() => void calc(i)} title="Bags & gross weight from the packing master for this net weight">
                    Calculate bags & gross
                  </Button>
                  {showRate && <span className="text-[12px] tabular-nums text-slate-500">Amount {safe(() => formatAmount(lineAmount(p)))}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-[12.5px] font-medium text-slate-600">{children}</label>;
}

// ---------------------------------------------------------------- terms
function TermsEditor({ def, terms, readOnly, update }: { def: DocDef; terms: Term[]; readOnly: boolean; update: (fn: (t: Term[]) => Term[]) => void }) {
  const templates = useQuery({
    queryKey: ['masters', 'tcTemplates', 'for', def.tcDocType],
    queryFn: () => api.get<{ rows: Values[] }>('/masters/tcTemplates?pageSize=500&status=active'),
    enabled: !readOnly,
  });
  const usable = (templates.data?.rows ?? []).filter((t) => t.docType === def.tcDocType || t.docType === 'General');
  // distinct standard terms from every usable template, in order
  const available: { templateId: string; content: string }[] = [];
  const seen = new Set<string>();
  for (const tpl of usable) {
    for (const content of splitTerms(String(tpl.body))) {
      const k = content.trim().toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        available.push({ templateId: tpl.id as string, content });
      }
    }
  }
  const has = (content: string) => terms.some((t) => t.content.trim().toLowerCase() === content.trim().toLowerCase());
  const toggle = (templateId: string, content: string) =>
    update((ts) => (has(content) ? ts.filter((t) => t.content.trim().toLowerCase() !== content.trim().toLowerCase()) : [...ts, { _key: key(), tcTemplateId: templateId, content }]));
  const edit = (i: number, content: string) => update((ts) => ts.map((t, j) => (j === i ? { ...t, content } : t)));
  const move = (i: number, d: number) =>
    update((ts) => {
      const j = i + d;
      if (j < 0 || j >= ts.length) return ts;
      const n = [...ts];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <div className="space-y-3">
      {!readOnly && available.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wide text-slate-500 uppercase">Standard terms — tick to include</span>
            <button type="button" className="text-[11.5px] text-brand-700 hover:underline" onClick={() => update((ts) => [...ts.filter((t) => !available.some((a) => a.content.trim().toLowerCase() === t.content.trim().toLowerCase())), ...available.map((a) => ({ _key: key(), tcTemplateId: a.templateId, content: a.content }))])}>
              Select all
            </button>
          </div>
          <div className="space-y-1.5">
            {available.map((a) => (
              <label key={a.content} className="flex cursor-pointer items-start gap-2 text-[13px]">
                <input type="checkbox" className="mt-[3px] size-4 shrink-0 accent-brand-700" checked={has(a.content)} onChange={() => toggle(a.templateId, a.content)} />
                <span className={has(a.content) ? 'text-slate-900' : 'text-slate-600'}>{a.content}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {terms.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11.5px] font-semibold tracking-wide text-slate-500 uppercase">Included on this document ({terms.length}) — drag order, edit or remove</span>
          {terms.map((t, i) => (
            <div key={t._key} className="flex items-start gap-2">
              <span className="w-5 pt-1.5 text-right text-[12px] text-slate-400 tabular-nums">{i + 1}.</span>
              <textarea className="field-input min-h-[34px] flex-1 resize-y" rows={1} value={t.content} disabled={readOnly} onChange={(e) => edit(i, e.target.value)} aria-label={`Term ${i + 1}`} />
              {!readOnly && (
                <span className="flex shrink-0">
                  <IconBtn label="Move up" onClick={() => move(i, -1)} icon={<ArrowUp className="size-3.5" />} />
                  <IconBtn label="Move down" onClick={() => move(i, 1)} icon={<ArrowDown className="size-3.5" />} />
                  <IconBtn label="Remove term" onClick={() => update((ts) => ts.filter((_, j) => j !== i))} icon={<Trash2 className="size-3.5" />} danger />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {!terms.length && !available.length && <div className="text-[13px] text-slate-500">No terms yet. Add your own below, or create templates in Masters → T&C templates.</div>}
      {!readOnly && (
        <Button icon={<Plus className="size-3.5" />} onClick={() => update((ts) => [...ts, { _key: key(), tcTemplateId: null, content: '' }])}>
          Add custom term
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- containers
function ContainersEditor({ rows, readOnly, totalNetMt, update }: { rows: Container[]; readOnly: boolean; totalNetMt?: string; update: (fn: (r: Container[]) => Container[]) => void }) {
  const set = (i: number, name: string, v: string) => update((rs) => rs.map((r, j) => (j === i ? { ...r, [name]: v } : r)));
  const sum = (name: string, scale: number) => safe(() => add(rows.map((r) => (isDecimal(String(r[name] ?? '')) ? String(r[name]) : '0')), scale));
  const netKg = sum('netWeightKg', 3);
  const mismatch = totalNetMt && rows.length && netKg !== '—' && round(mul(totalNetMt, '1000', 3), 3) !== netKg;
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-slate-500 uppercase">
                {CONTAINER_FIELDS.map((f) => (
                  <th key={f.name} className="py-1 pr-2 font-medium">
                    {f.label}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r._key}>
                  {CONTAINER_FIELDS.map((f) => (
                    <td key={f.name} className="py-0.5 pr-2">
                      {f.type === 'select' ? (
                        <select className="field-input" disabled={readOnly} value={String(r[f.name] ?? f.default ?? '')} onChange={(e) => set(i, f.name, e.target.value)} aria-label={f.label}>
                          {f.options!.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={`field-input ${f.upper ? 'uppercase' : ''} ${f.type !== 'text' ? 'text-right tabular-nums' : ''}`}
                          disabled={readOnly}
                          inputMode={f.type === 'text' ? undefined : 'decimal'}
                          value={String(r[f.name] ?? '')}
                          onChange={(e) => set(i, f.name, f.upper ? e.target.value.toUpperCase() : e.target.value)}
                          aria-label={f.label}
                        />
                      )}
                    </td>
                  ))}
                  <td>{!readOnly && <IconBtn label="Remove container" onClick={() => update((rs) => rs.filter((_, j) => j !== i))} icon={<Trash2 className="size-3.5" />} danger />}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-[12.5px] font-medium text-slate-700">
                <td colSpan={3} className="pt-1">
                  Total
                </td>
                <td className="pt-1 pr-2 text-right tabular-nums">{sum('totalBags', 0)}</td>
                <td className="pt-1 pr-2 text-right tabular-nums">{netKg}</td>
                <td className="pt-1 pr-2 text-right tabular-nums">{sum('grossWeightKg', 3)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {mismatch && <div className="text-[12px] text-amber-700">Container net weight ({netKg} kg) differs from the invoice net weight ({round(mul(totalNetMt!, '1000', 3), 3)} kg).</div>}
      {!readOnly && (
        <Button icon={<Plus className="size-3.5" />} onClick={() => update((rs) => [...rs, { _key: key(), containerSize: '20FT' }])}>
          Add container
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- totals & linked documents
/**
 * Commercial invoice "Value summary" under the products. The line rates are already the CFR / CIF
 * price, so the products' total is the invoice value and it is worked bottom-up: FOB value = total −
 * freight − insurance. CFR needs the freight, CIF needs freight and insurance. The ticks only decide
 * which rows are printed on the invoice; the section tick hides the whole breakdown.
 */
function ValueSummary({
  header,
  totals,
  currency,
  readOnly,
  errors,
  onChange,
}: {
  header: Values;
  totals: Record<string, string> | null;
  currency: string;
  readOnly: boolean;
  errors: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
}) {
  const on = (n: string) => header[n] !== false;
  const money = (x: unknown) => (totals ? formatAmount(String(x ?? '0')) : '—');
  const term = valueTerm(header);
  const need = chargesRequired(header.incoterm);
  const shown = on('showValueSummary');
  const row = 'flex items-start justify-between gap-4 py-1';
  const charge = (amount: string, show: string, label: string, required: boolean) => {
    if (!required) return null; // FOB has no freight / insurance; CFR has no insurance
    return (
      <div className={row}>
        <label className="flex items-center gap-2 pt-1.5" title="Print this row on the invoice">
          <input type="checkbox" className="size-4 accent-brand-700" checked={on(show)} disabled={readOnly} onChange={(e) => onChange(show, e.target.checked)} />
          <span className={on(show) ? 'text-slate-700' : 'text-slate-400'}>
            Less: {label}
            <span className="text-red-500"> *</span>
            {!on(show) && <span className="ml-1 text-[11px]">(not printed)</span>}
          </span>
        </label>
        <div className="w-40">
          <input
            id={`f-${amount}`}
            className="field-input text-right tabular-nums"
            inputMode="decimal"
            disabled={readOnly}
            aria-invalid={errors[amount] ? true : undefined}
            aria-label={label}
            value={header[amount] === null || header[amount] === undefined ? '' : String(header[amount])}
            placeholder="0.00"
            onChange={(e) => onChange(amount, e.target.value)}
          />
          {errors[amount] && <div className="mt-0.5 text-right text-[11.5px] text-red-600">{errors[amount]}</div>}
        </div>
      </div>
    );
  };
  return (
    <Section
      title="Value summary"
      action={
        <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600">
          <input type="checkbox" className="size-4 accent-brand-700" checked={shown} disabled={readOnly} onChange={(e) => onChange('showValueSummary', e.target.checked)} />
          Print on invoice
        </label>
      }
    >
      <div className={`max-w-lg text-[13px] ${shown ? '' : 'opacity-60'}`}>
        <div className={`${row} font-semibold text-slate-900`}>
          <span className="pl-6">
            Total {term} value{currency ? ` (${currency})` : ''} <span className="font-normal text-slate-400">— products total</span>
          </span>
          <span className="w-40 pr-2 text-right tabular-nums">{money(totals?.invoiceTotal)}</span>
        </div>
        {charge('oceanFreightCharge', 'showFreight', 'Freight', need.freight)}
        {charge('insuranceCharge', 'showInsurance', 'Insurance', need.insurance)}
        <div className={`${row} mt-1 border-t border-slate-200 pt-2 font-semibold text-slate-900`}>
          <span className="pl-6">FOB value{currency ? ` (${currency})` : ''}</span>
          <span className={`w-40 pr-2 text-right tabular-nums ${totals && Number(totals.fobAmount) < 0 ? 'text-red-600' : ''}`}>{money(totals?.fobAmount)}</span>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-slate-400">
        Rates already include {need.insurance ? 'freight and insurance' : need.freight ? 'freight' : 'no freight or insurance'} ({term}), so FOB = total
        {need.freight ? ' − freight' : ''}
        {need.insurance ? ' − insurance' : ''}.{need.freight ? ` ${need.insurance ? 'Both are' : 'Freight is'} required for ${term}.` : ''} A tick only decides
        whether that row prints; “Print on invoice” hides the whole breakdown.
      </p>
    </Section>
  );
}

function TotalsPanel({ def, totals, currency, words }: { def: DocDef; totals: Record<string, string> | null; currency: string; words?: string | null }) {
  const main = def.key === 'proformaInvoices' ? 'grandTotal' : def.key === 'commercialInvoices' ? 'invoiceTotal' : 'goodsAmount';
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-xs">
      {!totals ? (
        <div className="text-[13px] text-amber-700">Totals appear once every line has a valid net weight and rate.</div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-3 lg:grid-cols-5">
          {def.totals.map((t) => (
            <div key={t.name} className={t.name === main ? 'font-semibold text-slate-900' : 'text-slate-600'}>
              <dt className="text-[11.5px] text-slate-500">{t.label}</dt>
              <dd className="tabular-nums">
                {formatAmount(totals[t.name] ?? '0', t.scale)}
                {t.scale === 2 && currency ? ` ${currency}` : ''}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {def.key === 'commercialInvoices' && <p className="mt-2 text-[11.5px] text-slate-400">Invoice total = products total (rates include freight / insurance); FOB value = total − freight − insurance (see Value summary).</p>}
      {words && <p className="mt-2 text-[12.5px] text-slate-600">In words: {words}</p>}
    </section>
  );
}

function ChildrenPanel({ def, id, items, canCreate, dirty }: { def: DocDef; id: string; items: Child[]; canCreate: (module: string) => boolean; dirty: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      {items.map((c) => {
        const child = DOCS[c.doc];
        const left = isPositive(c.remainingMt);
        return (
          <section key={c.doc} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-sky-200 bg-sky-50/60 px-4 py-2.5 text-[13px]">
            <FileText className="size-4 text-sky-700" />
            <span>
              {child.plural}: <b>{c.usedMt} MT</b> used, <b className={left ? 'text-amber-700' : ''}>{c.remainingMt} MT</b> left
            </span>
            <span className="flex flex-wrap gap-1.5">
              {c.rows.map((r) => (
                <Link key={r.id} to={`/d/${child.key}/${r.id}`} className="rounded border border-sky-200 bg-white px-1.5 py-0.5 font-mono text-[12px] text-sky-800 hover:bg-sky-100">
                  {r.documentNumber}
                  {r.status === 'CANCELLED' ? ' (cancelled)' : ''}
                </Link>
              ))}
            </span>
            {canCreate(child.module) && childDocs(def.key).some((x) => x.key === child.key) && (
              <Button
                className="ml-auto"
                variant="primary"
                icon={<Plus className="size-3.5" />}
                disabled={!left || dirty}
                title={dirty ? 'Save your changes first' : left ? `Create a ${child.label.toLowerCase()} for the remaining quantity` : 'Nothing left'}
                onClick={() => navigate(`/d/${child.key}/new?from=${id}`)}
              >
                Create {child.label.toLowerCase()}
              </Button>
            )}
          </section>
        );
      })}
    </>
  );
}

/** OBL + certificates generated against this invoice (no quantity balance — just links + create). */
function LetterChildrenPanel({ id, items, canCreate, dirty }: { id: string; items: LetterChild[]; canCreate: (module: string) => boolean; dirty: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      {items.map((c) => (
        <section key={c.doc} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-violet-200 bg-violet-50/60 px-4 py-2.5 text-[13px]">
          <FileText className="size-4 text-violet-700" />
          <span className="font-medium">{c.plural}</span>
          <span className="flex flex-wrap gap-1.5">
            {c.rows.map((r) => (
              <Link key={r.id} to={`/d/${c.doc}/${r.id}`} className="rounded border border-violet-200 bg-white px-1.5 py-0.5 font-mono text-[12px] text-violet-800 hover:bg-violet-100">
                {r.documentNumber}
                {r.status === 'CANCELLED' ? ' (cancelled)' : ''}
              </Link>
            ))}
            {!c.rows.length && <span className="text-slate-400">none yet</span>}
          </span>
          {canCreate(c.module) && (
            <Button
              className="ml-auto"
              variant="primary"
              icon={<Plus className="size-3.5" />}
              disabled={dirty}
              title={dirty ? 'Save your changes first' : `Create a ${c.label.toLowerCase()} against this invoice`}
              onClick={() => navigate(`/d/${c.doc}/new?from=${id}`)}
            >
              Create {c.label.toLowerCase()}
            </Button>
          )}
        </section>
      ))}
    </>
  );
}
