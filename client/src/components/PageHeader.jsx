function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
      <div>
        <h3 className="page-title">{title}</h3>
        {subtitle && <div className="text-muted">{subtitle}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
export default PageHeader;