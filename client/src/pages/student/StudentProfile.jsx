import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getProfile, updateProfile } from '../../services/studentService';
import { getDepartments } from '../../services/departmentService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import FormInput from '../../components/FormInput';
import PageHeader from '../../components/PageHeader';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

function ProfileForm({ profile, departments }) {
  const [form, setForm] = useState({
    phone: profile.phone || '',
    dateOfBirth: profile.dateOfBirth || '',
    departmentId: String(profile.departmentId),
    graduationYear: profile.graduationYear,
    cgpa: profile.cgpa,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateProfile(form);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row">
        <div className="col-md-6">
          <FormInput label="Phone" name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div className="col-md-6">
          <FormInput label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="departmentId" className="form-label">Department</label>
        <select id="departmentId" name="departmentId" className="form-select"
          value={form.departmentId} onChange={handleChange} required>
          {departments.map((d) => (
            <option key={d.departmentId} value={d.departmentId}>{d.departmentName}</option>
          ))}
        </select>
      </div>

      <div className="row">
        <div className="col-md-6">
          <FormInput label="Graduation year" name="graduationYear" type="number"
            value={form.graduationYear} onChange={handleChange} required min={2000} max={2100} />
        </div>
        <div className="col-md-6">
          <FormInput label="CGPA" name="cgpa" type="number" step="0.01" min="0" max="10"
            value={form.cgpa} onChange={handleChange} required />
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}

function StudentProfile() {
  const profile = useFetch(getProfile);
  const departments = useFetch(getDepartments);

  if ((profile.loading && !profile.data) || (departments.loading && !departments.data)) {
    return <LoadingSpinner />;
  }
  if (profile.error || departments.error) {
    return <ErrorMessage message={profile.error || departments.error}
      onRetry={() => { profile.reload(); departments.reload(); }} />;
  }

  const p = profile.data;
  const initials = p.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <PageHeader title="My Profile" subtitle="Your academic details decide which drives you are eligible for" />
      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card text-center">
            <div className="card-body">
              <div className="avatar avatar-lg mb-3">{initials}</div>
              <h5 className="mb-0">{p.fullName}</h5>
              <div className="text-muted small mb-3">{p.email}</div>
              <span className="badge bg-primary-subtle text-primary-emphasis mb-2">{p.departmentName}</span>
              <div className="small text-muted">Roll number: <strong>{p.rollNumber}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body p-4">
              <h6 className="mb-3">Academic and contact information</h6>
              <ProfileForm profile={p} departments={departments.data} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default StudentProfile;