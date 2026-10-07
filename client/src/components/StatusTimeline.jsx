import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/format';

// The audit trail of an application, written by a database trigger.
function StatusTimeline({ history, showActor = false }) {
  if (history.length === 0) return <div className="small text-muted">No history yet.</div>;

  return (
    <ul className="list-unstyled mb-0">
      {history.map((h) => (
        <li key={h.historyId} className="d-flex gap-3 pb-3">
          <i className="bi bi-circle-fill text-primary mt-1" style={{ fontSize: '.6rem' }}></i>
          <div>
            <div>
              {h.oldStatus && <><StatusBadge status={h.oldStatus} /><i className="bi bi-arrow-right mx-1"></i></>}
              <StatusBadge status={h.newStatus} />
            </div>
            <div className="small text-muted">
              {formatDateTime(h.changedAt)}{showActor && h.changedByName && ` · ${h.changedByName}`}
            </div>
            {h.remarks && <div className="small mt-1">{h.remarks}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
export default StatusTimeline;
