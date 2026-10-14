import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getOfficerDashboard } from '../../services/analyticsService';
import { formatDate, formatDateTime } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import DepartmentPlacementCard from '../../components/analytics/DepartmentPlacementCard';
import PlacementTrendCard from '../../components/analytics/PlacementTrendCard';
import FunnelCard from '../../components/analytics/FunnelCard';

// The numbers on the cards come from get_overview_statistics() (PostgreSQL). React only displays them.
function OfficerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(getOfficerDashboard);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { overview: o, offers, recentApplications, upcomingDrives } = data;
  const cards = [
    { icon: 'bi-people', label: 'Students', value: o.totalStudents, tone: 'primary' },
    { icon: 'bi-calendar-event', label: 'Active drives', value: o.activeDrives, tone: 'info' },
    { icon: 'bi-send-check', label: 'Applications', value: o.totalApplications, tone: 'warning' },
    { icon: 'bi-list-check', label: 'Shortlisted students', value: o.shortlistedStudents, tone: 'info' },
    { icon: 'bi-patch-check', label: 'Selected students', value: o.selectedStudents, tone: 'success' },
    { icon: 'bi-envelope-paper', label: `Offers (${offers.pending} pending)`, value: offers.total, tone: 'warning' },
    { icon: 'bi-trophy', label: 'Placed students', value: o.placedStudents, tone: 'success' },
    { icon: 'bi-graph-up-arrow', label: 'Placement rate', value: `${o.placementRate}%`, tone: 'primary' },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="Placement season at a glance">
        <Link to="/officer/analytics" className="btn btn-outline-primary">
          <i className="bi bi-bar-chart-line me-1"></i>Full analytics
        </Link>
      </PageHeader>

      {offers.awaitingPlacement > 0 && (
        <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center">
          <span><i className="bi bi-hourglass-split me-2"></i>
            <strong>{offers.awaitingPlacement}</strong> accepted offer{offers.awaitingPlacement > 1 ? 's are' : ' is'} waiting for placement confirmation.</span>
          <Link to="/officer/placements" className="btn btn-sm btn-warning">Confirm placements</Link>
        </div>
      )}

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-xl-3" key={c.label}><StatCard icon={c.icon} label={c.label} value={c.value} tone={c.tone} /></div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-6"><DepartmentPlacementCard /></div>
        <div className="col-lg-6"><PlacementTrendCard months={12} /></div>
        <div className="col-lg-6"><FunnelCard /></div>

        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-white fw-semibold">Upcoming drives</div>
            {upcomingDrives.length === 0 ? (
              <EmptyState icon="bi-calendar-event" title="No upcoming drives" text="Create a drive to see it here." />
            ) : (
              <ul className="list-group list-group-flush">
                {upcomingDrives.map((d) => (
                  <li key={d.driveId} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-semibold">{d.driveTitle}</div>
                      <div className="small text-muted">{d.companyName} · {formatDate(d.driveDate)}</div>
                    </div>
                    <div className="text-end">
                      <StatusBadge status={d.status} />
                      <div className="small mt-1">
                        <Link to={`/officer/applications?driveId=${d.driveId}`}>{d.applications} applications</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Recent applications</span>
          <Link to="/officer/applications" className="small">View all</Link>
        </div>
        {recentApplications.length === 0 ? (
          <EmptyState icon="bi-inboxes" title="No applications yet" />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Student</th><th>Drive</th><th>Status</th><th>Applied</th><th></th></tr></thead>
              <tbody>
                {recentApplications.map((a) => (
                  <tr key={a.applicationId}>
                    <td><div className="fw-semibold">{a.studentName}</div><div className="small text-muted">{a.rollNumber}</div></td>
                    <td>{a.driveTitle} <span className="text-muted">· {a.companyName}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="small">{formatDateTime(a.applicationDate)}</td>
                    <td className="text-end"><Link to={`/officer/applications/${a.applicationId}`} className="btn btn-sm btn-outline-primary">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
export default OfficerDashboard;
