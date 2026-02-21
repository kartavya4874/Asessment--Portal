# AI Lab Assessment Portal

Full-stack web application for Geeta University's AI Training Lab.

## Tech Stack

- **Frontend**: React (Vite) + TailwindCSS + Framer Motion
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Database**: MongoDB
- **File Storage**: Firebase Storage
- **Auth**: JWT-based (admin & student roles)
- **Excel Export**: openpyxl

---

## Setup Instructions

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB** (local or Atlas)
- **Firebase** project with Storage enabled (optional for dev)

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
# Edit .env with your MongoDB URI, JWT secret, Firebase details

# Seed default admin account
python seed.py

# Start server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Default Admin Credentials

```
Email:    admin@geetauniversity.edu.in
Password: admin123
```

> ⚠️ Change the default password after first login.

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `DB_NAME` | Database name (default: `ai_lab_assessment`) |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRE_MINUTES` | Token expiry (default: 1440 = 24h) |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase service account JSON |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `DEV_MODE` | Set to `true` to allow any email domain for students |
