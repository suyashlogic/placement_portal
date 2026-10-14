import { downloadCsv } from '../../utils/csv';

function CsvButton({ filename, columns, rows }) {
  return (
    <button type="button" className="btn btn-sm btn-outline-secondary text-nowrap"
      disabled={!rows || rows.length === 0}
      onClick={() => downloadCsv(filename, columns, rows)}>
      <i className="bi bi-download me-1"></i>CSV
    </button>
  );
}
export default CsvButton;
