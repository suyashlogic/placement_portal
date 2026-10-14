import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { getMyInsights } from '../../services/analyticsService';
import { STATUS_COLORS } from '../charts/chartColors';
import DonutChart from '../charts/DonutChart';
import ChartCard from './ChartCard';
import { formatDateTime } from '../../utils/format';

const label = (status) => status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const ROUND_TYPES = { APTITUDE: 'Aptitude test', CODING: 'Coding test', TECHNICAL: 'Technical interview', HR: 'HR interview', GROUP_DISCUSSION: 'Group discussion' };

// The student's application story: where each application stands, key counts and upcoming rounds
function StudentInsights() {
  const { data, loading, error, reload } = useFetch(getMyInsights);
  const s = data?.statistics;

  return (
    <div className="row g-3">
      <div className="col-lg-6">
        <ChartCard title="My applications by status" subtitle={s ? `${s.totalApplications} in total` : ' '}
          loading={loading && !data} error={error} onRetry={reload}>
          {data && (
            <>
              <DonutChart centerLabel="applications" ariaLabel="My applications by status"
                data={data.breakdown.map((b) => ({ label: label(b.status), value: b.applications, color: STATUS_COLORS[b.status] }))}
                emptyText="You have not applied to any drive yet." />
              {s.totalApplications > 0 && (
                <div className="row g-2 text-center mt-3">
                  {[['In progress', s.inProgress], ['Shortlisted', s.shortlisted], ['Selected', s.selected], ['Offers', s.offersReceived]].map(([name, value]) => (
                    <div className="col-6 col-md-3" key={name}>
                      <div className="bg-light rounded-3 py-2"><div className="small text-muted">{name}</div><div className="fw-bold">{value}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ChartCard>
      </div>

      <div className="col-lg-6">
        <ChartCard title="Upcoming rounds" subtitle="Interviews and tests waiting for you"
          loading={loading && !data} error={error} onRetry={reload}>
          {data && (data.upcomingInterviews.length === 0 ? (
            <div className="text-muted small py-3">No rounds are scheduled right now. You will be notified when one is.</div>
          ) : (
            <ul className="list-group list-group-flush">
              {data.upcomingInterviews.map((r) => (
                <li key={r.selectionId} className="list-group-item px-0 d-flex gap-3">
                  <i className="bi bi-calendar-event text-primary fs-5"></i>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{r.roundName} <span className="text-muted fw-normal">· {ROUND_TYPES[r.roundType] || r.roundType}</span></div>
                    <div className="small text-muted">{r.companyName} · {r.driveTitle}</div>
                    <div className="small">{r.scheduledAt ? formatDateTime(r.scheduledAt) : 'Date to be announced'}{r.location && ` · ${r.location}`}</div>
                  </div>
                  <Link to={`/student/applications/${r.applicationId}`} className="btn btn-sm btn-outline-primary align-self-start">View</Link>
                </li>
              ))}
            </ul>
          ))}
        </ChartCard>
      </div>
    </div>
  );
}
export default StudentInsights;
