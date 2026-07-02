/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';

/**
 * DeleteConfirmationModal Component
 * @param {Object} props - properties
 * @param {boolean} props.isOpen - display condition
 * @param {Object} props.order - selected order item to delete
 * @param {Function} props.onClose - callback closing modal
 * @param {Function} props.onConfirm - callback triggering deletion API call
 * @param {boolean} props.loading - loading status while deletion is in progress
 */
const DeleteConfirmationModal = ({ isOpen, order, onClose, onConfirm, loading }) => {
  const modalRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Focus lock and body scroll management
  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Bind keyboard Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        style={{ maxWidth: '400px' }}
      >
        <div className="modal-header" style={{ borderBottomColor: 'var(--color-failed-border)' }}>
          <h3 id="delete-modal-title" className="modal-title" style={{ color: 'var(--color-failed-text)' }}>
            Delete Order
          </h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--text-primary)', fontWeight: '500' }}>
            Are you sure you want to delete order <strong style={{ color: 'var(--accent-color)' }}>{order.orderId}</strong>?
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            This action cannot be undone. All database records associated with this order will be permanently removed.
          </p>
        </div>

        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0', marginTop: '20px' }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={loading}
            ref={cancelButtonRef}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              backgroundColor: 'var(--color-failed-bg)',
              color: 'var(--color-failed-text)',
              borderColor: 'var(--color-failed-border)',
              boxShadow: 'none'
            }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
