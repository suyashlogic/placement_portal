import { useFetch } from '../../hooks/useFetch';
import { getStatusBreakdown } from '../../services/analyticsService';
import { STATUS_COLORS } from '../charts/chartColors';
import DonutChart from '../charts/DonutChart';
import ChartCard from './ChartCard';

const label = (status) => status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function StatusBreakdownCard() {
  const { data, loading, error, reload } = useFetch(getStatusBreakdown);

  return (
    <ChartCard title="Applications by status" subtitle="Where every application stands today"
      loading={loading && !data} error={error} onRetry={reload}>
      {data && (
        <DonutChart centerLabel="applications" ariaLabel="Applications by status"
          data={data.map((b) => ({ label: label(b.status), value: b.applications, color: STATUS_COLORS[b.status] }))}
          emptyText="No applications yet" />
      )}
    </ChartCard>
  );
}
export default StatusBreakdownCard;
