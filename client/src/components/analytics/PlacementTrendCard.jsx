import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getPlacementTrends } from '../../services/analyticsService';
import { formatMonth } from '../../utils/format';
import LineChart from '../charts/LineChart';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const COLUMNS = [
  { header: 'Month', value: 'month' },
  { header: 'Placements', value: 'placements' },
  { header: 'Average package (LPA)', value: (t) => t.avgPackageLpa ?? '' },
  { header: 'Cumulative placements', value: 'cumulativePlacements' },
];

function PlacementTrendCard({ months = 12 }) {
  const fetchData = useCallback(() => getPlacementTrends(months), [months]);
  const { data, loading, error, reload } = useFetch(fetchData);
  const total = data ? data.reduce((sum, t) => sum + t.placements, 0) : 0;

  return (
    <ChartCard title="Placement trend" subtitle={data ? `${total} placement${total === 1 ? '' : 's'} in the last ${months} months` : ' '}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="placement-trends.csv" columns={COLUMNS} rows={data} />}>
      {data && (
        <LineChart data={data.map((t) => ({ label: formatMonth(t.month), value: t.placements }))}
          ariaLabel={`Placements per month for the last ${months} months`} />
      )}
    </ChartCard>
  );
}
export default PlacementTrendCard;
