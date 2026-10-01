function StatusCard({ label, value, ok }) {
  return (
    <div className="col-md-6">
      <div className={`card border-${ok ? 'success' : 'danger'} shadow-sm`}>
        <div className="card-body">
          <h6 className="text-muted text-uppercase mb-2">{label}</h6>
          <span className={`badge bg-${ok ? 'success' : 'danger'} fs-6`}>
            <i className={`bi ${ok ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export default StatusCard;