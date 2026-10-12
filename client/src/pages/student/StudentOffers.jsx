import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getMyOffers, decideOffer } from '../../services/offerService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatDay } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_NOTE = {
  ACCEPTED: 'You accepted this offer. The placement cell will confirm your placement.',
  REJECTED: 'You rejected this offer.',
  EXPIRED: 'This offer expired.',
};

function StudentOffers() {
  const { data, loading, error, reload } = useFetch(getMyOffers);
  const [pending, setPending] = useState(null);      // { offer, decision } waiting for confirmation
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const handleDecision = async () => {
    setBusy(true);
    setActionError('');
    try {
      // React sends only the offer id and the decision. The server checks the offer is YOURS and still pending.
      await decideOffer(pending.offer.offerId, pending.decision);
      setNotice(pending.decision === 'ACCEPT' ? 'Offer accepted. Congratulations!' : 'Offer rejected.');
      setPending(null);
      await reload();
    } catch (err) {
      setPending(null);
      setActionError(getErrorMessage(err));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const accepting = pending?.decision === 'ACCEPT';

  return (
    <>
      <PageHeader title="My Offers" subtitle="Offers made to you by companies" />

      {notice && <div className="alert alert-success alert-dismissible">
        {notice}<button type="button" className="btn-close" onClick={() => setNotice('')}></button>
      </div>}
      {actionError && <div className="alert alert-danger">{actionError}</div>}

      {data.length === 0 ? (
        <div className="card"><EmptyState icon="bi-envelope-paper" title="No offers yet"
          text="When a company makes you an offer, it appears here." /></div>
      ) : (
        <div className="row g-3">
          {data.map((o) => (
            <div className="col-lg-6" key={o.offerId}>
              <div className="card h-100">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="company-logo">{o.companyName[0]}</div>
                    <StatusBadge status={o.status} />
                  </div>
                  <h5 className="mb-0">{o.companyName}</h5>
                  <div className="text-muted mb-3">{o.jobTitle} · {o.driveTitle}</div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="small text-muted">Package</div>
                      <div className="fs-5 fw-bold">₹{Number(o.packageLpa)} LPA</div>
                    </div>
                    <div className="col-6">
                      <div className="small text-muted">Joining date</div>
                      <div className="fw-semibold">{formatDay(o.joiningDate)}</div>
                    </div>
                  </div>
                  {o.remarks && <div className="small text-muted mb-3">“{o.remarks}”</div>}
                  <div className="small text-muted mb-3">Offered on {formatDay(o.offerDate)}</div>

                  <div className="mt-auto">
                    {o.status === 'PENDING' ? (
                      <div className="d-flex gap-2">
                        <button className="btn btn-success flex-fill" onClick={() => setPending({ offer: o, decision: 'ACCEPT' })}>
                          <i className="bi bi-check-lg me-1"></i>Accept
                        </button>
                        <button className="btn btn-outline-danger flex-fill" onClick={() => setPending({ offer: o, decision: 'REJECT' })}>
                          <i className="bi bi-x-lg me-1"></i>Reject
                        </button>
                      </div>
                    ) : (
                      <div className="small text-muted">
                        {o.placementId ? 'Your placement has been confirmed.' : STATUS_NOTE[o.status]}{' '}
                        {o.placementId && <Link to="/student/placement">View placement</Link>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={accepting ? 'Accept this offer?' : 'Reject this offer?'}
          message={accepting
            ? `You are accepting ₹${Number(pending.offer.packageLpa)} LPA from ${pending.offer.companyName}. This cannot be undone.`
            : `You are rejecting the offer from ${pending.offer.companyName}. Your application will be closed and this cannot be undone.`}
          confirmLabel={accepting ? 'Accept offer' : 'Reject offer'}
          variant={accepting ? 'success' : 'danger'}
          busy={busy}
          onConfirm={handleDecision}
          onCancel={() => setPending(null)} />
      )}
    </>
  );
}
export default StudentOffers;
