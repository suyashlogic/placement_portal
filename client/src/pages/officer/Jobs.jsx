import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getJobs, createJob, updateJob } from '../../services/jobService';
import { getCompanies } from '../../services/companyService';
import { getSkillCatalog } from '../../services/studentService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatPackage } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const LEVELS = { 1: 'Beginner', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };
const TYPES = { FULL_TIME: 'Full time', INTERNSHIP: 'Internship', CONTRACT: 'Contract' };

// Teaches: a form that edits an ARRAY in state (the job's required skills)
function JobForm({ job, companies, skillCatalog, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    companyId: job ? String(job.companyId) : '',
    jobTitle: job?.jobTitle || '',
    jobDescription: job?.jobDescription || '',
    jobLocation: job?.jobLocation || '',
    employmentType: job?.employmentType || 'FULL_TIME',
    minPackageLpa: job?.minPackageLpa || '',
    maxPackageLpa: job?.maxPackageLpa || '',
    jobStatus: job?.jobStatus || 'OPEN',
  }));
  const [skills, setSkills] = useState(() => job?.skills || []);
  const [pick, setPick] = useState({ skillId: '', level: 3 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const available = skillCatalog.filter((k) => !skills.some((s) => s.skillId === k.skillId));

  const addSkill = () => {
    if (!pick.skillId) return;
    const skill = skillCatalog.find((k) => k.skillId === Number(pick.skillId));
    setSkills([...skills, { skillId: skill.skillId, skillName: skill.skillName, requiredLevel: Number(pick.level) }]);
    setPick({ ...pick, skillId: '' });
  };
  const changeLevel = (id, level) =>
    setSkills(skills.map((s) => (s.skillId === id ? { ...s, requiredLevel: Number(level) } : s)));
  const removeSkill = (id) => setSkills(skills.filter((s) => s.skillId !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      ...form,
      skills: skills.map(({ skillId, requiredLevel }) => ({ skillId, requiredLevel })),
    };
    try {
      if (job) await updateJob(job.jobId, payload);
      else await createJob(payload);
      onSaved(job ? 'Job updated' : 'Job created');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="companyId" className="form-label">Company</label>
          <select id="companyId" name="companyId" className="form-select" value={form.companyId}
            onChange={handleChange} required>
            <option value="">Select company</option>
            {companies.map((c) => (
              <option key={c.companyId} value={c.companyId}>
                {c.companyName}{c.status === 'INACTIVE' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <FormInput label="Job title" name="jobTitle" value={form.jobTitle} onChange={handleChange} required />
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="jobDescription" className="form-label">Description</label>
        <textarea id="jobDescription" name="jobDescription" rows="3" className="form-control"
          value={form.jobDescription} onChange={handleChange}></textarea>
      </div>

      <div className="row">
        <div className="col-md-6"><FormInput label="Location" name="jobLocation" value={form.jobLocation} onChange={handleChange} /></div>
        <div className="col-md-6 mb-3">
          <label htmlFor="employmentType" className="form-label">Employment type</label>
          <select id="employmentType" name="employmentType" className="form-select"
            value={form.employmentType} onChange={handleChange}>
            {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="row">
        <div className="col-md-4">
          <FormInput label="Min package (LPA)" name="minPackageLpa" type="number" step="0.01" min="0.01"
            value={form.minPackageLpa} onChange={handleChange} required />
        </div>
        <div className="col-md-4">
          <FormInput label="Max package (LPA)" name="maxPackageLpa" type="number" step="0.01" min="0.01"
            value={form.maxPackageLpa} onChange={handleChange} required />
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="jobStatus" className="form-label">Status</label>
          <select id="jobStatus" name="jobStatus" className="form-select" value={form.jobStatus} onChange={handleChange}>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      <h6 className="mt-2">Required skills</h6>
      <div className="small text-muted mb-2">
        Students need at least this level in every skill listed to be eligible for drives on this job.
      </div>
      {skills.length === 0 && <div className="small text-muted mb-2">No skills required.</div>}
      {skills.map((s) => (
        <div key={s.skillId} className="d-flex align-items-center gap-2 mb-2">
          <span className="flex-grow-1 fw-semibold">{s.skillName}</span>
          <select className="form-select form-select-sm w-auto" value={s.requiredLevel}
            onChange={(e) => changeLevel(s.skillId, e.target.value)}>
            {Object.entries(LEVELS).map(([n, l]) => <option key={n} value={n}>{n} · {l}</option>)}
          </select>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeSkill(s.skillId)}
            aria-label={`Remove ${s.skillName}`}><i className="bi bi-x-lg"></i></button>
        </div>
      ))}
      <div className="d-flex gap-2 mb-4">
        <select className="form-select" value={pick.skillId} onChange={(e) => setPick({ ...pick, skillId: e.target.value })}>
          <option value="">Add a skill...</option>
          {available.map((k) => <option key={k.skillId} value={k.skillId}>{k.skillName}</option>)}
        </select>
        <select className="form-select w-auto" value={pick.level} onChange={(e) => setPick({ ...pick, level: e.target.value })}>
          {Object.entries(LEVELS).map(([n, l]) => <option key={n} value={n}>{n} · {l}</option>)}
        </select>
        <button type="button" className="btn btn-outline-primary" onClick={addSkill} disabled={!pick.skillId}>Add</button>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : job ? 'Save changes' : 'Add job'}
        </button>
      </div>
    </form>
  );
}

function Jobs() {
  const jobs = useFetch(getJobs);
  const companies = useFetch(getCompanies);
  const catalog = useFetch(getSkillCatalog);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');

  const firstLoad = [jobs, companies, catalog].some((f) => f.loading && !f.data);
  const firstError = jobs.error || companies.error || catalog.error;
  if (firstLoad) return <LoadingSpinner />;
  if (firstError) {
    return <ErrorMessage message={firstError}
      onRetry={() => { jobs.reload(); companies.reload(); catalog.reload(); }} />;
  }

  const term = search.trim().toLowerCase();
  const visible = jobs.data.filter((j) =>
    `${j.jobTitle} ${j.companyName}`.toLowerCase().includes(term)
  );

  const handleSaved = (message) => {
    setModal(null);
    setNotice(message);
    jobs.reload();
  };

  return (
    <>
      <PageHeader title="Jobs" subtitle="Roles offered by companies, with the skills they require">
        <button className="btn btn-primary" onClick={() => setModal({ job: null })}
          disabled={companies.data.length === 0}>
          <i className="bi bi-plus-lg me-1"></i>Add job
        </button>
      </PageHeader>

      {companies.data.length === 0 && (
        <div className="alert alert-warning">Add a company first, then you can create jobs for it.</div>
      )}
      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}

      <div className="card">
        <div className="card-body border-bottom">
          <div className="input-group" style={{ maxWidth: 340 }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search job or company"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon="bi-briefcase" title="No jobs found"
            text={jobs.data.length === 0 ? 'Create a job before you create a drive.' : 'Try a different search.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Job</th><th>Company</th><th>Package</th><th>Type</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((j) => (
                  <tr key={j.jobId}>
                    <td>
                      <div className="fw-semibold">{j.jobTitle}</div>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {j.skills.length === 0
                          ? <span className="small text-muted">No skill requirements</span>
                          : j.skills.map((s) => (
                            <span key={s.skillId} className="badge bg-primary-subtle text-primary-emphasis">
                              {s.skillName} {s.requiredLevel}+
                            </span>
                          ))}
                      </div>
                    </td>
                    <td>{j.companyName}</td>
                    <td>{formatPackage(j.minPackageLpa, j.maxPackageLpa)}</td>
                    <td>{TYPES[j.employmentType]}</td>
                    <td><StatusBadge status={j.jobStatus} /></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setModal({ job: j })}>
                        <i className="bi bi-pencil me-1"></i>Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.job ? 'Edit job' : 'Add job'} size="modal-lg" onClose={() => setModal(null)}>
          <JobForm job={modal.job} companies={companies.data} skillCatalog={catalog.data}
            onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
export default Jobs;
