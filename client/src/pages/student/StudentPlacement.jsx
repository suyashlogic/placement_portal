import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getMyPlacement } from '../../services/placementService';
import { getMyOffers } from '../../services/offerService';
import { formatDay } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const fetchStatus = async () => {
  const [placement, offers] = await Promise.all([getMyPlacement(), getMyOffers()]);
  return { placement, offers };
};

function StudentPlacement() {
  const { data, loading, error, reload } = useFetch(fetchStatus);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { placement, offers } = data;
  const openOffer = offers.find((o) => ['PENDING', 'ACCEPTED'].includes(o.status));

  return (
    <>
      <PageHeader title="Placement Status" subtitle="Your final placement details" />

      {placement ? (
        <div className="card border-success">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
              <div className="company-logo" style={{ width: 64, height: 64, fontSize: '1.6rem' }}>{placement.companyName[0]}</div>
              <div className="flex-grow-1">
                <h4 className="mb-0">{placement.companyName}</h4>
                <div className="text-muted">{placement.jobTitle}</div>
              </div>
              <span className="fs-6"><StatusBadge status={placement.status} /></span>
            </div>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="small text-muted">Final package</div>
                <div className="fs-4 fw-bold">₹{Number(placement.finalPackageLpa)} LPA</div>
              </div>
              <div className="col-md-4">
                <div className="small text-muted">Placement confirmed on</div>
                <div className="fw-semibold">{formatDay(placement.placementDate)}</div>
              </div>
              <div className="col-md-4">
                <div className="small text-muted">Joining date</div>
                <div className="fw-semibold">{formatDay(placement.joiningDate)}</div>
              </div>
            </div>
            <div className="small text-muted mt-4">Through the drive: {placement.driveTitle}</div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-4 text-center">
            <i className="bi bi-hourglass-split text-muted" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="mt-3">You are not placed yet</h5>
            {openOffer ? (
              <p className="text-muted mb-3">
                {openOffer.status === 'PENDING'
                  ? `${openOffer.companyName} has made you an offer. Review it to move forward.`
                  : `You accepted the offer from ${openOffer.companyName}. The placement cell will confirm your placement soon.`}
              </p>
            ) : (
              <p className="text-muted mb-3">Keep applying to drives you are eligible for.</p>
            )}
            <Link to={openOffer ? '/student/offers' : '/student/drives'} className="btn btn-primary">
              {openOffer ? 'View my offers' : 'Browse drives'}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
export default StudentPlacement;
