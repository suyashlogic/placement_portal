import { useState, useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getOffers, getOfferCandidates, createOffer, updateOffer, expireOffer } from '../../services/offerService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDay, formatPackage } from '../../utils/format';
import FormInput from '../../components/FormInput';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUSES = ['', 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

// Teaches: ONE form for create (offer = null, pick a candidate) and edit (offer = object)
function OfferForm({ offer, candidates, onSaved, onCancel }) {
  const [applicationId, setApplicationId] = useState('');
  const [packageLpa, setPackageLpa] = useState(offer ? offer.packageLpa : '');
  const [joiningDate, setJoiningDate] = useState(offer?.joiningDate || '');
  const [remarks, setRemarks] = useState(offer?.remarks || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const picked = candidates.find((c) => String(c.applicationId) === applicationId);

  // Choosing a candidate pre-fills the package from the job's range (the officer can change it)
  const handlePick = (e) => {
    setApplicationId(e.target.value);
    const c = candidates.find((x) => String(x.applicationId) === e.target.value);
    if (c) setPackageLpa(c.minPackageLpa);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { packageLpa, joiningDate, remarks };
      if (offer) await updateOffer(offer.offerId, payload);
      else await createOffer({ applicationId: Number(applicationId), ...payload });
      onSaved(offer ? 'Offer updated' : 'Offer created. The student has been notified.');
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}

      {offer ? (
        <p className="text-muted">
          <strong>{offer.studentName}</strong> · {offer.companyName} · {offer.jobTitle}
        </p>
      ) : (
        <div className="mb-3">
          <label htmlFor="candidate" className="form-label">Selected candidate</label>
          <select id="candidate" className="form-select" value={applicationId} onChange={handlePick} required>
            <option value="">Choose a candidate...</option>
            {candidates.map((c) => (
              <option key={c.applicationId} value={c.applicationId}>
                {c.studentName} ({c.rollNumber}) · {c.companyName} · {c.jobTitle}
              </option>
            ))}
          </select>
          {candidates.length === 0 && (
            <div className="form-text text-warning">No selected candidates are waiting for an offer.</div>
          )}
          {picked && (
            <div className="form-text">Job package range: {formatPackage(picked.minPackageLpa, picked.maxPackageLpa)}</div>
          )}
        </div>
      )}

      <div className="row">
        <div className="col-md-6">
          <FormInput label="Package (LPA)" name="packageLpa" type="number" step="0.01" min="0.01"
            value={packageLpa} onChange={(e) => setPackageLpa(e.target.value)} required />
        </div>
        <div className="col-md-6">
          <FormInput label="Joining date" name="joiningDate" type="date"
            value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        </div>
      </div>
      <div className="mb-4">
        <label htmlFor="remarks" className="form-label">Remarks (shown to the student)</label>
        <textarea id="remarks" className="form-control" rows="2" maxLength={500}
          value={remarks} onChange={(e) => setRemarks(e.target.value)}></textarea>
      </div>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : offer ? 'Save changes' : 'Create offer'}
        </button>
      </div>
    </form>
  );
}

function Offers() {
  const [status, setStatus] = useState('');
  const fetchOffers = useCallback(() => getOffers(status), [status]);
  const offers = useFetch(fetchOffers);
  const candidates = useFetch(getOfferCandidates);

  const [modal, setModal] = useState(null);          // { offer } for the form (offer may be null)
  const [expiring, setExpiring] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  if (offers.loading && !offers.data) return <LoadingSpinner />;
  if (offers.error) return <ErrorMessage message={offers.error} onRetry={offers.reload} />;

  const refresh = () => { offers.reload(); candidates.reload(); };

  const handleSaved = (message) => {
    setModal(null);
    setNotice(message);
    refresh();
  };

  const handleExpire = async () => {
    setBusy(true);
    setActionError('');
    try {
      await expireOffer(expiring.offerId);
      setNotice(`The offer to ${expiring.studentName} was marked as expired`);
      setExpiring(null);
      refresh();
    } catch (err) {
      setExpiring(null);
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const candidateList = candidates.data || [];

  return (
    <>
      <PageHeader title="Offers" subtitle="Make offers to selected candidates and track their answers">
        <button className="btn btn-primary" onClick={() => setModal({ offer: null })}>
          <i className="bi bi-plus-lg me-1"></i>Create offer
          {candidateList.length > 0 && <span className="badge bg-light text-primary ms-2">{candidateList.length}</span>}
        </button>
      </PageHeader>

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="card">
        <div className="card-body border-bottom">
          <div className="btn-group flex-wrap">
            {STATUSES.map((s) => (
              <button key={s || 'all'} type="button"
                className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setStatus(s)}>
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}
              </button>
            ))}
          </div>
        </div>

        {offers.data.length === 0 ? (
          <EmptyState icon="bi-envelope-paper" title="No offers here"
            text="Select candidates on the Selection page, then create their offers." />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Student</th><th>Company and role</th><th>Package</th><th>Joining</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {offers.data.map((o) => (
                  <tr key={o.offerId}>
                    <td>
                      <div className="fw-semibold">{o.studentName}</div>
                      <div className="small text-muted">{o.rollNumber} · {o.departmentCode}</div>
                    </td>
                    <td>
                      <div>{o.companyName}</div>
                      <div className="small text-muted">{o.jobTitle}</div>
                    </td>
                    <td>₹{Number(o.packageLpa)} LPA</td>
                    <td className="small">{formatDay(o.joiningDate)}</td>
                    <td>
                      <StatusBadge status={o.status} />
                      {o.placementId && <div className="small text-success mt-1">Placed</div>}
                    </td>
                    <td className="text-end">
                      {o.status === 'PENDING' && (
                        <div className="d-flex justify-content-end gap-1">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setModal({ offer: o })}>
                            <i className="bi bi-pencil me-1"></i>Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setExpiring(o)}>Expire</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title={modal.offer ? 'Edit offer' : 'Create offer'} onClose={() => setModal(null)}>
          <OfferForm offer={modal.offer} candidates={candidateList}
            onSaved={handleSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {expiring && (
        <ConfirmDialog title="Mark offer as expired?"
          message={`${expiring.studentName} did not respond to the offer from ${expiring.companyName}. Their application will be closed. This cannot be undone.`}
          confirmLabel="Mark expired" variant="danger" busy={busy}
          onConfirm={handleExpire} onCancel={() => setExpiring(null)} />
      )}
    </>
  );
}
export default Offers;
