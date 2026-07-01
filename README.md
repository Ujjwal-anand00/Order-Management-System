# Order Management System (OMS)

A production-ready, secure, and responsive Order Management System designed for efficient order processing, auditing status histories, and scheduling automated state transitions.

---

## 1. Project Overview & Features
This application is designed to solve standard logistics pipelines by tracking orders through discrete state bounds, recording logs of scheduler processes, and keeping historical records of status updates.

### Implemented Features:
* **Order CRUD & Validation**: Modular routes to create, view, update (editable attributes only), and delete orders. Validation strictly checks body payloads and query strings.
* **Server-Side Filtering, Searching, & Pagination**: Seamless search queries matching Order ID or Customer Name, coupled with status filters (`PLACED`, `PROCESSING`, `READY_TO_SHIP`) and previous/next page indicators.
* **Automated & Manual Scheduler**: Automatically transitions orders based on state duration thresholds (10 and 20 mins). Includes custom header security controls (`x-scheduler-key`) and can be executed via cron or manual REST calls.
* **Audit History Records**: Maintained in its own collection to map chronological state transitions.
* **Scheduler Run Analytics**: Logs duration, status, checked count, and failures for monitoring.
* **Responsive Frontend Tab Console**: Sleek dashboards adapting between Orders and Scheduler Logs. Mobile layouts automatically convert table views to card lists to avoid overflows.

---

## 2. Technology Stack

### Frontend:
* **Core Framework**: React (v19) & Vite
* **API Service**: Native Fetch API (lightweight, native, zero dependencies)
* **Styling**: Vanilla CSS featuring adaptive Slate (Light) & Obsidian (Dark) themes

### Backend:
* **Runtime**: Node.js & Express
* **Database**: MongoDB (Mongoose Object Document Mapping)
* **Automation**: Node-Cron periodic timers

---

## 3. Folder Structure

```text
order-management-system/
├── backend/                    # Backend Node/Express Server
│   ├── src/
│   │   ├── config/             # DB configuration setup
│   │   ├── controllers/        # Request handling and response mapping
│   │   ├── cron/               # Scheduler background cron registration
│   │   ├── middleware/         # Auth checkers, Joi val schemas, errors handlers
│   │   ├── models/             # Mongoose schemas for Order, History, and Logs
│   │   ├── routes/             # REST route mapping (Orders & Scheduler)
│   │   ├── services/           # DB service mutations and queries
│   │   ├── tests/              # Verification suites (models, API, scheduler, cron)
│   │   ├── utils/              # Standard Response templates & appError class
│   │   ├── app.js              # Express app middleware setup
│   │   └── server.js           # Server listen and shutdown bindings
│   ├── docs/                   # API documentation and db design guides
│   ├── .env                    # Local environment settings
│   ├── .env.example            # Environment template key maps
│   └── package.json            # Script runs and backend package bounds
│
├── frontend/                   # Frontend React SPA
│   ├── src/
│   │   ├── components/         # Presentation elements (Table, Filter, States)
│   │   ├── pages/              # Main coordinating panel (Dashboard.jsx)
│   │   ├── services/           # API call client (api.js)
│   │   ├── App.css             # Root app styles
│   │   ├── App.jsx             # Render selector entry
│   │   ├── index.css           # Grid systems, HSL values, light/dark styles
│   │   └── main.jsx            # DOM render mount
│   ├── .env                    # API endpoint configuration
│   ├── .env.example            # Frontend env variables template
│   └── package.json            # Frontend package scripts
│
├── postman_collection.json     # Preconfigured Postman Collection import
└── README.md                   # Project documentation index
```

---

## 4. Installation & Local Development

### Prerequisites:
* **Node.js**: Version 18 or above.
* **MongoDB**: A running local instance or a MongoDB Atlas URI link.

