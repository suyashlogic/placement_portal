import { Link } from 'react-router-dom';

function Unauthorized() {
  return (
    <div className="container py-5 text-center">
      <i className="bi bi-shield-lock text-danger" style={{ fontSize: '3rem' }}></i>
      <h2 className="mt-3">Access denied</h2>
      <p className="text-muted">You don't have permission to view this page.</p>
      <Link to="/" className="btn btn-primary">Go to my dashboard</Link>
    </div>
  );
}

export default Unauthorized;