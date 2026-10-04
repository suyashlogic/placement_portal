import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getManagedDrives, changeDriveStatus } from '../../services/driveService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// Which status buttons appear for each status. The server enforces the same lifecycle.
const ACTIONS = {
  DRAFT: [
    { to: 'OPEN', label: 'Publish', variant: 'success', text: 'Students will see this drive immediately and can apply until the deadline.' },
    { to: 'CANCELLED', label: 'Cancel drive', variant: 'danger', text: 'A cancelled drive cannot be reopened.' },
  ],
  OPEN: [
    { to: 'CLOSED', label: 'Close registration', variant: 'warning', text: 'Students will no longer be able to apply.' },
    { to: 'CANCELLED', label: 'Cancel drive', variant: 'danger', text: 'A cancelled drive cannot be reopened.' },
  ],
  CLOSED: [
    { to: 'OPEN', label: 'Reopen', variant: 'success', text: 'Registration reopens if the deadline is still in the future.' },
    { to: 'COMPLETED', label: 'Mark completed', variant: 'primary', text: 'Use this when the drive is finished. It cannot be undone.' },
    { to: 'CANCELLED', label: 'Cancel drive', variant: 'danger', text: 'A cancelled drive cannot be reopened.' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_FILTERS = ['ALL', 'DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED'];

function Drives() {
  const { data, loading, error, reload } = useFetch(getManagedDrives);
  const location = useLocation();                       // router state set by DriveForm after saving
  const [notice, setNotice] = useState(location.state?.notice || '');
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [pending, setPending] = useState(null);         // { drive, action } waiting for confirmation
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const visible = data.filter((d) => filter === 'ALL' || d.status === filter);

  const confirmAction = async () => {
    setBusy(true);
    setActionError('');
    try {
      await changeDriveStatus(pending.drive.driveId, pending.action.to);
      setNotice(`"${pending.drive.driveTitle}" is now ${pending.action.to.toLowerCase()}`);
      setPending(null);
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Placement Drives" subtitle="Create drives, set who can apply, and control registration">
        <Link to="/officer/drives/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>Create drive
        </Link>
      </PageHeader>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="card">
        <div className="card-body border-bottom">
          <div className="btn-group flex-wrap">
            {STATUS_FILTERS.map((s) => (
              <button key={s} type="button"
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(s)}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="bi-calendar-event" title="No drives here"
            text={data.length === 0 ? 'Create a drive from one of your jobs.' : 'No drive has this status.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Drive</th><th>Status</th><th>Registration</th><th>Drive date</th>
                  <th className="text-center">Applications</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visible.map((d) => (
                  <tr key={d.driveId}>
                    <td>
                      <div className="fw-semibold">{d.driveTitle}</div>
                      <div className="small text-muted">{d.companyName} · {d.jobTitle}</div>
                    </td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="small">{formatDate(d.registrationOpenDate)} to {formatDate(d.registrationDeadline)}</td>
                    <td className="small">{formatDate(d.driveDate)}</td>
                    <td className="text-center">{d.applicationCount}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Link to={`/officer/drives/${d.driveId}/students`} className="btn btn-sm btn-outline-primary">
                          <i className="bi bi-people me-1"></i>Students
                        </Link>
                        {ACTIONS[d.status].length > 0 && (
                          <Link to={`/officer/drives/${d.driveId}/edit`} className="btn btn-sm btn-outline-secondary">
                            <i className="bi bi-pencil me-1"></i>Edit
                          </Link>
                        )}
                        {ACTIONS[d.status].map((a) => (
                          <button key={a.to} className={`btn btn-sm btn-outline-${a.variant}`}
                            onClick={() => setPending({ drive: d, action: a })}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          title={`${pending.action.label}?`}
          message={`${pending.drive.driveTitle}: ${pending.action.text}`}
          confirmLabel={pending.action.label}
          variant={pending.action.variant}
          busy={busy}
          onConfirm={confirmAction}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
export default Drives;
