import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getAuditLogs, getAuditFilterOptions } from '../../services/auditService';
import { formatDateTime } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const KINDS = [
  { value: '', label: 'Everything' },
  { value: 'APP', label: 'Business events' },
  { value: 'DB', label: 'Database changes' },
];

const isDbChange = (action) => action.startsWith('DB_');

// Shows what a log row recorded. Database UPDATE rows hold {field: {old, new}}; INSERT/DELETE rows hold the whole row.
function Details({ log }) {
  const changes = log.metadata?.changes;
  const meta = log.metadata;

  if (changes && typeof changes === 'object') {
    const isDiff = Object.values(changes).every((v) => v && typeof v === 'object' && ('old' in v || 'changed' in v));
    return (
      <table className="table table-sm align-middle mb-0">
        <thead className="table-light">
          <tr><th>Field</th>{isDiff ? <><th>Before</th><th>After</th></> : <th>Value</th>}</tr>
        </thead>
        <tbody>
          {Object.entries(changes).map(([field, value]) => (
            <tr key={field}>
              <td className="fw-semibold">{field}</td>
              {isDiff ? (
                value.changed
                  ? <td colSpan="2" className="text-muted">changed (value not stored)</td>
                  : <>
                    <td className="text-danger">{String(value.old ?? '–')}</td>
                    <td className="text-success">{String(value.new ?? '–')}</td>
                  </>
              ) : <td>{String(value ?? '–')}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return meta
    ? <pre className="small bg-light p-3 rounded mb-0">{JSON.stringify(meta, null, 2)}</pre>
    : <div className="text-muted">This event has no extra details.</div>;
}

// Teaches: every filter lives in the URL (?kind=DB&entityType=students&page=2), as on the Applications page
function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') || '';
  const entityType = params.get('entityType') || '';
  const action = params.get('action') || '';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const page = Number(params.get('page')) || 1;

  const options = useFetch(getAuditFilterOptions);
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(
    () => getAuditLogs({
      kind: kind || undefined, entityType: entityType || undefined, action: action || undefined,
      from: from || undefined, to: to || undefined, page,
    }),
    [kind, entityType, action, from, to, page]
  );
  const { data, loading, error, reload } = useFetch(fetchLogs);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
  };
  const setPage = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
  };

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const hasFilters = kind || entityType || action || from || to;

  return (
    <>
      <PageHeader title="Audit Log" subtitle="Who did what, and exactly what changed. Records cannot be edited or deleted." />

      <div className="card">
        <div className="card-body border-bottom">
          <div className="btn-group mb-3">
            {KINDS.map((k) => (
              <button key={k.value || 'all'} type="button"
                className={`btn btn-sm ${kind === k.value ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('kind', k.value)}>{k.label}</button>
            ))}
          </div>
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select" value={entityType} onChange={(e) => setFilter('entityType', e.target.value)}>
                <option value="">All record types</option>
                {(options.data?.entityTypes || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={action} onChange={(e) => setFilter('action', e.target.value)}>
                <option value="">All actions</option>
                {(options.data?.actions || []).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control" value={from} aria-label="From date"
                onChange={(e) => setFilter('from', e.target.value)} />
            </div>
            <div className="col-md-2">
              <input type="date" className="form-control" value={to} aria-label="To date"
                onChange={(e) => setFilter('to', e.target.value)} />
            </div>
            <div className="col-md-2 d-grid">
              <button className="btn btn-outline-secondary" disabled={!hasFilters} onClick={() => setParams({})}>Clear filters</button>
            </div>
          </div>
        </div>

        {data.logs.length === 0 ? (
          <EmptyState icon="bi-clipboard-data" title="No audit records match"
            text={hasFilters ? 'Try clearing a filter.' : 'Activity will appear here as people use the portal.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th></th></tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.auditId}>
                    <td className="small text-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td>
                      {log.userName
                        ? <><div className="fw-semibold">{log.userName}</div><div className="small text-muted">{log.userRole.replace('_', ' ').toLowerCase()}</div></>
                        : <span className="text-muted">system</span>}
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-${isDbChange(log.action) ? 'warning' : 'primary'}-subtle text-${isDbChange(log.action) ? 'warning' : 'primary'}-emphasis`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="small">{log.entityType}{log.entityId != null && ` #${log.entityId}`}</td>
                    <td className="text-end">
                      {log.metadata && (
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelected(log)}>Details</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
      </div>

      {selected && (
        <Modal title={`${selected.action} · ${selected.entityType}${selected.entityId != null ? ` #${selected.entityId}` : ''}`}
          size="modal-lg" onClose={() => setSelected(null)}>
          <div className="small text-muted mb-3">
            {formatDateTime(selected.createdAt)} · {selected.userName || 'system'}
          </div>
          <Details log={selected} />
        </Modal>
      )}
    </>
  );
}
export default AuditLogs;
