# School ERP Monorepo

This project is now structured as a simple monorepo with separate frontend and backend applications.

## Structure

```text
/
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   ├── vite.config.ts
│   └── other Vite/TypeScript frontend files
├── backend
│   ├── server.js
│   ├── attendanceDb.js
│   ├── complaintDb.js
│   ├── package.json
│   ├── requirements.txt
│   └── Python AI/ML files
├── .env
└── README.md
```

## Environment

Shared environment config lives in the root `.env` file.

Example:

```env
GEMINI_API_KEY=your_api_key_here
VITE_API_BASE=/api
```

## Run Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Run Backend

```bash
cd backend
npm run start
```

Backend runs on `http://localhost:5000`.

## Notes

- Frontend Vite dev server proxies `/api` requests to `http://localhost:5000`
- Backend reads the shared root `.env` using `../.env`
- Frontend reads Vite variables from the shared root `.env` using `envDir: '..'`
