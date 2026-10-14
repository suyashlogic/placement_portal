import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getPackageStatistics } from '../../services/analyticsService';
import ColumnChart from '../charts/ColumnChart';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const COLUMNS = [
  { header: 'From (LPA)', value: 'rangeStart' }, { header: 'To (LPA)', value: 'rangeEnd' }, { header: 'Students', value: 'students' },
];
const lpa = (v) => (v === null || v === undefined ? '–' : `₹${Number(v).toFixed(2)}`);

function PackageCard({ bucket = 3 }) {
  const fetchData = useCallback(() => getPackageStatistics(bucket), [bucket]);
  const { data, loading, error, reload } = useFetch(fetchData);
  const s = data?.statistics;

  return (
    <ChartCard title="Package statistics" subtitle={s ? `${s.studentsPlaced} placed students, in LPA` : ' '}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="package-distribution.csv" columns={COLUMNS} rows={data?.distribution} />}>
      {data && (
        <>
          <div className="row g-2 mb-3 text-center">
            {[['Average', s.avgPackageLpa], ['Median', s.medianPackageLpa], ['Highest', s.highestPackageLpa], ['Lowest', s.lowestPackageLpa]].map(([name, value]) => (
              <div className="col-6 col-md-3" key={name}>
                <div className="bg-light rounded-3 py-2">
                  <div className="small text-muted">{name}</div>
                  <div className="fw-bold">{lpa(value)}</div>
                </div>
              </div>
            ))}
          </div>
          <ColumnChart data={data.distribution.map((b) => ({ label: `${b.rangeStart}-${b.rangeEnd}`, value: b.students }))}
            ariaLabel="Number of placed students per package range" emptyText="No placements yet" />
        </>
      )}
    </ChartCard>
  );
}
export default PackageCard;
