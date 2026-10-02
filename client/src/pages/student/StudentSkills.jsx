import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getSkillCatalog, getMySkills, saveSkill, removeSkill } from '../../services/studentService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const LEVELS = { 1: 'Beginner', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };

function StudentSkills() {
  const catalog = useFetch(getSkillCatalog);
  const mine = useFetch(getMySkills);

  const [skillId, setSkillId] = useState('');
  const [level, setLevel] = useState(3);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if ((catalog.loading && !catalog.data) || (mine.loading && !mine.data)) return <LoadingSpinner />;
  if (catalog.error || mine.error) {
    return <ErrorMessage message={catalog.error || mine.error}
      onRetry={() => { catalog.reload(); mine.reload(); }} />;
  }

  const available = catalog.data.filter((s) => !mine.data.some((m) => m.skillId === s.skillId));

  const save = async (id, lvl) => {
    setBusy(true);
    setError('');
    try {
      await saveSkill({ skillId: Number(id), proficiencyLevel: Number(lvl) });
      await mine.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!skillId) return;
    await save(skillId, level);
    setSkillId('');
  };

  const handleRemove = async (id) => {
    setBusy(true);
    setError('');
    try {
      await removeSkill(id);
      await mine.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My Skills" subtitle="Drives require minimum skill levels. Keep these accurate." />
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={handleAdd}>
            <div className="col-md-5">
              <label className="form-label small mb-1">Skill</label>
              <select className="form-select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">Select a skill</option>
                {available.map((s) => <option key={s.skillId} value={s.skillId}>{s.skillName}</option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small mb-1">Proficiency</label>
              <select className="form-select" value={level} onChange={(e) => setLevel(e.target.value)}>
                {Object.entries(LEVELS).map(([n, label]) => <option key={n} value={n}>{n} · {label}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <button className="btn btn-primary w-100" disabled={busy || !skillId}>
                <i className="bi bi-plus-lg me-1"></i>Add skill
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        {mine.data.length === 0 ? (
          <EmptyState icon="bi-lightning-charge" title="No skills yet" text="Add your first skill above." />
        ) : (
          <ul className="list-group list-group-flush">
            {mine.data.map((s) => (
              <li key={s.skillId} className="list-group-item py-3">
                <div className="row align-items-center g-2">
                  <div className="col-md-4 fw-semibold">{s.skillName}</div>
                  <div className="col-md-4">
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar" style={{ width: `${s.proficiencyLevel * 20}%` }}></div>
                    </div>
                  </div>
                  <div className="col-8 col-md-3">
                    <select className="form-select form-select-sm" value={s.proficiencyLevel} disabled={busy}
                      onChange={(e) => save(s.skillId, e.target.value)}>
                      {Object.entries(LEVELS).map(([n, label]) => <option key={n} value={n}>{n} · {label}</option>)}
                    </select>
                  </div>
                  <div className="col-4 col-md-1 text-end">
                    <button className="btn btn-sm btn-outline-danger" disabled={busy}
                      onClick={() => handleRemove(s.skillId)} aria-label={`Remove ${s.skillName}`}>
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
export default StudentSkills;