import { useCallback } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getDepartmentPlacement } from '../../services/analyticsService';
import BarChart from '../charts/BarChart';
import ChartCard from './ChartCard';
import CsvButton from './CsvButton';

const COLUMNS = [
  { header: 'Department', value: 'departmentName' },
  { header: 'Students', value: 'totalStudents' },
  { header: 'Placed', value: 'placedStudents' },
  { header: 'Placement rate (%)', value: 'placementRate' },
  { header: 'Average package (LPA)', value: (d) => d.avgPackageLpa ?? '' },
];

// Teaches: a SELF-FETCHING widget. It owns its request, so a page just drops <DepartmentPlacementCard /> in.
// useCallback keeps the fetcher the same function until `year` changes, so useFetch only reloads then.
function DepartmentPlacementCard({ year = '' }) {
  const fetchData = useCallback(() => getDepartmentPlacement(year), [year]);
  const { data, loading, error, reload } = useFetch(fetchData);

  return (
    <ChartCard title="Placement rate by department"
      subtitle={year ? `Class of ${year}` : 'All graduating classes'}
      loading={loading && !data} error={error} onRetry={reload}
      actions={<CsvButton filename="department-placement.csv" columns={COLUMNS} rows={data} />}>
      {data && (
        <BarChart
          data={data.map((d) => ({ label: d.departmentCode, value: d.placementRate, note: `${d.placedStudents}/${d.totalStudents} students` }))}
          max={100} format={(v) => `${v}%`} emptyText="No students yet" />
      )}
    </ChartCard>
  );
}
export default DepartmentPlacementCard;
