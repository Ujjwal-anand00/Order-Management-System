# Order Management System

A production-ready Order Management System designed for efficient order processing, user management, and tracking.

## Technology Stack

* **Backend**: Node.js, Express.js, MongoDB (Mongoose)
* **Frontend**: React (Vite), Tailwind CSS, React Router DOM, Axios, TanStack Query, React Hook Form, Zod
* **Tooling & Code Quality**: ESLint, Prettier

## Folder Structure

```text
order-management-system/
├── backend/                # Backend API using Express & Node.js
│   ├── src/
│   │   ├── config/         # Configuration files (database, env, etc.)
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Database schemas
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Helper functions/utilities
│   │   ├── cron/           # Scheduled cron jobs
│   │   ├── app.js          # App initialization
│   │   └── server.js       # Server entry point
│   ├── .env                # Local environment variables
│   ├── .env.example        # Example environment configuration
│   ├── package.json        # Backend package metadata & dependencies
│   └── .gitignore          # Backend Git ignore configurations
│
├── frontend/               # Frontend SPA using React + Vite
│   ├── src/
│   │   ├── assets/         # Static assets (images, fonts)
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page views/screens
│   │   ├── services/       # API integration services (Axios)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── context/        # React Context providers for state
│   │   ├── layouts/        # Page layout components
│   │   ├── utils/          # Common utilities & helper functions
│   │   ├── styles/         # Styles (Tailwind directives, main.css)
│   │   ├── App.jsx         # App root component
│   │   └── main.jsx        # App entry point
│   ├── public/             # Static public assets
│   ├── .env                # Local environment variables
│   ├── .env.example        # Example environment configuration
│   ├── package.json        # Frontend package metadata & dependencies
│   └── .gitignore          # Frontend Git ignore configurations
│
├── README.md               # Project overview and documentation
└── .gitignore              # Root Git ignore configurations
```
