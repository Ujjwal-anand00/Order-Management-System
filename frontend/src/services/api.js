const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Fetch orders from the backend with an optional status filter
 * @param {string} status - Selected status filter ('ALL', 'PLACED', 'PROCESSING', 'READY_TO_SHIP')
 * @returns {Promise<Array>} List of orders
 */
export const fetchOrders = async (status = 'ALL') => {
  const queryParams = new URLSearchParams();
  
  if (status && status !== 'ALL') {
    queryParams.append('status', status);
  }
  
  // Request a high limit to get all orders for the dashboard (since pagination is not yet implemented in UI)
  queryParams.append('limit', '100');

  const url = `${API_URL}/orders?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error (Status ${response.status})`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success' && result.data && Array.isArray(result.data.items)) {
      return result.data.items;
    }
    
    throw new Error('Invalid API response structure');
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    throw error;
  }
};
