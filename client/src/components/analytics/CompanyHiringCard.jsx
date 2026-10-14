import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getCompanyHiring } from '../../services/analyticsService';
import BarChart from '../charts/BarChart';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const COLUMNS = [
  { header: 'Company', value: 'companyName' }, { header: 'Industry', value: (c) => c.industry ?? '' },
  { header: 'Jobs', value: 'jobs' }, { header: 'Drives', value: 'drives' }, { header: 'Applications', value: 'applications' },
  { header: 'Offers', value: 'offers' }, { header: 'Students hired', value: 'studentsHired' },
  { header: 'Average package (LPA)', value: (c) => c.avgPackageLpa ?? '' }, { header: 'Highest package (LPA)', value: (c) => c.highestPackageLpa ?? '' },
];

function CompanyHiringCard({ limit = 8 }) {
  const fetchData = useCallback(() => getCompanyHiring(limit), [limit]);
  const { data, loading, error, reload } = useFetch(fetchData);

  return (
    <ChartCard title="Hiring by company" subtitle={`Top ${limit} by students hired`}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="company-hiring.csv" columns={COLUMNS} rows={data} />}>
      {data && (
        <BarChart data={data.map((c) => ({ label: c.companyName, value: c.studentsHired, note: `${c.offers} offers` }))}
          format={(v) => `${v} hired`} emptyText="No companies yet" />
      )}
    </ChartCard>
  );
}
export default CompanyHiringCard;
