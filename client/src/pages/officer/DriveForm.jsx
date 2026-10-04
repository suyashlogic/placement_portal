import { useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getManagedDrive, createDrive, updateDrive } from '../../services/driveService';
import { getJobs } from '../../services/jobService';
import { getDepartments } from '../../services/departmentService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { toDateTimeLocal, fromDateTimeLocal } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// The form itself. It only mounts AFTER the data has loaded, so useState can read the props directly.
function DriveFormBody({ drive, jobs, departments }) {
  const navigate = useNavigate();
  const isEdit = Boolean(drive);
  const locked = drive && ['COMPLETED', 'CANCELLED'].includes(drive.status);

  const [form, setForm] = useState({
    jobId: drive ? String(drive.jobId) : '',
    driveTitle: drive?.driveTitle || '',
    description: drive?.description || '',
    registrationOpenDate: toDateTimeLocal(drive?.registrationOpenDate),
    registrationDeadline: toDateTimeLocal(drive?.registrationDeadline),
    driveDate: toDateTimeLocal(drive?.driveDate),
    minCgpa: drive ? Number(drive.minCgpa) : 0,
    graduationYear: drive?.graduationYear ?? '',
  });
  const [departmentIds, setDepartmentIds] = useState(drive?.departmentIds || []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const toggleDepartment = (id) =>
    setDepartmentIds(departmentIds.includes(id)
      ? departmentIds.filter((d) => d !== id)
      : [...departmentIds, id]);

  // Closed jobs can't get new drives, but keep the drive's current job selectable when editing
  const jobOptions = jobs.filter((j) => j.jobStatus === 'OPEN' || j.jobId === drive?.jobId);
  const selectedJob = jobs.find((j) => String(j.jobId) === form.jobId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      registrationOpenDate: fromDateTimeLocal(form.registrationOpenDate),
      registrationDeadline: fromDateTimeLocal(form.registrationDeadline),
      driveDate: fromDateTimeLocal(form.driveDate),
      departmentIds,
    };
    try {
      if (isEdit) await updateDrive(drive.driveId, payload);
      else await createDrive(payload);
      navigate('/officer/drives', {
        state: { notice: isEdit ? 'Drive updated' : 'Drive created as a draft. Publish it when you are ready.' },
      });
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {locked && <div className="alert alert-warning">This drive is {drive.status.toLowerCase()} and can no longer be edited.</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="card">
            <div className="card-body p-4">
              <h6 className="mb-3">Drive details</h6>

              <div className="mb-3">
                <label htmlFor="jobId" className="form-label">Job</label>
                <select id="jobId" name="jobId" className="form-select" value={form.jobId}
                  onChange={handleChange} required disabled={locked}>
                  <option value="">Select a job</option>
                  {jobOptions.map((j) => (
                    <option key={j.jobId} value={j.jobId}>{j.companyName} · {j.jobTitle}</option>
                  ))}
                </select>
              </div>

              <FormInput label="Drive title" name="driveTitle" value={form.driveTitle}
                onChange={handleChange} required disabled={locked} />

              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea id="description" name="description" rows="3" className="form-control"
                  value={form.description} onChange={handleChange} disabled={locked}></textarea>
              </div>

              <div className="row">
                <div className="col-md-4">
                  <FormInput label="Registration opens" name="registrationOpenDate" type="datetime-local"
                    value={form.registrationOpenDate} onChange={handleChange} required disabled={locked} />
                </div>
                <div className="col-md-4">
                  <FormInput label="Registration closes" name="registrationDeadline" type="datetime-local"
                    value={form.registrationDeadline} onChange={handleChange} required disabled={locked} />
                </div>
                <div className="col-md-4">
                  <FormInput label="Drive date" name="driveDate" type="datetime-local"
                    value={form.driveDate} onChange={handleChange} required disabled={locked} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card mb-3">
            <div className="card-body p-4">
              <h6 className="mb-3">Eligibility</h6>
              <div className="row">
                <div className="col-6">
                  <FormInput label="Minimum CGPA" name="minCgpa" type="number" step="0.01" min="0" max="10"
                    value={form.minCgpa} onChange={handleChange} required disabled={locked} />
                </div>
                <div className="col-6">
                  <FormInput label="Graduation year" name="graduationYear" type="number" min="2000" max="2100"
                    placeholder="Any year" value={form.graduationYear} onChange={handleChange} disabled={locked} />
                </div>
              </div>

              <div className="form-label">Departments</div>
              <div className="small text-muted mb-2">Tick the departments that may apply. Tick none to allow all.</div>
              {departments.map((dept) => (
                <div className="form-check" key={dept.departmentId}>
                  <input className="form-check-input" type="checkbox" id={`dept-${dept.departmentId}`}
                    checked={departmentIds.includes(dept.departmentId)}
                    onChange={() => toggleDepartment(dept.departmentId)} disabled={locked} />
                  <label className="form-check-label" htmlFor={`dept-${dept.departmentId}`}>
                    {dept.departmentName} <span className="text-muted">({dept.departmentCode})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-body p-4">
              <h6 className="mb-2">Skills required</h6>
              {!selectedJob ? (
                <div className="small text-muted">Choose a job to see its skill requirements. Edit them on the Jobs page.</div>
              ) : selectedJob.skills.length === 0 ? (
                <div className="small text-muted">This job has no skill requirements.</div>
              ) : (
                <div className="d-flex flex-wrap gap-1">
                  {selectedJob.skills.map((s) => (
                    <span key={s.skillId} className="badge bg-primary-subtle text-primary-emphasis">
                      {s.skillName} {s.requiredLevel}+
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <Link to="/officer/drives" className="btn btn-light">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={saving || locked}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create drive'}
        </button>
      </div>
    </form>
  );
}

// Teaches: useParams + ONE page serving two routes (/new and /:id/edit).
function DriveForm() {
  const { id } = useParams();                                   // undefined on /new
  const fetchDrive = useCallback(() => (id ? getManagedDrive(id) : Promise.resolve(null)), [id]);
  const drive = useFetch(fetchDrive);
  const jobs = useFetch(getJobs);
  const departments = useFetch(getDepartments);

  const all = [drive, jobs, departments];
  if (all.some((f) => f.loading && f.data === null && !f.error)) return <LoadingSpinner />;
  const firstError = all.find((f) => f.error)?.error;
  if (firstError) {
    return <ErrorMessage message={firstError} onRetry={() => all.forEach((f) => f.reload())} />;
  }

  return (
    <>
      <Link to="/officer/drives" className="small text-decoration-none">
        <i className="bi bi-arrow-left me-1"></i>Back to drives
      </Link>
      <div className="mt-2">
        <PageHeader title={id ? 'Edit drive' : 'Create placement drive'}
          subtitle="New drives start as drafts. Students cannot see them until you publish." />
      </div>
      <DriveFormBody key={id || 'new'} drive={drive.data} jobs={jobs.data} departments={departments.data} />
    </>
  );
}
export default DriveForm;
