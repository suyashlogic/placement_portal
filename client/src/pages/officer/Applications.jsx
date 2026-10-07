import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getApplicationsForStaff } from '../../services/applicationService';
import { getManagedDrives } from '../../services/driveService';
import { ALL_STATUSES, label } from '../../utils/applicationStatus';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// Teaches: the URL as state. Filters live in the query string (?driveId=2&status=APPLIED&page=2),
// so a filtered list can be refreshed, bookmarked, or linked from another page.
function Applications() {
  const [params, setParams] = useSearchParams();
  const driveId = params.get('driveId') || '';
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(q);
  const drives = useFetch(getManagedDrives);

  const fetchApplications = useCallback(
    () => getApplicationsForStaff({ driveId: driveId || undefined, status: status || undefined, q: q || undefined, page }),
    [driveId, status, q, page]
  );
  const { data, loading, error, reload } = useFetch(fetchApplications);

  // Change one filter, keep the others, go back to page 1
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

  return (
    <>
      <PageHeader title="Applications" subtitle="Monitor and review student applications" />

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
                <tr><th>Student</th><th>Drive</th><th>CGPA</th><th>Applied</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={a.applicationId}>
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
    </>
  );
}
export default Applications;
