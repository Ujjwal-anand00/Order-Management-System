const { v4: uuidv4 } = require('uuid');
const Order = require('../models/order');
const AppError = require('../utils/appError');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Generate a unique human-readable Order ID
 * Format: ORD-XXXXXXXX (where XXXXXXXX is 8 alphanumeric characters from a UUID)
 * Checks MongoDB for duplicates up to 3 times to ensure uniqueness.
 */
const generateUniqueOrderId = async () => {
  let orderId;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 3) {
    orderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new AppError('Failed to generate a unique Order ID. Please try again.', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return orderId;
};

/**
 * Create a new order
 * @param {Object} orderData - Order payload (customerName, phoneNumber, productName, amount, paymentStatus)
 * @returns {Promise<Object>} Created order document
 */
const createOrder = async (orderData) => {
  const orderId = await generateUniqueOrderId();
  const order = new Order({
    ...orderData,
    orderId
  });

  return await order.save();
};

/**
 * Get all orders with pagination, filtering, searching, and sorting
 * @param {Object} filters - Search and filter parameters (status, search)
 * @param {Object} queryOptions - Pagination and sort parameters (page, limit, sortBy, sortOrder)
 * @returns {Promise<Object>} Object containing items array and pagination metadata
 */
const getAllOrders = async (filters, queryOptions) => {
  const filter = {};

  // Filtering by status
  if (filters.status) {
    filter.currentOrderStatus = filters.status;
  }

  // Searching by Order ID or Customer Name (case-insensitive)
  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    filter.$or = [
      { orderId: searchRegex },
      { customerName: searchRegex }
    ];
  }

  // Pagination parameters
  const page = Math.max(1, parseInt(queryOptions.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(queryOptions.limit) || 10));
  const skip = (page - 1) * limit;

  // Sorting parameters
  const sortBy = ['createdAt', 'amount'].includes(queryOptions.sortBy) ? queryOptions.sortBy : 'createdAt';
  const sortOrder = queryOptions.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  // Fetch items and calculate pagination metadata
  const items = await Order.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments(filter);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get a single order by its human-readable Order ID
 * @param {string} orderId - Human-readable Order ID (e.g. ORD-XXXXXXXX)
 * @returns {Promise<Object>} Order document
 */
const getOrderById = async (orderId) => {
  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }
  return order;
};

/**
 * Update an existing order by its human-readable Order ID
 * @param {string} orderId - Human-readable Order ID
 * @param {Object} updateData - Key-value pairs to update (customerName, phoneNumber, productName, amount, paymentStatus)
 * @returns {Promise<Object>} Updated order document
 */
const updateOrder = async (orderId, updateData) => {
  const order = await Order.findOne({ orderId });
  if (!order) {
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }

  // Update only allowed fields
  const allowedUpdates = ['customerName', 'phoneNumber', 'productName', 'amount', 'paymentStatus'];
  allowedUpdates.forEach(key => {
    if (updateData[key] !== undefined) {
      order[key] = updateData[key];
    }
  });

  return await order.save();
};

/**
 * Delete an order by its human-readable Order ID
 * @param {string} orderId - Human-readable Order ID
 * @returns {Promise<Object>} Deleted order document
 */
const deleteOrder = async (orderId) => {
  const order = await Order.findOneAndDelete({ orderId });
  if (!order) {
    throw new AppError(`Order with ID '${orderId}' not found`, HTTP_STATUS.NOT_FOUND);
  }
  return order;
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder
};
