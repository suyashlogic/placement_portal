import { STAGES, label } from '../utils/applicationStatus';

// Shows where an application is on the way to placement. Rejected and withdrawn have no stepper.
function ApplicationProgress({ status }) {
  const current = STAGES.indexOf(status);
  if (current === -1) return null;

  return (
    <div className="d-flex flex-wrap gap-3">
      {STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        const icon = done ? 'bi-check-circle-fill text-success'
          : active ? 'bi-record-circle-fill text-primary' : 'bi-circle text-muted';
        return (
          <div key={stage} className="d-flex align-items-center gap-1">
            <i className={`bi ${icon}`}></i>
            <span className={`small ${active ? 'fw-semibold' : done ? '' : 'text-muted'}`}>{label(stage)}</span>
          </div>
        );
      })}
    </div>
  );
}
export default ApplicationProgress;
