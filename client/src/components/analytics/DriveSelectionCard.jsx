import { useFetch } from '../../hooks/useFetch';
import { getDriveSelection } from '../../services/analyticsService';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const COLUMNS = [
  { header: 'Drive', value: 'driveTitle' }, { header: 'Company', value: 'companyName' },
  { header: 'Applications', value: 'applications' }, { header: 'Shortlisted', value: 'shortlisted' },
  { header: 'Selected', value: 'selected' }, { header: 'Offered', value: 'offered' },
  { header: 'Selection ratio (%)', value: 'selectionRatio' },
];

// Drive-wise selection ratio: selected / applications, for every drive that received applications
function DriveSelectionCard({ limit = 12 }) {
  const { data, loading, error, reload } = useFetch(getDriveSelection);
  const ranked = data ? data.filter((d) => d.applications > 0).sort((a, b) => b.selectionRatio - a.selectionRatio) : [];

  return (
    <ChartCard title="Drive-wise selection ratio"
      subtitle={data ? `Selected ÷ applications · top ${Math.min(limit, ranked.length)} of ${ranked.length} drives` : ' '}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="drive-selection-ratio.csv" columns={COLUMNS} rows={ranked} />}>
      {data && (ranked.length === 0 ? <div className="text-muted small py-3">No drive has received applications yet</div> : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead className="table-light">
              <tr><th>Drive</th><th className="text-end">Applied</th><th className="text-end">Shortlisted</th>
                <th className="text-end">Selected</th><th className="text-end">Offered</th><th style={{ minWidth: 130 }}>Ratio</th></tr>
            </thead>
            <tbody>
              {ranked.slice(0, limit).map((d) => (
                <tr key={d.driveId}>
                  <td><div className="fw-semibold">{d.driveTitle}</div><div className="small text-muted">{d.companyName}</div></td>
                  <td className="text-end">{d.applications}</td>
                  <td className="text-end">{d.shortlisted}</td>
                  <td className="text-end">{d.selected}</td>
                  <td className="text-end">{d.offered}</td>
                  <td>
                    <div className="small mb-1">{d.selectionRatio}%</div>
                    <div className="progress" style={{ height: 6 }}><div className="progress-bar" style={{ width: `${Math.min(100, d.selectionRatio * 2)}%` }}></div></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </ChartCard>
  );
}
export default DriveSelectionCard;
