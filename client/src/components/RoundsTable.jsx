import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/format';

// Read-only list of interview / test rounds. Officers will create them in the next phase.
function RoundsTable({ rounds, emptyText = 'No rounds scheduled yet. You will be notified when there are.' }) {
  if (rounds.length === 0) {
    return <div className="small text-muted">{emptyText}</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead className="table-light">
          <tr><th>#</th><th>Round</th><th>When and where</th><th>Result</th></tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.selectionId}>
              <td>{r.roundNumber}</td>
              <td>
                <div className="fw-semibold">{r.roundName}</div>
                <div className="small text-muted">{r.roundType.replaceAll('_', ' ')}</div>
              </td>
              <td className="small">
                {r.scheduledAt ? formatDateTime(r.scheduledAt) : 'To be announced'}
                {r.location && <div className="text-muted">{r.location}</div>}
              </td>
              <td><StatusBadge status={r.result} />{r.remarks && <div className="small text-muted mt-1">{r.remarks}</div>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default RoundsTable;
