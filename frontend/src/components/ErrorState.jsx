import React from 'react';

/**
 * ErrorState Component
 * @param {Object} props - props
 * @param {string} props.message - Error message details
 * @param {Function} props.onRetry - Callback function to re-execute API fetch
 */
const ErrorState = ({ message, onRetry }) => {
  return (
    <div className="error-state">
      <div className="error-state-icon" role="img" aria-label="warning">⚠️</div>
      <h3 className="error-state-title">Unable to Load Orders</h3>
      <p className="error-state-desc">
        {message || "We encountered a network or server issue trying to retrieve orders. Please check your backend connection."}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
