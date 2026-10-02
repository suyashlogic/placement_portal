function StatCard({ icon, label, value, tone = 'primary' }) {
  return (
    <div className="card stat-card h-100">
      <div className="card-body">
        <div className={`stat-icon tone-${tone}`}><i className={`bi ${icon}`}></i></div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  );
}
export default StatCard;