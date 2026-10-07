function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center p-3 border-top">
      <span className="small text-muted">Page {page} of {pages} · {total} results</span>
      <div className="btn-group">
        <button className="btn btn-sm btn-outline-primary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <i className="bi bi-chevron-left"></i> Previous
        </button>
        <button className="btn btn-sm btn-outline-primary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
export default Pagination;
