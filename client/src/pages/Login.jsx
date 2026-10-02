import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import FormInput from '../components/FormInput';
import { getErrorMessage } from '../utils/getErrorMessage';
import { homePathFor } from '../utils/roleHome';

function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Skip the login page.
  if (!loading && user) return <Navigate to={homePathFor(user.role)} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form);
      navigate(homePathFor(loggedInUser.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 440 }}>
      <div className="text-center mb-4">
        <i className="bi bi-mortarboard-fill text-primary fs-1"></i>
        <h2 className="mt-2">Placement Cell Portal</h2>
        <p className="text-muted">Sign in to continue</p>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <FormInput label="Email" name="email" type="email" value={form.email}
              onChange={handleChange} required autoComplete="email" />
            <FormInput label="Password" name="password" type="password" value={form.password}
              onChange={handleChange} required autoComplete="current-password" />
            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center mt-3">
        New student? <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}

export default Login;