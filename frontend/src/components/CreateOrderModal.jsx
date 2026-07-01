/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef } from 'react';
import { createOrder } from '../services/api';

/**
 * Centered dialog modal overlay allowing creation of database order items
 * @param {Object} props - properties
 * @param {boolean} props.isOpen - display condition
 * @param {Function} props.onClose - callback closing modal
 * @param {Function} props.onSuccess - callback alerting parent context of creation
 */
const CreateOrderModal = ({ isOpen, onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const modalRef = useRef(null);
  const initialFocusRef = useRef(null);

  // Define helper functions first to satisfy declaration hoisting rules
  const resetForm = () => {
    setCustomerName('');
    setPhoneNumber('');
    setProductName('');
    setAmount('');
    setPaymentStatus('PENDING');
    setErrors({});
    setSubmitError(null);
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  // React fields validator
  const validate = () => {
    const newErrors = {};
    const nameTrimmed = customerName.trim();
    
    if (!nameTrimmed) {
      newErrors.customerName = 'Customer Name is required.';
    } else if (nameTrimmed.length < 2) {
      newErrors.customerName = 'Customer Name must be at least 2 characters.';
    } else if (nameTrimmed.length > 50) {
      newErrors.customerName = 'Customer Name cannot exceed 50 characters.';
    }

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone Number is required.';
    } else if (!/^\d{10}$/.test(phoneNumber)) {
      newErrors.phoneNumber = 'Phone Number must be exactly 10 digits.';
    }

    if (!productName.trim()) {
      newErrors.productName = 'Product Name is required.';
    }

    if (!amount) {
      newErrors.amount = 'Amount is required.';
    } else {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = 'Amount must be a positive number greater than zero.';
      }
    }

    if (!paymentStatus) {
      newErrors.paymentStatus = 'Payment Status is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Accessible lock scrolling & input focus traps
  useEffect(() => {
    if (isOpen) {
      initialFocusRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Bind keyboard ESC actions to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }

    if (field === 'customerName') setCustomerName(value);
    if (field === 'phoneNumber') setPhoneNumber(value);
    if (field === 'productName') setProductName(value);
    if (field === 'amount') setAmount(value);
    if (field === 'paymentStatus') setPaymentStatus(value);
  };

  // Submission handler mapping REST POST queries
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!validate()) return;

    setLoading(true);
    setSubmitError(null);

    const payload = {
      customerName: customerName.trim(),
      phoneNumber,
      productName: productName.trim(),
      amount: Number(amount),
      paymentStatus
    };

    try {
      await createOrder(payload);
      onSuccess();
      resetForm();
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormInvalid = 
    !customerName.trim() || 
    !phoneNumber || 
    !productName.trim() || 
    !amount || 
    isNaN(Number(amount)) || 
    Number(amount) <= 0;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div 
        className="modal-container" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">Create New Order</h3>
          <button type="button" className="modal-close-btn" onClick={handleCancel} aria-label="Close modal">
            &times;
          </button>
        </div>

        {submitError && (
          <div style={{
            color: '#fb7185',
            backgroundColor: 'rgba(251, 113, 133, 0.1)',
            border: '1px solid rgba(251, 113, 133, 0.2)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="customerName">Customer Name</label>
            <input
              type="text"
              id="customerName"
              className="form-input"
              value={customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              disabled={loading}
              ref={initialFocusRef}
              placeholder="e.g. John Doe"
            />
            {errors.customerName && <span className="form-error">{errors.customerName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phoneNumber">Phone Number (10 Digits)</label>
            <input
              type="text"
              id="phoneNumber"
              className="form-input"
              value={phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
              disabled={loading}
              placeholder="e.g. 5550199283"
            />
            {errors.phoneNumber && <span className="form-error">{errors.phoneNumber}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="productName">Product Name</label>
            <input
              type="text"
              id="productName"
              className="form-input"
              value={productName}
              onChange={(e) => handleInputChange('productName', e.target.value)}
              disabled={loading}
              placeholder="e.g. Wireless Headset"
            />
            {errors.productName && <span className="form-error">{errors.productName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              id="amount"
              className="form-input"
              value={amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              disabled={loading}
              placeholder="e.g. 99.99"
            />
            {errors.amount && <span className="form-error">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="paymentStatus">Payment Status</label>
            <select
              id="paymentStatus"
              className="form-select"
              value={paymentStatus}
              onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
              disabled={loading}
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="FAILED">FAILED</option>
            </select>
            {errors.paymentStatus && <span className="form-error">{errors.paymentStatus}</span>}
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || isFormInvalid}
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrderModal;
