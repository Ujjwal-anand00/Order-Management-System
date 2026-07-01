# Order Management API Documentation

This document describes the REST API endpoints for the Order Management System under `/api/v1/orders`.

---

## 1. Common Response Formats

All API endpoints return JSON responses with a consistent structure.

### Success Response Format
```json
{
  "status": "success",
  "data": {
    // Response payload data
  },
  "message": "Optional descriptive success message"
}
```

### Error / Validation Fail Response Format
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than zero"
    }
  ]
}
```

---

## 2. API Endpoints

### 2.1. Create Order
Creates a new customer order. The unique, human-readable `orderId` is automatically generated on the server.

* **URL**: `/api/v1/orders`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  * `customerName` (String, required, max: 100): Customer's name. Will be trimmed.
  * `phoneNumber` (String, required, pattern: `/^\+?\d{10,15}$/`): Valid phone number (10 to 15 digits, optional leading `+`).
  * `productName` (String, required, max: 200): Product name. Will be trimmed.
  * `amount` (Number, required, positive): Must be greater than 0.
  * `paymentStatus` (String, required): Must be one of `PENDING`, `PAID`, or `FAILED`.

#### Example Request Body
```json
{
  "customerName": "Alice Johnson",
  "phoneNumber": "+15551234567",
  "productName": "Gaming Mouse",
  "amount": 49.99,
  "paymentStatus": "PENDING"
}
```

#### Example Response (201 Created)
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD-B3A9C8D1",
    "customerName": "Alice Johnson",
    "phoneNumber": "+15551234567",
    "productName": "Gaming Mouse",
    "amount": 49.99,
    "paymentStatus": "PENDING",
    "currentOrderStatus": "PLACED",
    "_id": "64a0f4e3c799a4e321528b12",
    "createdAt": "2026-07-01T10:46:05.123Z",
    "updatedAt": "2026-07-01T10:46:05.123Z"
  },
  "message": "Order created successfully"
}
```

#### Example Validation Error Response (400 Bad Request)
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than zero"
    }
  ]
}
```

---

### 2.2. Get All Orders
Retrieves a paginated list of orders. Supports filtering by status, case-insensitive searching on `orderId` or `customerName`, and sorting by `createdAt` or `amount`.

* **URL**: `/api/v1/orders`
* **Method**: `GET`
* **Query Parameters**:
  * `page` (Number, optional, default: `1`): Page number (min: 1).
  * `limit` (Number, optional, default: `10`): Number of records per page (min: 1, max: 100).
  * `status` (String, optional): Filter orders by status (`PLACED`, `PROCESSING`, `READY_TO_SHIP`).
  * `search` (String, optional): Case-insensitive search on `orderId` or `customerName`.
  * `sortBy` (String, optional, default: `createdAt`): Field to sort by (`createdAt`, `amount`).
  * `sortOrder` (String, optional, default: `desc`): Order of sort (`asc`, `desc`).

#### Example Request
`GET /api/v1/orders?page=1&limit=2&status=PLACED&sortBy=amount&sortOrder=asc`

#### Example Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "_id": "64a0f4e3c799a4e321528b13",
        "orderId": "ORD-SEED002",
        "customerName": "Charlie Brown",
        "phoneNumber": "+15554445555",
        "productName": "Kite",
        "amount": 15,
        "paymentStatus": "FAILED",
        "currentOrderStatus": "PLACED",
        "createdAt": "2026-07-01T10:46:05.125Z",
        "updatedAt": "2026-07-01T10:46:05.125Z"
      },
      {
        "_id": "64a0f4e3c799a4e321528b12",
        "orderId": "ORD-B3A9C8D1",
        "customerName": "Alice Smith",
        "phoneNumber": "+15551234567",
        "productName": "Keyboard",
        "amount": 55,
        "paymentStatus": "PENDING",
        "currentOrderStatus": "PLACED",
        "createdAt": "2026-07-01T10:46:05.123Z",
        "updatedAt": "2026-07-01T10:46:05.123Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 2,
      "pages": 2
    }
  },
  "message": "Orders retrieved successfully"
}
```

---

### 2.3. Get Single Order
Retrieves a single order by its unique human-readable `orderId`.

* **URL**: `/api/v1/orders/:orderId`
* **Method**: `GET`

#### Example Request
`GET /api/v1/orders/ORD-B3A9C8D1`

#### Example Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD-B3A9C8D1",
    "customerName": "Alice Smith",
    "phoneNumber": "+15551234567",
    "productName": "Keyboard",
    "amount": 55,
    "paymentStatus": "PENDING",
    "currentOrderStatus": "PLACED",
    "_id": "64a0f4e3c799a4e321528b12",
    "createdAt": "2026-07-01T10:46:05.123Z",
    "updatedAt": "2026-07-01T10:46:05.123Z"
  },
  "message": "Order retrieved successfully"
}
```

#### Example Error Response (404 Not Found)
```json
{
  "status": "fail",
  "message": "Order with ID 'ORD-B3A9C8D1' not found"
}
```

---

### 2.4. Update Order
Updates the editable fields of an order. Non-editable fields like `orderId`, `currentOrderStatus`, `createdAt`, and `updatedAt` are strictly rejected/validated out.

* **URL**: `/api/v1/orders/:orderId`
* **Method**: `PATCH`
* **Headers**: `Content-Type: application/json`
* **Request Body** (at least one field must be provided):
  * `customerName` (String, optional, max: 100)
  * `phoneNumber` (String, optional, pattern: `/^\+?\d{10,15}$/`)
  * `productName` (String, optional, max: 200)
  * `amount` (Number, optional, positive)
  * `paymentStatus` (String, optional): Must be `PENDING`, `PAID`, or `FAILED`.

#### Example Request Body
```json
{
  "customerName": "Alice Smith",
  "amount": 55.00
}
```

#### Example Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "orderId": "ORD-B3A9C8D1",
    "customerName": "Alice Smith",
    "phoneNumber": "+15551234567",
    "productName": "Keyboard",
    "amount": 55,
    "paymentStatus": "PENDING",
    "currentOrderStatus": "PLACED",
    "_id": "64a0f4e3c799a4e321528b12",
    "createdAt": "2026-07-01T10:46:05.123Z",
    "updatedAt": "2026-07-01T10:46:05.244Z"
  },
  "message": "Order updated successfully"
}
```

#### Example Error Response for Non-editable Fields (400 Bad Request)
```json
{
  "status": "fail",
  "message": "Validation failed",
  "errors": [
    {
      "field": "currentOrderStatus",
      "message": "currentOrderStatus is not allowed"
    }
  ]
}
```

---

### 2.5. Delete Order
Deletes an order permanently from the system.

* **URL**: `/api/v1/orders/:orderId`
* **Method**: `DELETE`

#### Example Request
`DELETE /api/v1/orders/ORD-B3A9C8D1`

#### Example Response (200 OK)
```json
{
  "status": "success",
  "data": null,
  "message": "Order deleted successfully"
}
```
