function EmptyState({ icon = 'bi-inbox', title, text }) {
  return (
    <div className="text-center text-muted py-5">
      <i className={`bi ${icon}`} style={{ fontSize: '2.5rem' }}></i>
      <h6 className="mt-2 mb-1">{title}</h6>
      {text && <div className="small">{text}</div>}
    </div>
  );
}
export default EmptyState;