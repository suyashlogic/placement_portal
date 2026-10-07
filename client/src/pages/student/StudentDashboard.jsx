import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getDashboard } from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DriveCard from '../../components/DriveCard';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(getDashboard);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { profile, profileCompletion, skillCount, openDrives, eligibleDrives, applicationCount, topDrives } = data;
  const barTone = profileCompletion < 60 ? 'warning' : 'success';

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        subtitle={`${profile.departmentName} · Class of ${profile.graduationYear}`}
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3"><StatCard icon="bi-mortarboard" label="CGPA" value={Number(profile.cgpa).toFixed(2)} tone="primary" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-lightning-charge" label="Skills added" value={skillCount} tone="info" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-briefcase" label="Open drives" value={openDrives} tone="warning" /></div>
        <div className="col-6 col-xl-3"><StatCard icon="bi-patch-check" label="Eligible for you" value={eligibleDrives} tone="success" /></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <h6 className="mb-0">Profile completion</h6>
                <strong>{profileCompletion}%</strong>
              </div>
              <div className="progress mb-3" style={{ height: 8 }}>
                <div className={`progress-bar bg-${barTone}`} style={{ width: `${profileCompletion}%` }}></div>
              </div>
              {profileCompletion < 100 && (
                <div className="small text-muted">
                  Add your phone, date of birth, CGPA, skills and resume. <Link to="/student/profile">Complete profile</Link>
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h6>Applications</h6>
              <div className="stat-value">{applicationCount}</div>
              <div className="small text-muted mb-2">
                {applicationCount === 0 ? 'You have not applied to any drive yet.' : 'Drives you have applied to.'}
              </div>
              <Link to="/student/applications" className="small">Track my applications</Link>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Drives you can apply to</h6>
            <Link to="/student/drives" className="small">View all</Link>
          </div>
          {topDrives.length === 0 ? (
            <div className="card"><EmptyState icon="bi-briefcase" title="No eligible drives right now"
              text="Add skills or update your CGPA to unlock more drives." /></div>
          ) : (
            <div className="row g-3">
              {topDrives.map((drive) => (
                <div className="col-md-6" key={drive.driveId}><DriveCard drive={drive} /></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
export default StudentDashboard;
