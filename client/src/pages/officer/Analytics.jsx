import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getManagedDrives } from '../../services/driveService';
import PageHeader from '../../components/PageHeader';
import DepartmentPlacementCard from '../../components/analytics/DepartmentPlacementCard';
import PlacementTrendCard from '../../components/analytics/PlacementTrendCard';
import FunnelCard from '../../components/analytics/FunnelCard';
import CompanyHiringCard from '../../components/analytics/CompanyHiringCard';
import PackageCard from '../../components/analytics/PackageCard';
import DriveSelectionCard from '../../components/analytics/DriveSelectionCard';

// Teaches: page-level state that is PASSED DOWN to widgets. Change a select here and the widget that
// receives the new prop re-fetches by itself (its useCallback dependency changed).
function Analytics() {
  const [year, setYear] = useState('');
  const [months, setMonths] = useState(12);
  const [bucket, setBucket] = useState(3);
  const [driveId, setDriveId] = useState('');
  const drives = useFetch(getManagedDrives);

  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  return (
    <>
      <PageHeader title="Analytics" subtitle="Every figure is calculated by PostgreSQL. Each report can be downloaded as CSV." />

      <div className="card mb-3">
        <div className="card-body row g-3">
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="year">Graduating class (department chart)</label>
            <select id="year" className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All classes</option>
              {years.map((y) => <option key={y} value={y}>Class of {y}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="months">Trend window</label>
            <select id="months" className="form-select" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[6, 12, 24].map((m) => <option key={m} value={m}>Last {m} months</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="bucket">Package range width</label>
            <select id="bucket" className="form-select" value={bucket} onChange={(e) => setBucket(Number(e.target.value))}>
              {[2, 3, 5].map((b) => <option key={b} value={b}>{b} LPA</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small mb-1" htmlFor="drive">Funnel for</label>
            <select id="drive" className="form-select" value={driveId} onChange={(e) => setDriveId(e.target.value)}>
              <option value="">All drives</option>
              {(drives.data || []).map((d) => <option key={d.driveId} value={d.driveId}>{d.driveTitle}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6"><DepartmentPlacementCard year={year} /></div>
        <div className="col-lg-6"><PlacementTrendCard months={months} /></div>
        <div className="col-lg-6"><FunnelCard driveId={driveId} /></div>
        <div className="col-lg-6"><CompanyHiringCard limit={10} /></div>
        <div className="col-12"><PackageCard bucket={bucket} /></div>
        <div className="col-12"><DriveSelectionCard /></div>
      </div>
    </>
  );
}
export default Analytics;
