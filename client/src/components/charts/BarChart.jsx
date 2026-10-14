// Horizontal bars built from Bootstrap's progress component: responsive and accessible with no library.
// data: [{ label, value, note?, color? }]    max: the value that fills a whole bar (defaults to the largest value)
function BarChart({ data, max, format = (v) => v, color = '#4f46e5', emptyText = 'No data yet' }) {
  if (data.length === 0) return <div className="text-muted small py-3">{emptyText}</div>;

  const top = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="list-unstyled mb-0">
      {data.map((d) => {
        const percent = top > 0 ? Math.min(100, Math.max(0, (d.value / top) * 100)) : 0;
        return (
          <li key={d.label} className="mb-3">
            <div className="d-flex justify-content-between small mb-1">
              <span className="fw-semibold text-truncate pe-2" title={d.label}>{d.label}</span>
              <span className="text-muted text-nowrap">
                {format(d.value)}{d.note && <span className="ms-2">{d.note}</span>}
              </span>
            </div>
            <div className="progress" style={{ height: 10 }} role="progressbar"
              aria-label={d.label} aria-valuenow={d.value} aria-valuemin={0} aria-valuemax={top}>
              <div className="progress-bar" style={{ width: `${percent}%`, backgroundColor: d.color || color }}></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
export default BarChart;
