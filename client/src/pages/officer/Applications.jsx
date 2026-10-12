import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getApplicationsForStaff } from '../../services/applicationService';
import { shortlistApplications } from '../../services/selectionService';
import { getManagedDrives } from '../../services/driveService';
import { ALL_STATUSES, label } from '../../utils/applicationStatus';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// Only these can still be shortlisted
const SHORTLISTABLE = ['APPLIED', 'UNDER_REVIEW'];

// Teaches: the URL as state (filters), plus a selection kept in component state (checked rows)
function Applications() {
  const [params, setParams] = useSearchParams();
  const driveId = params.get('driveId') || '';
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(q);
  const [selected, setSelected] = useState([]);          // application ids ticked by the officer
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const drives = useFetch(getManagedDrives);

  const fetchApplications = useCallback(
    () => getApplicationsForStaff({ driveId: driveId || undefined, status: status || undefined, q: q || undefined, page }),
    [driveId, status, q, page]
  );
  const { data, loading, error, reload } = useFetch(fetchApplications);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    setParams(next);
    setSelected([]);
  };
  const setPage = (p) => {
    const next = new URLSearchParams(params);
    next.set('page', String(p));
    setParams(next);
    setSelected([]);
  };

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const selectable = data.applications.filter((a) => SHORTLISTABLE.includes(a.status));
  const allTicked = selectable.length > 0 && selectable.every((a) => selected.includes(a.applicationId));

  const toggleOne = (id) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleAll = () =>
    setSelected(allTicked ? [] : selectable.map((a) => a.applicationId));

  const handleShortlist = async () => {
    setBusy(true);
    setActionError('');
    try {
      const result = await shortlistApplications(selected);
      setNotice(`${result.shortlisted} shortlisted${result.skipped.length ? `, ${result.skipped.length} skipped` : ''}. Students have been notified.`);
      setSelected([]);
      setConfirming(false);
      await reload();
    } catch (err) {
      setConfirming(false);
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Applications" subtitle="Monitor, review and shortlist student applications">
        {selected.length > 0 && (
          <button className="btn btn-success" onClick={() => setConfirming(true)}>
            <i className="bi bi-check2-all me-1"></i>Shortlist selected ({selected.length})
          </button>
        )}
      </PageHeader>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="card">
        <div className="card-body border-bottom">
          <div className="row g-2">
            <div className="col-md-4">
              <select className="form-select" value={driveId} onChange={(e) => setFilter('driveId', e.target.value)}>
                <option value="">All drives</option>
                {(drives.data || []).map((d) => <option key={d.driveId} value={d.driveId}>{d.driveTitle}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </div>
            <div className="col-md-5">
              <form className="input-group" onSubmit={(e) => { e.preventDefault(); setFilter('q', searchInput.trim()); }}>
                <input className="form-control" placeholder="Search student name or roll number"
                  value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                <button className="btn btn-outline-primary" type="submit"><i className="bi bi-search"></i></button>
              </form>
            </div>
          </div>
        </div>

        {data.applications.length === 0 ? (
          <EmptyState icon="bi-inboxes" title="No applications found" text="Try clearing a filter." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="form-check-input" checked={allTicked}
                      disabled={selectable.length === 0} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th>Student</th><th>Drive</th><th>CGPA</th><th>Applied</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={a.applicationId}>
                    <td>
                      {SHORTLISTABLE.includes(a.status) && (
                        <input type="checkbox" className="form-check-input"
                          checked={selected.includes(a.applicationId)}
                          onChange={() => toggleOne(a.applicationId)}
                          aria-label={`Select ${a.studentName}`} />
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold">{a.studentName}</div>
                      <div className="small text-muted">{a.rollNumber} · {a.departmentCode}</div>
                    </td>
                    <td>
                      <div>{a.driveTitle}</div>
                      <div className="small text-muted">{a.companyName} · {a.jobTitle}</div>
                    </td>
                    <td>{Number(a.cgpa).toFixed(2)}</td>
                    <td className="small">{formatDate(a.applicationDate)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-end">
                      <Link to={`/officer/applications/${a.applicationId}`} className="btn btn-sm btn-outline-primary">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
      </div>

      {confirming && (
        <ConfirmDialog title="Shortlist selected students?"
          message={`${selected.length} application(s) will be moved to Shortlisted and each student will be notified.`}
          confirmLabel="Shortlist" variant="success" busy={busy}
          onConfirm={handleShortlist} onCancel={() => setConfirming(false)} />
      )}
    </>
  );
}
export default Applications;
