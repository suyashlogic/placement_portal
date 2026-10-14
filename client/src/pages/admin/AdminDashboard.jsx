import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getAdminDashboard } from '../../services/analyticsService';
import { formatDateTime } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import DepartmentPlacementCard from '../../components/analytics/DepartmentPlacementCard';
import PlacementTrendCard from '../../components/analytics/PlacementTrendCard';
import CompanyHiringCard from '../../components/analytics/CompanyHiringCard';
import StatusBreakdownCard from '../../components/analytics/StatusBreakdownCard';
import PackageCard from '../../components/analytics/PackageCard';

function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(getAdminDashboard);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { overview: o, system: s, recentActivity } = data;
  const cards = [
    { icon: 'bi-people', label: 'Students', value: s.students, tone: 'primary' },
    { icon: 'bi-diagram-2', label: 'Departments', value: s.departments, tone: 'info' },
    { icon: 'bi-buildings', label: 'Companies', value: o.totalCompanies, tone: 'warning' },
    { icon: 'bi-briefcase', label: 'Jobs', value: s.jobs, tone: 'info' },
    { icon: 'bi-calendar-event', label: 'Drives', value: s.drives, tone: 'primary' },
    { icon: 'bi-send-check', label: 'Applications', value: o.totalApplications, tone: 'warning' },
    { icon: 'bi-trophy', label: 'Placements', value: s.placements, tone: 'success' },
    { icon: 'bi-graph-up-arrow', label: 'Placement rate', value: `${o.placementRate}%`, tone: 'success' },
  ];

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="System overview">
        <Link to="/officer/analytics" className="btn btn-outline-primary">
          <i className="bi bi-bar-chart-line me-1"></i>Full analytics
        </Link>
      </PageHeader>

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-xl-3" key={c.label}><StatCard icon={c.icon} label={c.label} value={c.value} tone={c.tone} /></div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-6"><DepartmentPlacementCard /></div>
        <div className="col-lg-6"><PlacementTrendCard months={12} /></div>
        <div className="col-lg-6"><CompanyHiringCard /></div>
        <div className="col-lg-6"><StatusBreakdownCard /></div>
        <div className="col-12"><PackageCard /></div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h6>Accounts</h6>
              <ul className="list-unstyled small mb-3">
                <li className="d-flex justify-content-between mb-1"><span>Students</span><strong>{s.students}</strong></li>
                <li className="d-flex justify-content-between mb-1"><span>Placement officers</span><strong>{s.officers}</strong></li>
                <li className="d-flex justify-content-between mb-1"><span>Administrators</span><strong>{s.admins}</strong></li>
                <li className="d-flex justify-content-between"><span>Deactivated accounts</span><strong>{s.inactiveUsers}</strong></li>
              </ul>
              <Link to="/admin/users" className="btn btn-sm btn-outline-primary">Manage users</Link>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <span className="fw-semibold">System activity</span>
              <Link to="/admin/audit" className="small">Open audit log</Link>
            </div>
            {recentActivity.length === 0 ? (
              <EmptyState icon="bi-clipboard-data" title="No activity yet" />
            ) : (
              <ul className="list-group list-group-flush">
                {recentActivity.map((a) => (
                  <li key={a.auditId} className="list-group-item d-flex justify-content-between gap-3">
                    <div>
                      <span className={`badge rounded-pill me-2 bg-${a.action.startsWith('DB_') ? 'warning' : 'primary'}-subtle text-${a.action.startsWith('DB_') ? 'warning' : 'primary'}-emphasis`}>{a.action}</span>
                      <span className="small">{a.entityType}{a.entityId != null && ` #${a.entityId}`}</span>
                    </div>
                    <div className="small text-muted text-end text-nowrap">{a.userName || 'system'} · {formatDateTime(a.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
export default AdminDashboard;
