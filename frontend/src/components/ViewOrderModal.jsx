/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';

/**
 * Helper to get Order Status Badge CSS class name
 */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'PLACED':
      return 'badge badge-placed';
    case 'PROCESSING':
      return 'badge badge-processing';
    case 'READY_TO_SHIP':
      return 'badge badge-ready';
    default:
      return 'badge';
  }
};

/**
 * Helper to get Payment Status Badge CSS class name
 */
const getPaymentBadgeClass = (status) => {
  switch (status) {
    case 'PENDING':
      return 'badge badge-pending';
    case 'PAID':
      return 'badge badge-paid';
    case 'FAILED':
      return 'badge badge-failed';
    default:
      return 'badge';
  }
};

/**
 * Format timestamp into readable localized date and time
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format numeric value as USD currency
 */
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

/**
 * ViewOrderModal Component
 * @param {Object} props - properties
 * @param {boolean} props.isOpen - display condition
 * @param {Object} props.order - selected order item details
 * @param {Function} props.onClose - callback closing modal
 */
const ViewOrderModal = ({ isOpen, order, onClose }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus lock and body scroll management
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-modal-title"
      >
        <div className="modal-header">
          <h3 id="view-modal-title" className="modal-title">Order Details</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            ref={closeButtonRef}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Order ID</label>
            <input
              type="text"
              className="form-input"
              value={order.orderId || ''}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--bg-tertiary)' }}
            />
          </div>

          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              value={order.customerName || ''}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--bg-tertiary)' }}
            />
          </div>

          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={order.phoneNumber || ''}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--bg-tertiary)' }}
            />
          </div>

          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-input"
              value={order.productName || ''}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--bg-tertiary)' }}
            />
          </div>

          <div className="form-group" style={{ margin: '0' }}>
            <label className="form-label">Amount</label>
            <input
              type="text"
              className="form-input"
              value={formatCurrency(order.amount)}
              readOnly
              style={{ cursor: 'default', backgroundColor: 'var(--bg-tertiary)', fontWeight: '500' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: '0' }}>
              <label className="form-label">Order Status</label>
              <div style={{ marginTop: '6px' }}>
                <span className={getStatusBadgeClass(order.currentOrderStatus)}>
                  {order.currentOrderStatus}
                </span>
              </div>
            </div>

            <div className="form-group" style={{ margin: '0' }}>
              <label className="form-label">Payment Status</label>
              <div style={{ marginTop: '6px' }}>
                <span className={getPaymentBadgeClass(order.paymentStatus)}>
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: '0' }}>
              <label className="form-label">Created Time</label>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '6px' }}>
                {formatDate(order.createdAt)}
              </div>
            </div>

            <div className="form-group" style={{ margin: '0' }}>
              <label className="form-label">Updated Time</label>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '6px' }}>
                {formatDate(order.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewOrderModal;
