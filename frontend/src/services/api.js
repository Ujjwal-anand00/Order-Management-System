const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Fetch orders from the backend with pagination, filtering, and searching
 * @param {string} status - Selected status filter ('ALL', 'PLACED', 'PROCESSING', 'READY_TO_SHIP')
 * @param {string} search - Search query (Order ID or Customer Name)
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Object containing items array and pagination metadata
 */
export const fetchOrders = async (status = 'ALL', search = '', page = 1, limit = 10) => {
  const queryParams = new URLSearchParams();
  
  if (status && status !== 'ALL') {
    queryParams.append('status', status);
  }
  
  if (search && search.trim() !== '') {
    queryParams.append('search', search.trim());
  }
  
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const url = `${API_URL}/orders?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error (Status ${response.status})`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success' && result.data && Array.isArray(result.data.items)) {
      return result.data; // Returns { items, pagination }
    }
    
    throw new Error('Invalid API response structure');
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    throw error;
  }
};

/**
 * Fetch scheduler execution logs from the backend with pagination
 * @param {number} page - Current page number
 * @param {number} limit - Logs per page
 * @returns {Promise<Object>} Object containing logs items array and pagination metadata
 */
export const fetchSchedulerLogs = async (page = 1, limit = 10) => {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  const url = `${API_URL}/scheduler/logs?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error (Status ${response.status})`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success' && result.data && Array.isArray(result.data.items)) {
      return result.data; // Returns { items, pagination }
    }
    
    throw new Error('Invalid API response structure');
  } catch (error) {
    console.error('Error fetching scheduler logs:', error.message);
    throw error;
  }
};