### Step 1: Clone and Set Up Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the local environment variables in `backend/.env` (see section 5 below).
4. Run automated tests to verify compilation and validation boundaries:
   ```bash
   npm test
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### Step 2: Set Up Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the local environment variables in `frontend/.env` (see section 5 below).
4. Start the frontend Vite server:
   ```bash
   npm run dev
   ```
5. Build production bundle assets:
   ```bash
   npm run build
   ```

---

## 5. Environment Variables Configuration

### Backend (`backend/.env`)
* `PORT` (default: `5000`): Port mapping for the Express server.
* `MONGODB_URI`: Complete connection URI mapping your database.
* `SCHEDULER_SECRET_KEY`: Custom secret key used to protect POST trigger requests.
* `NODE_ENV`: Application environment (`development` or `production`).
* `FRONTEND_URL` (default: `http://localhost:5173`): CORS allowed origin.
* `SCHEDULER_ENABLED` (boolean, default: `true`): Enable background cron execution.
* `SCHEDULER_CRON_EXPRESSION` (string, default: `*/5 * * * *`): Fired every 5 minutes.
* `ORDER_STATUS_PLACED_TIMEOUT_MINS` (number, default: `10`): Threshold for `PLACED` age limits.
* `ORDER_STATUS_PROCESSING_TIMEOUT_MINS` (number, default: `20`): Threshold for `PROCESSING` age limits.

### Frontend (`frontend/.env`)
* `VITE_API_URL`: Backend base API URL (default: `http://localhost:5000/api/v1`).

---

## 6. API Documentation & Testing

Comprehensive HTTP specifications are detailed inside:
- [api_docs.md](file:///c:/Users/acer/OneDrive/Desktop/order-management-system/backend/docs/api_docs.md)

### Using Postman:
Import the pre-configured [postman_collection.json](file:///c:/Users/acer/OneDrive/Desktop/order-management-system/postman_collection.json) located in the project root:
1. Load Postman $\rightarrow$ Click **Import** $\rightarrow$ Upload the json file.
2. The collection declares two environment variables:
   - `base_url`: target REST endpoint prefix (default `http://localhost:5000/api/v1`).
   - `scheduler_secret`: triggering authorization key.

---

## 7. Scheduler Setup & Logic

### Automatic Transition Flow
When triggered, the scheduler checks eligible active orders and shifts their status based on age relative to their last modification timestamp (`updatedAt`):
* **PLACED** $\rightarrow$ **PROCESSING**: Triggered if the order has been in `PLACED` status for $\ge$ 10 minutes.
* **PROCESSING** $\rightarrow$ **READY_TO_SHIP**: Triggered if the order has been in `PROCESSING` status for $\ge$ 20 minutes.
* Orders in `READY_TO_SHIP` are ignored.

### Security
The `/scheduler/run` POST route checks the request header `x-scheduler-key`. If the header key is missing or does not match `SCHEDULER_SECRET_KEY`, it blocks execution and returns `401 Unauthorized`.

---

## 8. Database Design

### Collections
1. **Orders (`orders`)**: Holds customer order records, amounts, payment states, and status.
2. **Order Status History (`orderstatushistories`)**: Stores transitions. Refers back to the Order via `orderRef` (One Order to Many History records).
3. **Scheduler Logs (`schedulerlogs`)**: Logs periodic cron execution durations, checks, and failures.

### Decoupling Rationales
* **Document Size Limits**: MongoDB documents are capped at 16MB. Storing history inside an embedded array within `Order` could cause document resizing performance lags, memory fragmentation, and eventual overflow.
* **Audit Isolation**: Storing `OrderStatusHistory` independently optimizes normal order queries since audit details are only loaded when explicitly needed.
* **Log Independence**: Scheduler log histories track server cron jobs rather than order transactional states. Keeping them separate isolates application-level logs from business-domain documents.

---

## 9. System Design Decisions

* **Why MongoDB?**: Ideal for document structures that can expand dynamically (e.g. adding shipping objects, delivery providers, or multiple product items) without schema lockups.
* **Duplicate Prevention**: Rejects duplicate orders via a Mongoose schema rule `{ unique: true }` on `orderId` creating a database-level unique index constraint. The backend also enforces search checks during ID allocation.
* **Race Condition Prevention**:
  1. **Active Run Lock**: When starting, the scheduler checks `SchedulerLog` for any running job (lacking an `endTime` and started in the last 5 minutes). If found, the run is skipped.
  2. **Optimistic Concurrency Control**: Status updates run via `findOneAndUpdate` filtering by the exact state (`currentOrderStatus`, `updatedAt` timestamp) evaluated. If another instance modified the order concurrently, the update fails to match and skips.
* **Database Indexes**: Defines single-field indexes on `orderId` (unique), `customerName`, `phoneNumber`, and `currentOrderStatus` to speed up queries. Fired indexes on `createdAt` (Orders), `orderRef` (History), and `startTime` (Logs) optimize filters, search autocomplete, sorting, and logs dashboards.
