import { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getEligibleStudents } from '../../services/driveService';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

function DriveEligibleStudents() {
  const { id } = useParams();
  const fetchStudents = useCallback(() => getEligibleStudents(id), [id]);
  const { data, loading, error, reload } = useFetch(fetchStudents);
  const [search, setSearch] = useState('');
  const [onlyEligible, setOnlyEligible] = useState(true);

  const back = (
    <Link to="/officer/drives" className="small text-decoration-none">
      <i className="bi bi-arrow-left me-1"></i>Back to drives
    </Link>
  );

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <>{back}<div className="mt-3"><ErrorMessage message={error} onRetry={reload} /></div></>;

  const { drive, students } = data;
  const eligibleCount = students.filter((s) => s.isEligible).length;
  const appliedCount = students.filter((s) => s.hasApplied).length;

  const term = search.trim().toLowerCase();
  const visible = students.filter(
    (s) =>
      (!onlyEligible || s.isEligible) &&
      `${s.fullName} ${s.rollNumber} ${s.departmentCode}`.toLowerCase().includes(term)
  );

  return (
    <>
      {back}
      <div className="mt-2">
        <PageHeader title={drive.driveTitle} subtitle={`${drive.companyName} · ${drive.jobTitle}`}>
          <StatusBadge status={drive.status} />
        </PageHeader>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4"><StatCard icon="bi-patch-check" label="Eligible students" value={eligibleCount} tone="success" /></div>
        <div className="col-6 col-md-4"><StatCard icon="bi-x-octagon" label="Not eligible" value={students.length - eligibleCount} tone="warning" /></div>
        <div className="col-12 col-md-4"><StatCard icon="bi-send-check" label="Applied" value={appliedCount} tone="primary" /></div>
      </div>

      <div className="card">
        <div className="card-body border-bottom d-flex flex-wrap gap-3 justify-content-between align-items-center">
          <div className="input-group" style={{ maxWidth: 340 }}>
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input className="form-control" placeholder="Search name, roll number or department"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="onlyEligible"
              checked={onlyEligible} onChange={(e) => setOnlyEligible(e.target.checked)} />
            <label className="form-check-label" htmlFor="onlyEligible">Show eligible only</label>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="bi-people" title="No students to show"
            text={onlyEligible ? 'No student matches. Switch off "Show eligible only" to see why.' : 'Try a different search.'} />
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Student</th><th>Dept</th><th>CGPA</th><th>Year</th><th>Eligibility</th><th>Applied</th></tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.studentId}>
                    <td>
                      <div className="fw-semibold">{s.fullName}</div>
                      <div className="small text-muted">{s.rollNumber} · {s.email}</div>
                    </td>
                    <td>{s.departmentCode}</td>
                    <td>{Number(s.cgpa).toFixed(2)}</td>
                    <td>{s.graduationYear}</td>
                    <td>
                      {s.isEligible
                        ? <span className="badge rounded-pill bg-success-subtle text-success-emphasis">Eligible</span>
                        : <><span className="badge rounded-pill bg-danger-subtle text-danger-emphasis">Not eligible</span>
                          <div className="small text-muted mt-1">{s.reason}</div></>}
                    </td>
                    <td>{s.hasApplied ? <i className="bi bi-check-circle-fill text-success"></i> : <span className="text-muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
export default DriveEligibleStudents;
