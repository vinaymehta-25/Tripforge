from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Destination
from app.schemas import DestinationOut


router = APIRouter(prefix="/destinations", tags=["destinations"])


@router.get("", response_model=list[DestinationOut])
def list_destinations(q: str = Query(default="", max_length=100), region: str = Query(default="", max_length=80),
                      featured: bool | None = None, db: Session = Depends(get_db)):
    statement = select(Destination)
    if q.strip():
        term = f"%{q.strip()}%"
        statement = statement.where(or_(Destination.name.ilike(term), Destination.country.ilike(term), Destination.best_for.ilike(term)))
    if region.strip() and region.lower() != "all":
        statement = statement.where(Destination.region.ilike(region.strip()))
    if featured is not None:
        statement = statement.where(Destination.featured == featured)
    return db.scalars(statement.order_by(Destination.featured.desc(), Destination.name)).all()


@router.get("/{destination_id}", response_model=DestinationOut)
def get_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = db.get(Destination, destination_id)
    if destination is None:
        raise HTTPException(status_code=404, detail="Destination not found.")
    return destination
