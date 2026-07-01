import React, { useState, useEffect } from 'react';
import { fetchOrders } from '../services/api';
import StatusFilter from '../components/StatusFilter';
import OrdersTable from '../components/OrdersTable';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';

/**
 * Dashboard Page Component
 */
const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load orders from API
  const loadOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchOrders(selectedStatus);
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch orders when selected status filter changes
  useEffect(() => {
    loadOrders(false);
  }, [selectedStatus]);

  return (
    <>
      {/* Navbar / Top Navigation Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">📦</div>
          <h1 className="brand-title">OMS Admin</h1>
        </div>
        <div className="controls-group">
          <button
            type="button"
            className="btn"
            onClick={() => loadOrders(true)}
            disabled={loading || refreshing}
            aria-label="Refresh orders"
          >
            <span className={`refresh-icon ${refreshing ? 'spin' : ''}`} style={{ display: 'inline-block' }}>
              🔄
            </span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: '1 0 auto' }}>
        {/* Page Title & Status Filters */}
        <div className="page-title-section">
          <h2 className="page-title">Orders Dashboard</h2>
          <StatusFilter
            selectedStatus={selectedStatus}
            onChange={setSelectedStatus}
            disabled={loading || refreshing}
          />
        </div>

        {/* Dynamic Display based on States */}
        {loading ? (
          <div className="card-table-wrapper">
            <LoadingState />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadOrders(false)} />
        ) : orders.length === 0 ? (
          <div className="card-table-wrapper">
            <EmptyState
              message={
                selectedStatus === 'ALL'
                  ? 'There are currently no orders registered in the system.'
                  : `There are no orders matching the '${selectedStatus}' status criteria.`
              }
            />
          </div>
        ) : (
          <OrdersTable orders={orders} />
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '24px 0', 
        fontSize: '13px', 
        color: 'var(--text-tertiary)',
        borderTop: '1px solid var(--border-color)',
        marginTop: 'auto'
      }}>
        &copy; {new Date().getFullYear()} Order Management System. Built with React & Mongoose.
      </footer>
    </>
  );
};

export default Dashboard;
