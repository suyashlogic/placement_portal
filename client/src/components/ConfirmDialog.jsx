import Modal from './Modal';

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', variant = 'primary', busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <div className="d-flex justify-content-end gap-2">
        <button type="button" className="btn btn-light" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`btn btn-${variant}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Working...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
export default ConfirmDialog;
