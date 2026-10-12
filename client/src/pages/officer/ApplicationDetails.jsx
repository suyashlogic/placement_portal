import { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getApplication, changeApplicationStatus } from '../../services/applicationService';
import { STAFF_NEXT, label } from '../../utils/applicationStatus';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDateTime, formatPackage } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import ApplicationProgress from '../../components/ApplicationProgress';
import StatusTimeline from '../../components/StatusTimeline';
import RoundsTable from '../../components/RoundsTable';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// Teaches: a form whose options depend on server data (only legal next statuses are offered)
function StatusForm({ application, onChanged }) {
  const options = STAFF_NEXT[application.status];
  const [status, setStatus] = useState(options[0] || '');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (options.length === 0) {
    return <div className="small text-muted">No manual changes are possible from {label(application.status)}.</div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await changeApplicationStatus(application.applicationId, status, remarks);
      onChanged(`Status changed to ${label(status)}. The student has been notified.`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger py-2 small">{error}</div>}
      <label className="form-label small mb-1" htmlFor="newStatus">Move to</label>
      <select id="newStatus" className="form-select mb-2" value={status} onChange={(e) => setStatus(e.target.value)}>
        {options.map((s) => <option key={s} value={s}>{label(s)}</option>)}
      </select>
      <textarea className="form-control mb-2" rows="2" maxLength={500} placeholder="Remarks (optional)"
        value={remarks} onChange={(e) => setRemarks(e.target.value)}></textarea>
      <button className={`btn w-100 btn-${status === 'REJECTED' ? 'danger' : 'primary'}`} disabled={saving}>
        {saving ? 'Saving...' : 'Update status'}
      </button>
    </form>
  );
}

function ApplicationDetails() {
  const { id } = useParams();
  const fetchApplication = useCallback(() => getApplication(id), [id]);
  const { data, loading, error, reload } = useFetch(fetchApplication);
  const [notice, setNotice] = useState('');

  const back = (
    <Link to="/officer/applications" className="small text-decoration-none">
      <i className="bi bi-arrow-left me-1"></i>Back to applications
    </Link>
  );

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <>{back}<div className="mt-3"><ErrorMessage message={error} onRetry={reload} /></div></>;

  const { application: app, history, rounds } = data;

  return (
    <>
      {back}
      <div className="d-flex flex-wrap align-items-center gap-3 my-3">
        <div className="avatar" style={{ width: 56, height: 56, fontSize: '1.1rem' }}>
          {app.studentName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div className="flex-grow-1">
          <h3 className="page-title">{app.studentName}</h3>
          <div className="text-muted">{app.rollNumber} · {app.departmentCode} · CGPA {Number(app.cgpa).toFixed(2)}</div>
        </div>
        <span className="fs-6"><StatusBadge status={app.status} /></span>
      </div>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}

      <div className="row g-3">
        <div className="col-lg-8">
          {!['REJECTED', 'WITHDRAWN'].includes(app.status) && (
            <div className="card mb-3">
              <div className="card-body"><h6 className="mb-3">Progress</h6><ApplicationProgress status={app.status} /></div>
            </div>
          )}
          <div className="card mb-3">
            <div className="card-header bg-white fw-semibold">Selection rounds</div>
            <div className="card-body"><RoundsTable rounds={rounds} emptyText="No rounds have been created for this application yet." /></div>
          </div>
          <div className="card">
            <div className="card-header bg-white fw-semibold">Status history</div>
            <div className="card-body"><StatusTimeline history={history} showActor /></div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">Application</h6>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><i className="bi bi-briefcase text-muted me-2"></i>{app.driveTitle}</li>
                <li className="mb-2"><i className="bi bi-building text-muted me-2"></i>{app.companyName} · {app.jobTitle}</li>
                <li className="mb-2"><i className="bi bi-cash-stack text-muted me-2"></i>{formatPackage(app.minPackageLpa, app.maxPackageLpa)}</li>
                <li className="mb-2"><i className="bi bi-envelope text-muted me-2"></i>{app.studentEmail}</li>
                <li><i className="bi bi-send text-muted me-2"></i>Applied {formatDateTime(app.applicationDate)}</li>
              </ul>
              <Link to={`/officer/selection?driveId=${app.driveId}`} className="btn btn-sm btn-outline-primary w-100 mt-3">
                <i className="bi bi-diagram-3 me-1"></i>Manage rounds for this drive
              </Link>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Change status</h6>
              {/* key resets the form after each change so its default option updates */}
              <StatusForm key={app.status} application={app}
                onChanged={(message) => { setNotice(message); reload(); }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default ApplicationDetails;
