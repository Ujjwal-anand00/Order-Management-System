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

