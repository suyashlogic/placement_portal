import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getDepartments } from '../services/departmentService';
import FormInput from '../components/FormInput';
import { getErrorMessage } from '../utils/getErrorMessage';
import { homePathFor } from '../utils/roleHome';

const emptyForm = {
  fullName: '', email: '', password: '', confirmPassword: '',
  rollNumber: '', departmentId: '', graduationYear: '', phone: '',
};

function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load the department dropdown once when the page opens
  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (!loading && user) return <Navigate to={homePathFor(user.role)} replace />;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const { confirmPassword, ...payload } = form; // don't send confirmPassword to the API
      const newUser = await register(payload);
      navigate(homePathFor(newUser.role), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 560 }}>
      <h2 className="text-center mb-4">Student Registration</h2>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <FormInput label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
            <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />

            <div className="row">
              <div className="col-md-6">
                <FormInput label="Password" name="password" type="password" value={form.password}
                  onChange={handleChange} required minLength={8} autoComplete="new-password" />
              </div>
              <div className="col-md-6">
                <FormInput label="Confirm password" name="confirmPassword" type="password"
                  value={form.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
              </div>
            </div>

            <FormInput label="Roll number" name="rollNumber" value={form.rollNumber} onChange={handleChange} required />

            <div className="mb-3">
              <label htmlFor="departmentId" className="form-label">Department</label>
              <select id="departmentId" name="departmentId" className="form-select"
                value={form.departmentId} onChange={handleChange} required>
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.departmentId} value={dept.departmentId}>
                    {dept.departmentName}
                  </option>
                ))}
              </select>
            </div>

            <div className="row">
              <div className="col-md-6">
                <FormInput label="Graduation year" name="graduationYear" type="number"
                  value={form.graduationYear} onChange={handleChange} required min={2000} max={2100} />
              </div>
              <div className="col-md-6">
                <FormInput label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Register'}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center mt-3">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}

export default Register;