import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getManagedDrives } from '../../services/driveService';
import { changeApplicationStatus } from '../../services/applicationService';
import {
  getSelectionBoard, createRound, createRoundForDrive, updateRound, recordResult,
} from '../../services/selectionService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { toDateTimeLocal, fromDateTimeLocal, formatDateTime } from '../../utils/format';
import FormInput from '../../components/FormInput';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const ROUND_TYPES = {
  APTITUDE: 'Aptitude test', CODING: 'Coding test', TECHNICAL: 'Technical interview',
  HR: 'HR interview', GROUP_DISCUSSION: 'Group discussion',
};

// Derived facts about one candidate. The database trigger is the real rule-keeper;
// these only decide which buttons to show.
const pendingRound = (c) => c.rounds.find((r) => r.result === 'PENDING');
const lastRound = (c) => c.rounds[c.rounds.length - 1];
const canAddRound = (c) =>
  c.status === 'SHORTLISTED' ||
  (c.status === 'INTERVIEW' && !pendingRound(c) && lastRound(c)?.result === 'PASSED');

const RESULT_TONE = { PENDING: 'warning', PASSED: 'success', FAILED: 'danger', ABSENT: 'secondary' };

// Teaches: ONE form reused for adding a round, rescheduling one, and creating one for everybody
function RoundForm({ initial, submitLabel, hint, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => ({
    roundName: initial?.roundName || '',
    roundType: initial?.roundType || 'TECHNICAL',
    scheduledAt: toDateTimeLocal(initial?.scheduledAt),
    location: initial?.location || '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ ...form, scheduledAt: fromDateTimeLocal(form.scheduledAt) });
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {hint && <div className="alert alert-info py-2 small">{hint}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <FormInput label="Round name" name="roundName" placeholder="e.g. Technical Interview"
        value={form.roundName} onChange={handleChange} required />
      <div className="mb-3">
        <label htmlFor="roundType" className="form-label">Round type</label>
        <select id="roundType" name="roundType" className="form-select" value={form.roundType} onChange={handleChange}>
          {Object.entries(ROUND_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="row">
        <div className="col-md-6">
          <FormInput label="Date and time" name="scheduledAt" type="datetime-local"
            value={form.scheduledAt} onChange={handleChange} />
        </div>
        <div className="col-md-6">
          <FormInput label="Room or meeting link" name="location" value={form.location} onChange={handleChange} />
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : submitLabel}</button>
      </div>
    </form>
  );
}

function ResultForm({ round, onSubmit, onCancel }) {
  const [result, setResult] = useState('PASSED');
  const [remarks, setRemarks] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({ result, remarks, isFinal });
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      <p className="text-muted">Round {round.roundNumber}: <strong>{round.roundName}</strong></p>
      <div className="btn-group w-100 mb-3">
        {['PASSED', 'FAILED', 'ABSENT'].map((r) => (
          <button key={r} type="button"
            className={`btn ${result === r ? `btn-${RESULT_TONE[r]}` : `btn-outline-${RESULT_TONE[r]}`}`}
            onClick={() => setResult(r)}>{r.charAt(0) + r.slice(1).toLowerCase()}</button>
        ))}
      </div>
      {result !== 'PASSED' && (
        <div className="alert alert-warning py-2 small">
          The application will be <strong>rejected</strong> automatically. A recorded result cannot be changed.
        </div>
      )}
      {result === 'PASSED' && (
        <div className="form-check mb-3">
          <input className="form-check-input" type="checkbox" id="isFinal" checked={isFinal}
            onChange={(e) => setIsFinal(e.target.checked)} />
          <label className="form-check-label" htmlFor="isFinal">
            This was the final round. <strong>Select the student.</strong>
          </label>
        </div>
      )}
      <textarea className="form-control mb-3" rows="2" maxLength={500} placeholder="Remarks (optional)"
        value={remarks} onChange={(e) => setRemarks(e.target.value)}></textarea>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className={`btn btn-${result === 'PASSED' ? 'success' : 'danger'}`} disabled={saving}>
          {saving ? 'Saving...' : 'Record result'}
        </button>
      </div>
    </form>
  );
}

function Selection() {
  const [params, setParams] = useSearchParams();
  const driveId = params.get('driveId') || '';

  const drives = useFetch(getManagedDrives);
  const fetchBoard = useCallback(() => (driveId ? getSelectionBoard(driveId) : Promise.resolve(null)), [driveId]);
  const board = useFetch(fetchBoard);

  const [modal, setModal] = useState(null);   // { type: 'add' | 'bulk' | 'edit' | 'result', candidate?, round? }
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);

  if (drives.loading && !drives.data) return <LoadingSpinner />;
  if (drives.error) return <ErrorMessage message={drives.error} onRetry={drives.reload} />;

  const selectDrive = (id) => {
    setParams(id ? { driveId: id } : {});
    setNotice('');
    setActionError('');
  };

  // Wraps a form action: run it, close the modal, show the message, refresh the board.
  // Errors are thrown back to the form, which shows them.
  const act = (fn) => async (payload) => {
    const message = await fn(payload);
    setModal(null);
    setNotice(message);
    board.reload();
  };

  const selectCandidate = async (c) => {
    setBusyId(c.applicationId);
    setActionError('');
    try {
      await changeApplicationStatus(c.applicationId, 'SELECTED', 'Selected after completing all rounds');
      setNotice(`${c.studentName} has been selected`);
      await board.reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const data = board.data;
  const candidates = data?.candidates || [];
  const count = (s) => candidates.filter((c) => c.status === s).length;
  const readyCount = candidates.filter(canAddRound).length;

  return (
    <>
      <PageHeader title="Selection Process" subtitle="Run rounds, record results and select candidates">
        {data && (
          <button className="btn btn-primary" disabled={readyCount === 0} onClick={() => setModal({ type: 'bulk' })}>
            <i className="bi bi-plus-lg me-1"></i>Round for all ready ({readyCount})
          </button>
        )}
      </PageHeader>

      <div className="card mb-3">
        <div className="card-body">
          <label className="form-label small mb-1" htmlFor="drive">Placement drive</label>
          <select id="drive" className="form-select" style={{ maxWidth: 480 }} value={driveId}
            onChange={(e) => selectDrive(e.target.value)}>
            <option value="">Choose a drive...</option>
            {drives.data.map((d) => (
              <option key={d.driveId} value={d.driveId}>{d.driveTitle} ({d.status.toLowerCase()})</option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      {!driveId && (
        <div className="card"><EmptyState icon="bi-diagram-3" title="Choose a drive"
          text="Shortlist candidates on the Applications page first, then run their rounds here." /></div>
      )}
      {driveId && board.loading && !data && <LoadingSpinner />}
      {driveId && board.error && <ErrorMessage message={board.error} onRetry={board.reload} />}

      {data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3"><StatCard icon="bi-list-check" label="Shortlisted" value={count('SHORTLISTED')} tone="info" /></div>
            <div className="col-6 col-md-3"><StatCard icon="bi-chat-dots" label="In interviews" value={count('INTERVIEW')} tone="warning" /></div>
            <div className="col-6 col-md-3"><StatCard icon="bi-patch-check" label="Selected" value={count('SELECTED')} tone="success" /></div>
            <div className="col-6 col-md-3"><StatCard icon="bi-x-octagon" label="Rejected in rounds" value={count('REJECTED')} tone="primary" /></div>
          </div>

          <div className="card">
            {candidates.length === 0 ? (
              <EmptyState icon="bi-people" title="No candidates yet"
                text="Shortlist applications for this drive from the Applications page." />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Candidate</th><th>Status</th><th>Rounds</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => {
                      const pending = pendingRound(c);
                      const allPassed = c.status === 'INTERVIEW' && !pending && lastRound(c)?.result === 'PASSED';
                      return (
                        <tr key={c.applicationId}>
                          <td>
                            <Link to={`/officer/applications/${c.applicationId}`} className="fw-semibold text-decoration-none">
                              {c.studentName}
                            </Link>
                            <div className="small text-muted">{c.rollNumber} · {c.departmentCode} · CGPA {Number(c.cgpa).toFixed(2)}</div>
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            {c.rounds.length === 0
                              ? <span className="small text-muted">No rounds yet</span>
                              : c.rounds.map((r) => (
                                <div key={r.selectionId} className="small mb-1">
                                  <span className={`badge rounded-pill bg-${RESULT_TONE[r.result]}-subtle text-${RESULT_TONE[r.result]}-emphasis me-1`}>
                                    R{r.roundNumber}
                                  </span>
                                  {r.roundName} · <span className="text-muted">{r.result.toLowerCase()}</span>
                                  {r.result === 'PENDING' && r.scheduledAt && (
                                    <span className="text-muted"> · {formatDateTime(r.scheduledAt)}</span>
                                  )}
                                </div>
                              ))}
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {canAddRound(c) && (
                                <button className="btn btn-sm btn-outline-primary"
                                  onClick={() => setModal({ type: 'add', candidate: c })}>
                                  <i className="bi bi-plus-lg me-1"></i>Add round
                                </button>
                              )}
                              {pending && (
                                <>
                                  <button className="btn btn-sm btn-primary"
                                    onClick={() => setModal({ type: 'result', candidate: c, round: pending })}>
                                    Record result
                                  </button>
                                  <button className="btn btn-sm btn-outline-secondary"
                                    onClick={() => setModal({ type: 'edit', candidate: c, round: pending })}>
                                    Reschedule
                                  </button>
                                </>
                              )}
                              {allPassed && (
                                <button className="btn btn-sm btn-success" disabled={busyId === c.applicationId}
                                  onClick={() => selectCandidate(c)}>
                                  {busyId === c.applicationId ? 'Selecting...' : 'Select'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modal?.type === 'add' && (
        <Modal title={`Add round for ${modal.candidate.studentName}`} onClose={() => setModal(null)}>
          <RoundForm submitLabel="Add round" onCancel={() => setModal(null)}
            onSubmit={act(async (p) => {
              const r = await createRound({ applicationId: modal.candidate.applicationId, ...p });
              return `Round ${r.roundNumber} added for ${modal.candidate.studentName}`;
            })} />
        </Modal>
      )}

      {modal?.type === 'bulk' && (
        <Modal title="Create a round for all ready candidates" onClose={() => setModal(null)}>
          <RoundForm submitLabel={`Create for ${readyCount} candidate(s)`} onCancel={() => setModal(null)}
            hint="Ready means shortlisted, or interviewing with the previous round passed and nothing pending."
            onSubmit={act(async (p) => {
              const r = await createRoundForDrive(driveId, p);
              return `Round created for ${r.created} candidate(s)`;
            })} />
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={`Reschedule ${modal.round.roundName}`} onClose={() => setModal(null)}>
          <RoundForm initial={modal.round} submitLabel="Save changes" onCancel={() => setModal(null)}
            onSubmit={act(async (p) => {
              await updateRound(modal.round.selectionId, p);
              return 'Round updated. The student has been notified.';
            })} />
        </Modal>
      )}

      {modal?.type === 'result' && (
        <Modal title={`Result for ${modal.candidate.studentName}`} onClose={() => setModal(null)}>
          <ResultForm round={modal.round} onCancel={() => setModal(null)}
            onSubmit={act(async (p) => {
              const r = await recordResult(modal.round.selectionId, p);
              return `Result recorded. Application is now ${r.applicationStatus.toLowerCase()}.`;
            })} />
        </Modal>
      )}
    </>
  );
}
export default Selection;
