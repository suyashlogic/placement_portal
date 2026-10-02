function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="d-flex justify-content-center align-items-center py-5 text-muted">
      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
      {text}
    </div>
  );
}

export default LoadingSpinner;