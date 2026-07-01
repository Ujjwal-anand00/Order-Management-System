
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
 * OrdersTable Component
 * @param {Object} props - props
 * @param {Array} props.orders - Array of order items
 */
const OrdersTable = ({ orders }) => {
  return (
    <div className="card-table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer Name</th>
            <th>Phone Number</th>
            <th>Product Name</th>
            <th>Amount</th>
            <th>Order Status</th>
            <th>Payment Status</th>
            <th>Created Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id || order.orderId}>
              <td data-label="Order ID">
                <span className="order-id-highlight">{order.orderId}</span>
              </td>
              <td data-label="Customer Name">
                <div className="customer-name">{order.customerName}</div>
                {/* On mobile, we display phone here since we hide the separate phone column */}
                <div className="customer-phone mobile-only">{order.phoneNumber}</div>
              </td>
              <td data-label="Phone Number" className="desktop-only-cell">
                <span>{order.phoneNumber}</span>
              </td>
              <td data-label="Product Name">
                <span>{order.productName}</span>
              </td>
              <td data-label="Amount">
                <span style={{ fontWeight: '600' }}>{formatCurrency(order.amount)}</span>
              </td>
              <td data-label="Order Status">
                <span className={getStatusBadgeClass(order.currentOrderStatus)}>
                  {order.currentOrderStatus}
                </span>
              </td>
              <td data-label="Payment Status">
                <span className={getPaymentBadgeClass(order.paymentStatus)}>
                  {order.paymentStatus}
                </span>
              </td>
              <td data-label="Created Time">
                <span>{formatDate(order.createdAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
