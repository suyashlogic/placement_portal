import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getCompanies, createCompany, updateCompany } from '../../services/companyService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const EMPTY = {
  companyName: '', industry: '', location: '', website: '',
  description: '', contactPerson: '', contactEmail: '', status: 'ACTIVE',
};

// Teaches: one form component used for BOTH create (company = null) and edit (company = object)
function CompanyForm({ company, onSaved, onCancel }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(Object.keys(EMPTY).map((k) => [k, company?.[k] ?? EMPTY[k]]))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (company) await updateCompany(company.companyId, form);
      else await createCompany(form);
      onSaved(company ? 'Company updated' : 'Company created');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      <FormInput label="Company name" name="companyName" value={form.companyName} onChange={handleChange} required />
      <div className="row">
        <div className="col-md-6"><FormInput label="Industry" name="industry" value={form.industry} onChange={handleChange} /></div>
        <div className="col-md-6"><FormInput label="Location" name="location" value={form.location} onChange={handleChange} /></div>
      </div>
      <FormInput label="Website" name="website" placeholder="https://example.com" value={form.website} onChange={handleChange} />
      <div className="mb-3">
        <label htmlFor="description" className="form-label">Description</label>
        <textarea id="description" name="description" rows="3" className="form-control"
          value={form.description} onChange={handleChange}></textarea>
      </div>
      <div className="row">
        <div className="col-md-6"><FormInput label="Contact person" name="contactPerson" value={form.contactPerson} onChange={handleChange} /></div>
        <div className="col-md-6"><FormInput label="Contact email" name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} /></div>
      </div>
      <div className="mb-4">
        <label htmlFor="status" className="form-label">Status</label>
        <select id="status" name="status" className="form-select" value={form.status} onChange={handleChange}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : company ? 'Save changes' : 'Add company'}
        </button>
      </div>
    </form>
  );
}

function Companies() {
  const { data, loading, error, reload } = useFetch(getCompanies);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);   // null = closed, { company } = open (company may be null)
  const [notice, setNotice] = useState('');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const term = search.trim().toLowerCase();
  const visible = data.filter((c) =>
    `${c.companyName} ${c.industry || ''} ${c.location || ''}`.toLowerCase().includes(term)
  );

  const handleSaved = (message) => {
    setModal(null);
    setNotice(message);
    reload();
  };

  return (
    <>
      <PageHeader title="Companies" subtitle="Recruiters who visit campus">
        <button className="btn btn-primary" onClick={() => setModal({ company: null })}>
          <i className="bi bi-plus-lg me-1"></i>Add company
        </button>
      </PageHeader>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}

      <div className="card">
        <div className="card-body border-bottom">
          <div className="input-group" style={{ maxWidth: 340 }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search company, industry or city"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon="bi-buildings" title="No companies found"
            text={data.length === 0 ? 'Add your first company to start creating jobs.' : 'Try a different search.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Company</th><th>Industry</th><th>Contact</th><th className="text-center">Jobs</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.companyId}>
                    <td>
                      <div className="fw-semibold">{c.companyName}</div>
                      <div className="small text-muted">{c.location || 'Location not set'}</div>
                    </td>
                    <td>{c.industry || '–'}</td>
                    <td>
                      <div>{c.contactPerson || '–'}</div>
                      <div className="small text-muted">{c.contactEmail}</div>
                    </td>
                    <td className="text-center">{c.jobCount}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setModal({ company: c })}>
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
        <Modal title={modal.company ? 'Edit company' : 'Add company'} onClose={() => setModal(null)}>
          <CompanyForm company={modal.company} onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
export default Companies;
