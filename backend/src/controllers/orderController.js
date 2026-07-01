const orderService = require('../services/orderService');
const { sendSuccess } = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../utils/constants');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller to handle Order creation
 */
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, order, 'Order created successfully');
});

/**
 * Controller to retrieve all orders with query parameters
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, status, search, sortBy, sortOrder } = req.query;
  const result = await orderService.getAllOrders(
    { status, search },
    { page, limit, sortBy, sortOrder }
  );
  sendSuccess(res, HTTP_STATUS.OK, result, 'Orders retrieved successfully');
});

/**
 * Controller to retrieve a single order by Order ID
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await orderService.getOrderById(orderId);
  sendSuccess(res, HTTP_STATUS.OK, order, 'Order retrieved successfully');
});

/**
 * Controller to update an existing order's editable fields
 */
const updateOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await orderService.updateOrder(orderId, req.body);
  sendSuccess(res, HTTP_STATUS.OK, order, 'Order updated successfully');
});

/**
 * Controller to delete an order
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  await orderService.deleteOrder(orderId);
  sendSuccess(res, HTTP_STATUS.OK, null, 'Order deleted successfully');
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder
};
