import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch';
import { getMyOffers } from '../services/offerService';
import { getMyPlacement } from '../services/placementService';

// Defined OUTSIDE the component so useFetch gets the same function every render
const fetchStatus = async () => {
  const [offers, placement] = await Promise.all([getMyOffers(), getMyPlacement()]);
  return { offers, placement };
};

// Shows the most important thing first: placed, else pending offers, else nothing
function PlacementBanner() {
  const { data } = useFetch(fetchStatus);
  if (!data) return null;          // loading or failed: the dashboard works fine without it

  const { offers, placement } = data;
  const pending = offers.filter((o) => o.status === 'PENDING').length;

  if (placement) {
    return (
      <div className="alert alert-success d-flex flex-wrap justify-content-between align-items-center">
        <span><i className="bi bi-trophy-fill me-2"></i>
          You are placed at <strong>{placement.companyName}</strong> as {placement.jobTitle}. Congratulations!</span>
        <Link to="/student/placement" className="btn btn-sm btn-success">View details</Link>
      </div>
    );
  }
  if (pending > 0) {
    return (
      <div className="alert alert-warning d-flex flex-wrap justify-content-between align-items-center">
        <span><i className="bi bi-envelope-paper-fill me-2"></i>
          You have <strong>{pending}</strong> offer{pending > 1 ? 's' : ''} waiting for your decision.</span>
        <Link to="/student/offers" className="btn btn-sm btn-warning">Review now</Link>
      </div>
    );
  }
  return null;
}
export default PlacementBanner;
