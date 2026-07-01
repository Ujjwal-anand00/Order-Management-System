const express = require('express');
const Joi = require('joi');
const orderController = require('../../controllers/orderController');
const validate = require('../../middleware/validate');
const { PAYMENT_STATUS, ORDER_STATUS } = require('../../utils/constants');

const router = express.Router();

// Joi schema for validating order creation
const createOrderSchema = Joi.object({
  customerName: Joi.string().trim().max(100).required(),
  phoneNumber: Joi.string().trim().pattern(/^\+?\d{10,15}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number (10 to 15 digits, optional leading +)'
  }),
  productName: Joi.string().trim().max(200).required(),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be greater than zero'
  }),
  paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)).required()
});

// Joi schema for validating order update
const updateOrderSchema = Joi.object({
  customerName: Joi.string().trim().max(100).optional(),
  phoneNumber: Joi.string().trim().pattern(/^\+?\d{10,15}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number (10 to 15 digits, optional leading +)'
  }),
  productName: Joi.string().trim().max(200).optional(),
  amount: Joi.number().positive().optional().messages({
    'number.positive': 'Amount must be greater than zero'
  }),
  paymentStatus: Joi.string().valid(...Object.values(PAYMENT_STATUS)).optional()
}).min(1);

// Joi schema for validating query parameters in getAllOrders
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  status: Joi.string().valid(...Object.values(ORDER_STATUS)).optional(),
  search: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('createdAt', 'amount').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

router.route('/')
  .post(validate(createOrderSchema, 'body'), orderController.createOrder)
  .get(validate(querySchema, 'query'), orderController.getAllOrders);

router.route('/:orderId')
  .get(orderController.getOrderById)
  .patch(validate(updateOrderSchema, 'body'), orderController.updateOrder)
  .delete(orderController.deleteOrder);

module.exports = router;
