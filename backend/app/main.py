from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, destinations, trips


app = FastAPI(title=settings.app_name,
              description="Plan meaningful trips with shared itineraries and a clear view of your budget.",
              version="1.0.0", openapi_url="/api/openapi.json", docs_url="/api/docs", redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router, prefix="/api")
app.include_router(destinations.router, prefix="/api")
app.include_router(trips.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "application": settings.app_name}
