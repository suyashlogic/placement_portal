import ErrorMessage from '../ErrorMessage';
import LoadingSpinner from '../LoadingSpinner';

// The frame every report sits in: title, optional buttons, and the loading / error states.
// Putting those states here means no widget can forget to handle a failed request.
function ChartCard({ title, subtitle, actions, loading, error, onRetry, children }) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h6 className="mb-0">{title}</h6>
            {subtitle && <div className="small text-muted">{subtitle}</div>}
          </div>
          {actions}
        </div>
        {error ? <ErrorMessage message={error} onRetry={onRetry} />
          : loading ? <LoadingSpinner /> : children}
      </div>
    </div>
  );
}
export default ChartCard;
