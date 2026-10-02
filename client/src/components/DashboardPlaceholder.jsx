import { useAuth } from '../hooks/useAuth';

function DashboardPlaceholder({ title }) {
  const { user } = useAuth();

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h3>{title}</h3>
        <p className="mb-1">Welcome, <strong>{user.fullName}</strong>.</p>
        <p className="text-muted mb-0">
          Logged in as {user.email} (role: {user.role}). Real dashboard coming in a later phase.
        </p>
      </div>
    </div>
  );
}

export default DashboardPlaceholder;