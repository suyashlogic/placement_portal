import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getMyApplications } from '../../services/applicationService';
import { formatDate, formatPackage } from '../../utils/format';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

const FILTERS = {
  ALL: { label: 'All', test: () => true },
  ACTIVE: { label: 'In progress', test: (a) => !['REJECTED', 'WITHDRAWN', 'PLACED'].includes(a.status) },
  DONE: { label: 'Finished', test: (a) => ['REJECTED', 'WITHDRAWN', 'PLACED'].includes(a.status) },
};

function StudentApplications() {
  const { data, loading, error, reload } = useFetch(getMyApplications);
  const [filter, setFilter] = useState('ALL');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const visible = data.filter(FILTERS[filter].test);

  return (
    <>
      <PageHeader title="My Applications" subtitle="Track every drive you have applied to">
        <div className="btn-group">
          {Object.entries(FILTERS).map(([key, f]) => (
            <button key={key} type="button"
              className={`btn btn-sm ${filter === key ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setFilter(key)}>{f.label}</button>
          ))}
        </div>
      </PageHeader>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState icon="bi-send" title={data.length === 0 ? 'No applications yet' : 'Nothing in this view'}
            text={data.length === 0 ? 'Find a drive you are eligible for and apply.' : 'Try another filter.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Drive</th><th>Package</th><th>Applied on</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.applicationId}>
                    <td>
                      <div className="fw-semibold">{a.driveTitle}</div>
                      <div className="small text-muted">{a.companyName} · {a.jobTitle}</div>
                    </td>
                    <td>{formatPackage(a.minPackageLpa, a.maxPackageLpa)}</td>
                    <td>{formatDate(a.applicationDate)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-end">
                      <Link to={`/student/applications/${a.applicationId}`} className="btn btn-sm btn-outline-primary">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data.length === 0 && (
        <div className="text-center mt-3"><Link to="/student/drives" className="btn btn-primary">Browse drives</Link></div>
      )}
    </>
  );
}
export default StudentApplications;
