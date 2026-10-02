function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center">
      <span><i className="bi bi-exclamation-triangle me-2"></i>{message}</span>
      {onRetry && <button className="btn btn-sm btn-outline-danger" onClick={onRetry}>Retry</button>}
    </div>
  );
}
export default ErrorMessage;