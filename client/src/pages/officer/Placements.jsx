import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getPlacementsOverview, confirmPlacement, markJoined } from '../../services/placementService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDay } from '../../utils/format';
import FormInput from '../../components/FormInput';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

// The final package can differ from the offer after negotiation, so it starts as the offer's value
function ConfirmForm({ offer, onSaved, onCancel }) {
  const [finalPackageLpa, setFinalPackageLpa] = useState(offer.packageLpa);
  const [joiningDate, setJoiningDate] = useState(offer.joiningDate || '');
  const [placementDate, setPlacementDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await confirmPlacement({ offerId: offer.offerId, finalPackageLpa, joiningDate, placementDate });
      onSaved(`Placement confirmed for ${offer.studentName}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      <p className="text-muted">
        <strong>{offer.studentName}</strong> accepted the offer from {offer.companyName} ({offer.jobTitle}).
      </p>
      <div className="row">
        <div className="col-md-6">
          <FormInput label="Final package (LPA)" name="finalPackageLpa" type="number" step="0.01" min="0.01"
            value={finalPackageLpa} onChange={(e) => setFinalPackageLpa(e.target.value)} required />
        </div>
        <div className="col-md-6">
          <FormInput label="Joining date" name="joiningDate" type="date"
            value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        </div>
      </div>
      <FormInput label="Placement date (leave empty for today)" name="placementDate" type="date"
        value={placementDate} onChange={(e) => setPlacementDate(e.target.value)} />
      <div className="alert alert-info py-2 small">
        The database allows only one placement per student. The student's application becomes <strong>Placed</strong>.
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-success" disabled={saving}>{saving ? 'Saving...' : 'Confirm placement'}</button>
      </div>
    </form>
  );
}

function Placements() {
  const { data, loading, error, reload } = useFetch(getPlacementsOverview);
  const [confirming, setConfirming] = useState(null);   // offer being confirmed
  const [joining, setJoining] = useState(null);         // placement being marked joined
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { placements, awaiting } = data;
  const joinedCount = placements.filter((p) => p.status === 'JOINED').length;

  const handleSaved = (message) => {
    setConfirming(null);
    setNotice(message);
    reload();
  };

  const handleJoined = async () => {
    setBusy(true);
    setActionError('');
    try {
      await markJoined(joining.placementId);
      setNotice(`${joining.studentName} is marked as joined`);
      setJoining(null);
      reload();
    } catch (err) {
      setJoining(null);
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Placements" subtitle="Confirm accepted offers and track joining" />

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4"><StatCard icon="bi-hourglass-split" label="Awaiting confirmation" value={awaiting.length} tone="warning" /></div>
        <div className="col-md-4"><StatCard icon="bi-patch-check" label="Placements confirmed" value={placements.length} tone="success" /></div>
        <div className="col-md-4"><StatCard icon="bi-briefcase" label="Joined" value={joinedCount} tone="primary" /></div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-white fw-semibold">Accepted offers awaiting placement confirmation</div>
        {awaiting.length === 0 ? (
          <EmptyState icon="bi-check2-all" title="Nothing waiting" text="Accepted offers appear here until you confirm them." />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr><th>Student</th><th>Company and role</th><th>Offered</th><th></th></tr>
              </thead>
              <tbody>
                {awaiting.map((o) => (
                  <tr key={o.offerId}>
                    <td>
                      <div className="fw-semibold">{o.studentName}</div>
                      <div className="small text-muted">{o.rollNumber} · {o.departmentCode}</div>
                    </td>
                    <td>{o.companyName} <span className="text-muted">· {o.jobTitle}</span></td>
                    <td>₹{Number(o.packageLpa)} LPA</td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-success" onClick={() => setConfirming(o)}>
                        <i className="bi bi-check2-circle me-1"></i>Confirm placement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header bg-white fw-semibold">Confirmed placements</div>
        {placements.length === 0 ? (
          <EmptyState icon="bi-trophy" title="No placements yet" />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Student</th><th>Company and role</th><th>Final package</th><th>Placed on</th><th>Joining</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {placements.map((p) => (
                  <tr key={p.placementId}>
                    <td>
                      <div className="fw-semibold">{p.studentName}</div>
                      <div className="small text-muted">{p.rollNumber} · {p.departmentCode}</div>
                    </td>
                    <td>{p.companyName} <span className="text-muted">· {p.jobTitle}</span></td>
                    <td>₹{Number(p.finalPackageLpa)} LPA</td>
                    <td className="small">{formatDay(p.placementDate)}</td>
                    <td className="small">{formatDay(p.joiningDate)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td className="text-end">
                      {p.status === 'CONFIRMED' && (
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setJoining(p)}>Mark joined</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirming && (
        <Modal title="Confirm placement" onClose={() => setConfirming(null)}>
          <ConfirmForm offer={confirming} onSaved={handleSaved} onCancel={() => setConfirming(null)} />
        </Modal>
      )}

      {joining && (
        <ConfirmDialog title="Mark as joined?"
          message={`Record that ${joining.studentName} has joined ${joining.companyName}. This cannot be undone.`}
          confirmLabel="Mark joined" variant="primary" busy={busy}
          onConfirm={handleJoined} onCancel={() => setJoining(null)} />
      )}
    </>
  );
}
export default Placements;
