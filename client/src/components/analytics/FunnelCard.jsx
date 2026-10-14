import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getFunnel } from '../../services/analyticsService';
import { PALETTE } from '../charts/chartColors';
import BarChart from '../charts/BarChart';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const STAGES = [
  ['applied', 'Applied'], ['shortlisted', 'Shortlisted'], ['interviewed', 'Interviewed'],
  ['selected', 'Selected'], ['offered', 'Offered'], ['placed', 'Placed'],
];
const COLUMNS = [{ header: 'Stage', value: 'label' }, { header: 'Applications', value: 'value' }, { header: '% of applied', value: 'percent' }];

// Every stage as a share of the applications that started the process (for the whole portal or one drive)
function FunnelCard({ driveId = '', title = 'Application funnel', subtitle }) {
  const fetchData = useCallback(() => getFunnel(driveId), [driveId]);
  const { data, loading, error, reload } = useFetch(fetchData);

  const rows = data
    ? STAGES.map(([key, label]) => ({
      label, value: data[key],
      percent: data.applied > 0 ? Math.round((1000 * data[key]) / data.applied) / 10 : 0,
    }))
    : [];

  return (
    <ChartCard title={title} subtitle={subtitle ?? (driveId ? 'Selected drive' : 'All drives')}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="application-funnel.csv" columns={COLUMNS} rows={rows} />}>
      {data && (
        <BarChart max={data.applied || 1} emptyText="No applications yet"
          data={data.applied === 0 ? [] : rows.map((r, i) => ({ label: r.label, value: r.value, note: `${r.percent}%`, color: PALETTE[i % PALETTE.length] }))} />
      )}
    </ChartCard>
  );
}
export default FunnelCard;
