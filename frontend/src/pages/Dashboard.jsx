/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { fetchOrders, fetchSchedulerLogs } from '../services/api';
import StatusFilter from '../components/StatusFilter';
import OrdersTable from '../components/OrdersTable';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import CreateOrderModal from '../components/CreateOrderModal';

/**
 * Main Application Dashboard page supporting Orders list (with search, pagination and creation)
 * and Scheduler execution history logs.
 */
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'logs'

  // --- Orders State Management ---
  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotalRecords, setOrdersTotalRecords] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // --- Create Order & Toast Overlay States ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // --- Scheduler Logs State Management ---
  const [logs, setLogs] = useState([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalRecords, setLogsTotalRecords] = useState(0);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsRefreshing, setLogsRefreshing] = useState(false);
  const [logsError, setLogsError] = useState(null);

  // Fetch orders from API
  const loadOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setOrdersRefreshing(true);
    } else {
      setOrdersLoading(true);
    }
    setOrdersError(null);

    try {
      const data = await fetchOrders(selectedStatus, searchQuery, ordersPage, 10);
      setOrders(data.items || []);
      setOrdersTotalPages(data.pagination?.pages || 1);
      setOrdersTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setOrdersError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setOrdersLoading(false);
      setOrdersRefreshing(false);
    }
  };

  // Fetch scheduler execution logs
  const loadLogs = async (isRefresh = false) => {
    if (isRefresh) {
      setLogsRefreshing(true);
    } else {
      setLogsLoading(true);
    }
    setLogsError(null);

    try {
      const data = await fetchSchedulerLogs(logsPage, 10);
      setLogs(data.items || []);
      setLogsTotalPages(data.pagination?.pages || 1);
      setLogsTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setLogsError(err.message || 'Failed to retrieve scheduler execution logs.');
    } finally {
      setLogsLoading(false);
      setLogsRefreshing(false);
    }
  };

  // Load orders when filtering, searching, or paging changes
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders(false);
    }
  }, [selectedStatus, searchQuery, ordersPage, activeTab]);

  // Load logs when logs page or tab changes
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs(false);
    }
  }, [logsPage, activeTab]);

  // Toast banner auto fade-out
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Trigger search execution
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setOrdersPage(1); // Reset page to 1
    setSearchQuery(searchInput);
  };

  // Clear search queries
  const handleSearchClear = () => {
    setSearchInput('');
    setSearchQuery('');
    setOrdersPage(1);
  };

  // Format date helper
  const formatDateTime = (dateString) => {
    if (!dateString || dateString === '1970-01-01T00:00:00.000Z') return 'Running...';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format Duration helper
  const formatDuration = (start, end) => {
    if (!start || !end || end === '1970-01-01T00:00:00.000Z') return '-';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return `${diff}ms`;
  };

  // Callback when order creation completes successfully
  const handleCreateSuccess = () => {
    setToastMessage('Order created successfully.');
    setOrdersPage(1);
    loadOrders(false);
  };

  return (
    <>
      {/* Top Navigation / Brand Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">📦</div>
          <h1 className="brand-title">OMS Administrator</h1>
        </div>
        <div className="controls-group">
          {activeTab === 'orders' ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsModalOpen(true)}
                style={{ marginRight: '8px' }}
              >
                + Create Order
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => loadOrders(true)}
                disabled={ordersLoading || ordersRefreshing}
              >
                <span className={`refresh-icon ${ordersRefreshing ? 'spin' : ''}`} style={{ display: 'inline-block' }}>
                  🔄
                </span>
                {ordersRefreshing ? 'Refreshing...' : 'Refresh Orders'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => loadLogs(true)}
              disabled={logsLoading || logsRefreshing}
            >
              <span className={`refresh-icon ${logsRefreshing ? 'spin' : ''}`} style={{ display: 'inline-block' }}>
                🔄
              </span>
              {logsRefreshing ? 'Refreshing...' : 'Refresh Logs'}
            </button>
          )}
        </div>
      </header>

      {/* Tabs Navigation Selector */}
      <nav className="tab-navigation">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders Directory
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Scheduler Run Logs
        </button>
      </nav>

      {/* Main Tab Panels */}
      <main style={{ flex: '1 0 auto' }}>
        
        {/* TAB 1: Orders Directory */}
        {activeTab === 'orders' && (
          <>
            {/* Search and Filters Action Block */}
            <form className="search-controls" onSubmit={handleSearchSubmit}>
              <div className="search-container">
                <input
                  type="text"
                  className="input-search"
                  placeholder="Search by Customer Name or Order ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  disabled={ordersLoading || ordersRefreshing}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={ordersLoading || ordersRefreshing}
                >
                  Search
                </button>
                {(searchQuery || searchInput) && (
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSearchClear}
                    disabled={ordersLoading || ordersRefreshing}
                  >
                    Clear
                  </button>
                )}
              </div>
              <StatusFilter
                selectedStatus={selectedStatus}
                onChange={(status) => {
                  setOrdersPage(1); // Reset page on filter change
                  setSelectedStatus(status);
                }}
                disabled={ordersLoading || ordersRefreshing}
              />
            </form>

            {/* List state loaders */}
            {ordersLoading ? (
              <div className="card-table-wrapper">
                <LoadingState />
              </div>
            ) : ordersError ? (
              <ErrorState message={ordersError} onRetry={() => loadOrders(false)} />
            ) : orders.length === 0 ? (
              <div className="card-table-wrapper">
                <EmptyState
                  message={
                    searchQuery
                      ? `No orders matching query '${searchQuery}' found.`
                      : selectedStatus !== 'ALL'
                      ? `No active orders found with status '${selectedStatus}'.`
                      : 'There are no customer orders loaded in the system database.'
                  }
                />
              </div>
            ) : (
              <div className="card-table-wrapper">
                <OrdersTable orders={orders} />
                
                {/* Orders Pagination Footer */}
                <div className="pagination-row">
                  <div className="pagination-info">
                    Showing <strong>{Math.min(ordersTotalRecords, (ordersPage - 1) * 10 + 1)}</strong> to{' '}
                    <strong>{Math.min(ordersTotalRecords, ordersPage * 10)}</strong> of{' '}
                    <strong>{ordersTotalRecords}</strong> records
                  </div>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-page"
                      disabled={ordersPage <= 1 || ordersLoading || ordersRefreshing}
                      onClick={() => setOrdersPage((p) => p - 1)}
                    >
                      &larr; Previous
                    </button>
                    <span className="page-indicator">
                      Page {ordersPage} of {ordersTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-page"
                      disabled={ordersPage >= ordersTotalPages || ordersLoading || ordersRefreshing}
                      onClick={() => setOrdersPage((p) => p + 1)}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: Scheduler Run Logs */}
        {activeTab === 'logs' && (
          <>
            <div className="page-title-section">
              <h2 className="page-title">Cron Job Run History Logs</h2>
            </div>

            {/* Logs Load state selectors */}
            {logsLoading ? (
              <div className="card-table-wrapper">
                <LoadingState />
              </div>
            ) : logsError ? (
              <ErrorState message={logsError} onRetry={() => loadLogs(false)} />
            ) : logs.length === 0 ? (
              <div className="card-table-wrapper">
                <EmptyState message="No scheduler execution logs exist in the database yet. Trigger the scheduler API or wait for the automated cron schedule to run." />
              </div>
            ) : (
              <div className="card-table-wrapper">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Triggered At (Start)</th>
                      <th>Finished At (End)</th>
                      <th>Duration</th>
                      <th>Checked</th>
                      <th>Updated</th>
                      <th>Error Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id}>
                        <td data-label="Status">
                          <span
                            className={`badge ${
                              log.status === 'SUCCESS' ? 'badge-ready' : 'badge-failed'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td data-label="Triggered At">{formatDateTime(log.startTime)}</td>
                        <td data-label="Finished At">{formatDateTime(log.endTime)}</td>
                        <td data-label="Duration">
                          <span style={{ fontWeight: '500' }}>
                            {formatDuration(log.startTime, log.endTime)}
                          </span>
                        </td>
                        <td data-label="Checked">
                          <strong>{log.totalOrdersChecked}</strong>
                        </td>
                        <td data-label="Updated">
                          <strong>{log.totalOrdersUpdated}</strong>
                        </td>
                        <td data-label="Error Summary">
                          {log.errorMessage ? (
                            <div className="error-text-details">{log.errorMessage}</div>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Logs Pagination Footer */}
                <div className="pagination-row">
                  <div className="pagination-info">
                    Showing <strong>{Math.min(logsTotalRecords, (logsPage - 1) * 10 + 1)}</strong> to{' '}
                    <strong>{Math.min(logsTotalRecords, logsPage * 10)}</strong> of{' '}
                    <strong>{logsTotalRecords}</strong> records
                  </div>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="btn-page"
                      disabled={logsPage <= 1 || logsLoading || logsRefreshing}
                      onClick={() => setLogsPage((p) => p - 1)}
                    >
                      &larr; Previous
                    </button>
                    <span className="page-indicator">
                      Page {logsPage} of {logsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-page"
                      disabled={logsPage >= logsTotalPages || logsLoading || logsRefreshing}
                      onClick={() => setLogsPage((p) => p + 1)}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Order Modal dialog popup */}
      <CreateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Dynamic Toaster Success Banners */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <span>✅</span>
            {toastMessage}
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '24px 0',
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          borderTop: '1px solid var(--border-color)',
          marginTop: 'auto'
        }}
      >
        &copy; {new Date().getFullYear()} Order Management System. Protected with Auth Keys.
      </footer>
    </>
  );
};

export default Dashboard;
