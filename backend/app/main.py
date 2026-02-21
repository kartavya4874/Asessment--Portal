from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.database import connect_db, close_db
from app.seed_admins import seed_admins
from app.routes.auth_routes import router as auth_router
from app.routes.program_routes import router as program_router
from app.routes.assessment_routes import router as assessment_router
from app.routes.submission_routes import router as submission_router
from app.routes.marks_routes import router as marks_router
from app.routes.export_routes import router as export_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await connect_db()
        await seed_admins()
    except Exception as e:
        if settings.DEV_MODE:
            print(f"⚠️  Database connection failed: {e}")
            print("💡 Application running in RESCUE MODE. Use default credentials to login.")
    yield
    # Shutdown
    try:
        await close_db()
    except Exception:
        pass


app = FastAPI(
    title="AI Lab Assessment Portal",
    description="Backend API for Geeta University's AI Training Lab Assessment Portal",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — restrict to local dev and production frontend
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if settings.FRONTEND_URL:
    if settings.FRONTEND_URL not in origins:
        origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(program_router)
app.include_router(assessment_router)
app.include_router(submission_router)
app.include_router(marks_router)
app.include_router(export_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "message": "AI Lab Assessment Portal API"}

