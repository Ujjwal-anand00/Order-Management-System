# Database Design & Order Data Models Documentation

This document describes the architectural layout, schemas, indexing strategies, and scalability design choices for the database schemas.

---

## 1. Schema Architecture & Collections

We use three separate collections to structure the database:

### Collection 1: Orders (`orders`)
Stores the primary state of each customer order. It tracks core transactional fields:
- `orderId`: A unique, human-readable identifier.
- `customerName` & `phoneNumber`: Basic customer context.
- `productName` & `amount`: Core order items information.
- `paymentStatus` & `currentOrderStatus`: Crucial statuses driven by state enums.

### Collection 2: Order Status History (`orderstatushistories`)
Maintains an immutable audit trail of status transitions for orders. Each document captures a single transition event, pointing back to the order via a Mongoose reference (`orderRef`).

### Collection 3: Scheduler Logs (`schedulerlogs`)
Tracks the execution metrics and outcomes of scheduler jobs. This collection exists independently from the order processing system to monitor system health and debug runtime issues.

---

## 2. Rationale for Separate Collections vs. Embedding

### Status History Separation
Instead of embedding order status history as an array inside the `Order` document, it is stored in a separate collection for the following reasons:
- **Avoid Document Bloat**: In MongoDB, documents have a maximum size limit of 16MB. Embedding a growing array of history states inside the order record could cause performance issues due to document resizing, memory fragmentation, and potential bloat for long-lived orders.
- **Transactional Cleanliness**: Reading/updating a single order does not require loading its entire audit trail into memory, optimizing standard CRUD operations.
- **State Auditing**: Independent documents make it simpler to run analytics on transitions (e.g., measuring average processing time from `PLACED` to `READY_TO_SHIP`) using MongoDB aggregation pipelines.

### Scheduler Logs Independence
Scheduler execution records track server operations rather than order entities. Keeping them in an independent collection prevents coupling system logs with business-domain documents.

---

## 3. Indexing Strategy

To optimize retrieval performance and scheduler efficiency, the following indexes are defined:

### Orders Collection Indexes
- `{ orderId: 1 }` (Unique): Ensures strict uniqueness of order IDs at the database level and optimizes single-order lookups.
- `{ currentOrderStatus: 1 }`: Optimizes order filtering by status (e.g., retrieving all `PROCESSING` orders to update their status).
- `{ createdAt: 1 }`: Enables fast chronological querying and sorting.
- `{ customerName: 1 }` & `{ phoneNumber: 1 }`: Speeds up customer-specific queries and search autocomplete queries.

### Order Status History Indexes
- `{ orderRef: 1 }`: Optimizes one-to-many relationship lookups. Speeds up query operations seeking to display the audit history of a specific order.

### Scheduler Logs Indexes
- `{ startTime: -1 }`: Enables fast query operations seeking to retrieve the most recent scheduler runs or generate execution reports.

---

## 4. Uniqueness & Duplicate Prevention

Duplicate orders are prevented using:
- **Database Unique Index**: Setting `{ unique: true }` on the `orderId` field in Mongoose ensures MongoDB rejects any document insertion attempting to use an existing ID.
- **Application Validation**: Uniqueness is checked during creation requests before saving.

---

## 5. Scalability Considerations

The schemas are designed to be easily extensible without requiring major refactoring:
- **Predefined Enum Expansion**: Additional statuses (e.g., `SHIPPED`, `DELIVERED`, `CANCELLED`) can be introduced by appending values to the centralized constants module, without altering existing schemas.
- **Transitioning to Multiple Products**: The single `productName` and `amount` fields can be scaled in the future by adding an optional `items` array without breaking backwards compatibility.
- **User Ownership**: Adding user accounts or multi-tenancy can be implemented by adding a `userRef` field referencing a Users collection.
- **Analytics & Tracking**: Integrating third-party delivery services or shipping tracking codes can be handled by appending nested objects (e.g., `shippingDetails`) onto the `Order` schema.
