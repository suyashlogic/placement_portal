import { useState, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getApplication, withdrawApplication } from '../../services/applicationService';
import { STUDENT_CAN_WITHDRAW } from '../../utils/applicationStatus';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDateTime, formatPackage } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import ApplicationProgress from '../../components/ApplicationProgress';
import StatusTimeline from '../../components/StatusTimeline';
import RoundsTable from '../../components/RoundsTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

function StudentApplicationDetails() {
  const { id } = useParams();
  const location = useLocation();
  const fetchApplication = useCallback(() => getApplication(id), [id]);
  const { data, loading, error, reload } = useFetch(fetchApplication);

  const [notice, setNotice] = useState(location.state?.notice || '');
  const [actionError, setActionError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = (
    <Link to="/student/applications" className="small text-decoration-none">
      <i className="bi bi-arrow-left me-1"></i>Back to applications
    </Link>
  );

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <>{back}<div className="mt-3"><ErrorMessage message={error} onRetry={reload} /></div></>;

  const { application: app, history, rounds } = data;

  const handleWithdraw = async () => {
    setBusy(true);
    setActionError('');
    try {
      await withdrawApplication(app.applicationId);
      setConfirming(false);
      setNotice('Your application has been withdrawn');
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
      {back}
      <div className="d-flex flex-wrap align-items-center gap-3 my-3">
        <div className="company-logo" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>{app.companyName[0]}</div>
        <div className="flex-grow-1">
          <h3 className="page-title">{app.driveTitle}</h3>
          <div className="text-muted">{app.companyName} · {app.jobTitle}</div>
        </div>
        <span className="fs-6"><StatusBadge status={app.status} /></span>
      </div>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}
      {app.status === 'OFFERED' && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <span><i className="bi bi-envelope-paper me-2"></i>You have an offer for this drive.</span>
          <Link to="/student/offers" className="btn btn-sm btn-success">View offer</Link>
        </div>
      )}
      {app.status === 'PLACED' && (
        <div className="alert alert-success">
          <i className="bi bi-trophy me-2"></i>Congratulations, you are placed! <Link to="/student/placement">See your placement</Link>
        </div>
      )}
      {app.status === 'REJECTED' && <div className="alert alert-danger">This application was not successful. Keep applying to other drives.</div>}
      {app.status === 'WITHDRAWN' && <div className="alert alert-secondary">You withdrew this application. You cannot apply to this drive again.</div>}

      <div className="row g-3">
        <div className="col-lg-8">
          {!['REJECTED', 'WITHDRAWN'].includes(app.status) && (
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="mb-3">Progress</h6>
                <ApplicationProgress status={app.status} />
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-header bg-white fw-semibold">Selection rounds</div>
            <div className="card-body"><RoundsTable rounds={rounds} /></div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">Details</h6>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><i className="bi bi-cash-stack text-muted me-2"></i>{formatPackage(app.minPackageLpa, app.maxPackageLpa)}</li>
                <li className="mb-2"><i className="bi bi-geo-alt text-muted me-2"></i>{app.jobLocation}</li>
                <li className="mb-2"><i className="bi bi-send text-muted me-2"></i>Applied {formatDateTime(app.applicationDate)}</li>
                <li><i className="bi bi-calendar-event text-muted me-2"></i>Drive on {formatDateTime(app.driveDate)}</li>
              </ul>
              <Link to={`/student/drives/${app.driveId}`} className="btn btn-sm btn-outline-primary w-100 mt-3">View drive</Link>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">History</h6>
              <StatusTimeline history={history} />
            </div>
          </div>

          {STUDENT_CAN_WITHDRAW.includes(app.status) && (
            <button className="btn btn-outline-danger w-100" onClick={() => setConfirming(true)}>
              <i className="bi bi-x-circle me-1"></i>Withdraw application
            </button>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDialog title="Withdraw application?"
          message={`You will be removed from ${app.driveTitle}. This cannot be undone and you will not be able to apply to this drive again.`}
          confirmLabel="Withdraw" variant="danger" busy={busy}
          onConfirm={handleWithdraw} onCancel={() => setConfirming(false)} />
      )}
    </>
  );
}
export default StudentApplicationDetails;
