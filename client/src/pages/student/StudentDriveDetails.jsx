import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getDriveDetails } from '../../services/driveService';
import { getDriveState } from '../../utils/driveState';
import { formatDateTime, formatPackage } from '../../utils/format';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';

const TYPES = { FULL_TIME: 'Full time', INTERNSHIP: 'Internship', CONTRACT: 'Contract' };

function RequirementRow({ met, title, detail }) {
  return (
    <li className="list-group-item d-flex align-items-start gap-3 py-3">
      <i className={`bi fs-5 ${met ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'}`}></i>
      <div>
        <div className="fw-semibold">{title}</div>
        <div className="small text-muted">{detail}</div>
      </div>
    </li>
  );
}

function StudentDriveDetails() {
  const { id } = useParams();
  const fetchDrive = useCallback(() => getDriveDetails(id), [id]);
  const { data: drive, loading, error, reload } = useFetch(fetchDrive);

  const backLink = (
    <Link to="/student/drives" className="small text-decoration-none">
      <i className="bi bi-arrow-left me-1"></i>Back to drives
    </Link>
  );

  if (loading && !drive) return <LoadingSpinner />;
  if (error) {
    return (
      <>
        {backLink}
        <div className="mt-3"><ErrorMessage message={error} onRetry={reload} /></div>
      </>
    );
  }

  const r = drive.requirements;
  const state = getDriveState(drive);

  return (
    <>
      {backLink}

      <div className="d-flex flex-wrap align-items-center gap-3 my-3">
        <div className="company-logo" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
          {drive.companyName[0]}
        </div>
        <div className="flex-grow-1">
          <h3 className="page-title">{drive.driveTitle}</h3>
          <div className="text-muted">{drive.companyName} · {drive.jobTitle}</div>
        </div>
        <span className={`badge rounded-pill fs-6 bg-${state.tone}-subtle text-${state.tone}-emphasis`}>
          <i className={`bi ${state.icon} me-1`}></i>{state.label}
        </span>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          {/* Verdict from the database function */}
          <div className={`alert ${drive.isEligible ? 'alert-success' : 'alert-warning'} d-flex gap-2`}>
            <i className={`bi ${drive.isEligible ? 'bi-patch-check' : 'bi-info-circle'}`}></i>
            <div><strong>{drive.isEligible ? 'You are eligible.' : 'You are not eligible yet.'}</strong>{' '}
              {drive.eligibilityReason}</div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h6>About the role</h6>
              <p className="mb-2">{drive.jobDescription || 'No description provided.'}</p>
              {drive.description && <p className="text-muted mb-0">{drive.description}</p>}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header bg-white fw-semibold">Eligibility requirements</div>
            <ul className="list-group list-group-flush">
              <RequirementRow met={r.cgpaMet}
                title={`Minimum CGPA ${r.minCgpa.toFixed(2)}`}
                detail={`Your CGPA: ${r.yourCgpa.toFixed(2)}`} />

              {r.graduationYear !== null && (
                <RequirementRow met={r.graduationYearMet}
                  title={`Graduation year ${r.graduationYear}`}
                  detail={`Your graduation year: ${r.yourGraduationYear}`} />
              )}

              <RequirementRow met={r.departmentMet}
                title={r.departments.length === 0
                  ? 'Open to all departments'
                  : `Departments: ${r.departments.map((d) => d.code).join(', ')}`}
                detail={`Your department: ${r.yourDepartmentCode}`} />

              {r.skills.map((s) => (
                <RequirementRow key={s.skillName} met={s.met}
                  title={`${s.skillName} · level ${s.requiredLevel} or higher`}
                  detail={s.yourLevel ? `Your level: ${s.yourLevel}` : 'Not on your profile yet'} />
              ))}
            </ul>
          </div>

          {drive.companyDescription && (
            <div className="card">
              <div className="card-body">
                <h6>About {drive.companyName}</h6>
                <p className="mb-1">{drive.companyDescription}</p>
                <div className="small text-muted">
                  {drive.industry}
                  {drive.website && <> · <a href={drive.website} target="_blank" rel="noreferrer">Website</a></>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">Key details</h6>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><i className="bi bi-cash-stack text-muted me-2"></i>{formatPackage(drive.minPackageLpa, drive.maxPackageLpa)}</li>
                <li className="mb-2"><i className="bi bi-geo-alt text-muted me-2"></i>{drive.location}</li>
                <li className="mb-2"><i className="bi bi-briefcase text-muted me-2"></i>{TYPES[drive.employmentType]}</li>
                <li className="mb-2"><i className="bi bi-door-open text-muted me-2"></i>Opens {formatDateTime(drive.registrationOpenDate)}</li>
                <li className="mb-2"><i className="bi bi-hourglass-split text-muted me-2"></i>Closes {formatDateTime(drive.registrationDeadline)}</li>
                <li className="mb-2"><i className="bi bi-calendar-event text-muted me-2"></i>Drive on {formatDateTime(drive.driveDate)}</li>
                <li><i className="bi bi-flag text-muted me-2"></i>Status <StatusBadge status={drive.status} /></li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6>Apply</h6>
              {drive.hasApplied ? (
                <div className="alert alert-primary mb-0">You have already applied to this drive.</div>
              ) : drive.registrationClosed ? (
                <div className="alert alert-secondary mb-0">Registration is closed for this drive.</div>
              ) : drive.isEligible ? (
                <>
                  <button className="btn btn-primary w-100" disabled>Apply now</button>
                  <div className="small text-muted mt-2">Applying is switched on in Phase 6.</div>
                </>
              ) : (
                <>
                  <div className="small text-muted mb-2">Fix the red items above to unlock this drive.</div>
                  <Link to="/student/skills" className="btn btn-outline-primary w-100">Update my skills</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default StudentDriveDetails;