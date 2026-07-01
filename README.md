# Order Management System

A production-ready Order Management System designed for efficient order processing, user management, and tracking.

## Technology Stack

* **Backend**: Node.js, Express.js, MongoDB (Mongoose)
* **Frontend**: React (Vite), Tailwind CSS, React Router DOM, Axios, TanStack Query, React Hook Form, Zod
* **Tooling & Code Quality**: ESLint, Prettier

## Folder Structure

```text
order-management-system/
├── backend/                
│   ├── src/
│   │   ├── config/         
│   │   ├── controllers/    
│   │   ├── middleware/     
│   │   ├── models/         
│   │   ├── routes/         
│   │   ├── services/       
│   │   ├── utils/         
│   │   ├── cron/           
│   │   ├── app.js          
│   │   └── server.js       
│   ├── .env                
│   ├── .env.example        
│   ├── package.json        
│   └── .gitignore          
│
├── frontend/               
│   ├── src/
│   │   ├── assets/         
│   │   ├── components/     
│   │   ├── pages/          
│   │   ├── services/       
│   │   ├── hooks/          
│   │   ├── context/       
│   │   ├── layouts/       
│   │   ├── utils/          
│   │   ├── styles/         
│   │   ├── App.jsx         
│   │   └── main.jsx        
│   ├── public/             
│   ├── .env                
│   ├── .env.example        
│   ├── package.json        
│   └── .gitignore          
│
├── README.md               
└── .gitignore              
```

---

## Scheduler System Architecture

### 1. Scheduler Workflow & Logic
The scheduler endpoint provides a secure, triggerable task that automatically progresses orders through states:
- Load only active orders in `PLACED` or `PROCESSING` status.
- Transition rules:
  - **PLACED** to **PROCESSING**: Triggered if the order has been in `PLACED` status for $\ge$ 10 minutes.
  - **PROCESSING** to **READY_TO_SHIP**: Triggered if the order has been in `PROCESSING` status for $\ge$ 20 minutes.

### 2. Security Approach
- The POST `/api/v1/scheduler/run` endpoint is protected.
- It requires the `x-scheduler-key` header to match the `SCHEDULER_SECRET_KEY` env variable.
- Invalid or missing keys return `401 Unauthorized`.

### 3. Audit & Execution Logging Strategy
- **Audit Logs (`OrderStatusHistory`)**: Every status update generates a permanent history record storing the order reference, previous status, new status, change reason, and modifier (`'SCHEDULER'`).
- **Execution Logs (`SchedulerLog`)**: Every scheduler execution writes a log to the database containing: execution start/end times, total orders checked/updated, final status, and any error logs.

### 4. Race Condition Prevention Strategy
- **Active Run Lock**: During start, the scheduler queries for a recently started `SchedulerLog` without a finished status (active runs are stored with `endTime = epoch (1970-01-01)`). If a running log under 5 minutes old is found, the run is skipped.
- **Optimistic Concurrency Control**: Status updates are executed via Mongoose atomic queries filtering by both the order's ID and its exact state (`currentOrderStatus`, `updatedAt` timestamp) at evaluation time. This prevents duplicate status progression or duplicate history logging if multiple instances trigger concurrently.

---

## 5. Cron Integration & Automated Execution

### Rationale: Separation of Responsibilities
To ensure a modular and scalable design, the automation logic is decoupled into three layers:
1. **Scheduler Service (`schedulerService.js`)**: Encapsulates database state mutations, timeouts, audit logs, and locking. It does not know *how* or *when* it is triggered.
2. **Scheduler API (`schedulerRoutes.js`)**: Encapsulates external trigger parameters (HTTP POST request, header validation, authentication, and HTTP JSON feedback).
3. **Cron Job (`cron/scheduler.js`)**: Encapsulates timing-based execution (running every 5 minutes). It does not contain any business logic and directly triggers the service layer.

This decoupling guarantees that the scheduler can be run automatically in the background, manually via API, or by external third-party tools (like serverless cron engines) without modifying core business rules.

### Environment Variable Parameters
The automated execution behaves according to the following keys inside the `.env` configuration:
* `SCHEDULER_ENABLED` (boolean, default: `true`): Set to `false` to disable the background cron runner (useful for serverless staging environments or dedicated worker instances).
* `SCHEDULER_CRON_EXPRESSION` (string, default: `*/5 * * * *`): Standard cron format determining the trigger frequency (default is every 5 minutes).
* `ORDER_STATUS_PLACED_TIMEOUT_MINS` (number, default: `10`): Time threshold in minutes before a `PLACED` order is progressed.
* `ORDER_STATUS_PROCESSING_TIMEOUT_MINS` (number, default: `20`): Time threshold in minutes before a `PROCESSING` order is progressed.

### Local Development & Testing
To facilitate local verification without waiting for standard time limits:
1. **Time Limits**: Shorten the timeout limits inside the local `.env` file:
   ```env
   ORDER_STATUS_PLACED_TIMEOUT_MINS=1
   ORDER_STATUS_PROCESSING_TIMEOUT_MINS=2
   ```
   Or set them to `0` to transition instantly on the next scheduler execution.
2. **Manual Runs**: Trigger a run instantly by issuing an HTTP POST to `/api/v1/scheduler/run` with the custom security header:
   ```bash
   curl -X POST http://localhost:5000/api/v1/scheduler/run -H "x-scheduler-key: dev_scheduler_secret_key"
   ```

### Cloud Deployment Strategy
This system is provider-independent and prepares the server for major cloud execution systems:
- **Dedicated Daemon / Continuous Worker (e.g. AWS ECS, Railway, Render)**: Set `SCHEDULER_ENABLED=true`. The server will boot, spin up the express server, and register the periodic cron job internally.
- **Serverless Trigger (e.g. Google Cloud Scheduler, Vercel Cron, AWS EventBridge)**:
  1. Set `SCHEDULER_ENABLED=false` to save CPU resources and prevent internal timer registrations.
  2. Configure your cloud cron provider to trigger an HTTP POST request targeting `https://<your-app-domain>/api/v1/scheduler/run` every 5 minutes.
  3. Include the secret key header `x-scheduler-key: <your_secret>` in the cloud task configuration to authorize request access.

---

## 6. Frontend React Dashboard

### Overview & Setup
The React dashboard provides a responsive administrator portal to monitor, filter, and refresh order processing statuses.

#### Local Installation & Development
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install runtime and development dependencies:
   ```bash
   npm install
   ```
3. Establish your environment configurations in `frontend/.env` (based on `frontend/.env.example`):
   ```env
   VITE_API_URL=http://localhost:5000/api/v1
   ```
4. Spin up the Vite development server:
   ```bash
   npm run dev
   ```
5. Build production bundle assets:
   ```bash
   npm run build
   ```

### Core Features & Architecture
- **API Service Layer**: Decoupled network clients in `services/api.js` requesting orders lists and status updates from the backend using environment configurations.
- **Dynamic Status Filtering**: Employs backend-driven filtering rather than local computation. Changing the status dropdown initiates standard API query parameters.
- **Refresh Action**: Re-requests the database records with loading overlays, disabling interaction controls to prevent concurrent trigger actions.
- **Loading, Empty, & Error Boundaries**: Utilizes custom loaders, empty package icons, and failed request alerts with click-to-retry handlers.
- **Responsive Table-to-Card Grid**: Automatically transforms the standard wide grid table layout into individual stacked block cards on mobile screens ($\le$ 768px) to prevent layout breakages.



