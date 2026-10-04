import { useEffect } from 'react';

// A reusable modal built with plain React state and Bootstrap's modal CSS (no Bootstrap JavaScript).
// "children" is whatever the parent puts between <Modal> and </Modal>.
function Modal({ title, onClose, size = '', children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {                       // cleanup runs when the modal closes
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop show"></div>
      <div className="modal d-block" tabIndex="-1" onClick={onClose}>
        <div className={`modal-dialog modal-dialog-scrollable ${size}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Modal;
