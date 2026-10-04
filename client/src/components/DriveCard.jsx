import { Link } from 'react-router-dom';
import { getDriveState } from '../utils/driveState';
import { formatDate, formatPackage } from '../utils/format';

function DriveCard({ drive }) {
  const state = getDriveState(drive);
  const showReason = !drive.isEligible && !drive.hasApplied && !drive.registrationClosed;

  return (
    <div className="card drive-card h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="company-logo">{drive.companyName[0]}</div>
          <span className={`badge rounded-pill bg-${state.tone}-subtle text-${state.tone}-emphasis`}>
            <i className={`bi ${state.icon} me-1`}></i>{state.label}
          </span>
        </div>
        <h6 className="mb-0">{drive.driveTitle}</h6>
        <div className="text-muted small mb-3">{drive.companyName} · {drive.jobTitle}</div>
        <ul className="list-unstyled small mb-3">
          <li className="mb-1"><i className="bi bi-cash-stack text-muted me-2"></i>{formatPackage(drive.minPackageLpa, drive.maxPackageLpa)}</li>
          <li className="mb-1"><i className="bi bi-geo-alt text-muted me-2"></i>{drive.location}</li>
          <li><i className="bi bi-calendar-event text-muted me-2"></i>Apply by {formatDate(drive.registrationDeadline)}</li>
        </ul>

        {/* mt-auto pushes this block to the bottom so all cards line up */}
        <div className="mt-auto pt-2">
          {showReason && (
            <div className="reason-box small mb-3">
              <i className="bi bi-info-circle me-1"></i>{drive.eligibilityReason}
            </div>
          )}
          <Link to={`/student/drives/${drive.driveId}`} className="btn btn-sm btn-outline-primary w-100">
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
export default DriveCard;