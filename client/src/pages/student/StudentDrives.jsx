import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getDrives } from '../../services/driveService';
import PageHeader from '../../components/PageHeader';
import DriveCard from '../../components/DriveCard';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const FILTERS = {
  ALL: { label: 'All', test: () => true },
  ELIGIBLE: { label: 'Eligible', test: (d) => d.isEligible && !d.registrationClosed && !d.hasApplied },
  NOT_ELIGIBLE: { label: 'Not eligible', test: (d) => !d.isEligible },
  CLOSED: { label: 'Closed', test: (d) => d.registrationClosed },
};

function StudentDrives() {
  const { data, loading, error, reload } = useFetch(getDrives);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const term = search.trim().toLowerCase();
  const visible = data.filter(
    (d) =>
      FILTERS[filter].test(d) &&
      `${d.companyName} ${d.driveTitle} ${d.jobTitle}`.toLowerCase().includes(term)
  );

  return (
    <>
      <PageHeader title="Placement Drives" subtitle="Eligibility is checked by the database against your profile" />

      <div className="card mb-3">
        <div className="card-body d-flex flex-wrap gap-2 justify-content-between">
          <div className="input-group" style={{ maxWidth: 340 }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search company or role"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="btn-group">
            {Object.entries(FILTERS).map(([key, f]) => (
              <button key={key} type="button"
                className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card"><EmptyState icon="bi-search" title="No drives match" text="Try another filter or search." /></div>
      ) : (
        <div className="row g-3">
          {visible.map((drive) => (
            <div className="col-md-6 col-xl-4" key={drive.driveId}><DriveCard drive={drive} /></div>
          ))}
        </div>
      )}
    </>
  );
}
export default StudentDrives;