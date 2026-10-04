import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFetch } from '../../hooks/useFetch';
import { getUsers, createOfficer, setUserActive, resetUserPassword } from '../../services/userService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDate } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import FormInput from '../../components/FormInput';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROLE_TONES = { ADMIN: 'danger', PLACEMENT_OFFICER: 'primary', STUDENT: 'secondary' };
const ROLE_LABELS = { ADMIN: 'Admin', PLACEMENT_OFFICER: 'Officer', STUDENT: 'Student' };

// One small form reused for "add officer" (needs name + email + password) and "reset password" (password only)
function UserForm({ mode, user, onDone, onCancel }) {
  const isCreate = mode === 'create';
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isCreate) await createOfficer(form);
      else await resetUserPassword(user.userId, form.password);
      onDone(isCreate ? `Officer account created for ${form.email}` : `Password reset for ${user.fullName}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      {!isCreate && <p className="text-muted">Set a new password for <strong>{user.fullName}</strong>. Share it with them securely.</p>}
      {isCreate && (
        <>
          <FormInput label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
          <FormInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
        </>
      )}
      <FormInput label={isCreate ? 'Temporary password' : 'New password'} name="password" type="password"
        value={form.password} onChange={handleChange} required minLength={8} autoComplete="new-password" />
      <div className="form-text mb-3">At least 8 characters with a letter and a number.</div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isCreate ? 'Create officer' : 'Reset password'}
        </button>
      </div>
    </form>
  );
}

function Users() {
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useFetch(getUsers);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [modal, setModal] = useState(null);       // { mode: 'create' } or { mode: 'reset', user }
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const term = search.trim().toLowerCase();
  const visible = data.filter(
    (u) => (role === 'ALL' || u.role === role) && `${u.fullName} ${u.email}`.toLowerCase().includes(term)
  );

  const toggleActive = async (u) => {
    setActionError('');
    try {
      await setUserActive(u.userId, !u.isActive);
      setNotice(`${u.fullName} ${u.isActive ? 'deactivated' : 'activated'}`);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleDone = (message) => {
    setModal(null);
    setNotice(message);
    reload();
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Create placement officers and manage who can sign in">
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
          <i className="bi bi-person-plus me-1"></i>Add officer
        </button>
      </PageHeader>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="card">
        <div className="card-body border-bottom d-flex flex-wrap gap-2 justify-content-between">
          <div className="input-group" style={{ maxWidth: 340 }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search name or email"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="btn-group">
            {['ALL', 'STUDENT', 'PLACEMENT_OFFICER', 'ADMIN'].map((r) => (
              <button key={r} type="button"
                className={`btn btn-sm ${role === r ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setRole(r)}>
                {r === 'ALL' ? 'All' : ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="bi-people" title="No users match" text="Try another search or role." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.userId}>
                    <td>
                      <div className="fw-semibold">{u.fullName}{u.userId === me.id && <span className="text-muted fw-normal"> (you)</span>}</div>
                      <div className="small text-muted">{u.email}{u.rollNumber && ` · ${u.rollNumber}`}</div>
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-${ROLE_TONES[u.role]}-subtle text-${ROLE_TONES[u.role]}-emphasis`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td><StatusBadge status={u.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    <td className="small">{formatDate(u.createdAt)}</td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1">
                        <button className="btn btn-sm btn-outline-secondary"
                          onClick={() => setModal({ mode: 'reset', user: u })}>
                          <i className="bi bi-key me-1"></i>Reset password
                        </button>
                        {u.userId !== me.id && (
                          <button className={`btn btn-sm btn-outline-${u.isActive ? 'danger' : 'success'}`}
                            onClick={() => toggleActive(u)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'Add placement officer' : 'Reset password'} onClose={() => setModal(null)}>
          <UserForm mode={modal.mode} user={modal.user} onDone={handleDone} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
export default Users;
