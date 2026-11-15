from decimal import Decimal
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Destination


DESTINATIONS = [
    ("Kyoto", "Japan", "Asia", "Quiet lanes, temple gardens, and late-night ramen. A city that rewards slowing down.", "photo-1493976040374-85c8e12f0c0e", "Culture · food · slow travel", "145", "4.9", True),
    ("Lisbon", "Portugal", "Europe", "Sunlit tiled streets, tiny seafood bars, and a coastline just a short train ride away.", "photo-1555881400-74d7acaacd8b", "Food · culture · coast", "130", "4.8", True),
    ("Marrakech", "Morocco", "Africa", "A sensory maze of riads, spice stalls, and desert colours at the edge of the Atlas.", "photo-1539020140153-e479b8c22e70", "Markets · design · adventure", "95", "4.8", True),
    ("Amalfi Coast", "Italy", "Europe", "Cliffside villages, long lunches, and the kind of blue that makes you forget your inbox.", "photo-1533104816931-20fa691ff6ca", "Romance · coast · food", "210", "4.9", True),
    ("Ubud", "Indonesia", "Asia", "Rice terraces, family-run cafés, and small rituals that make a week feel longer.", "photo-1537996194471-e657df975ab4", "Nature · wellness · culture", "75", "4.7", True),
    ("Mexico City", "Mexico", "Americas", "World-class museums, ambitious kitchens, and neighbourhoods made for wandering.", "photo-1518105779142-d975f22f1b0a", "Food · art · city breaks", "110", "4.8", True),
    ("Reykjavík", "Iceland", "Europe", "A colourful northern basecamp for hot springs, volcanic landscapes, and midnight light.", "photo-1476610182048-b716b8518aae", "Nature · road trips · outdoors", "195", "4.7", False),
    ("Cape Town", "South Africa", "Africa", "Mountain mornings, ocean afternoons, and a food scene with a point of view.", "photo-1580060839134-75a5edca2e99", "Nature · food · outdoors", "125", "4.8", False),
    ("New York", "United States", "Americas", "A hundred different trips in one city, connected by a good walk and a better slice.", "photo-1496588152823-86ff7695e68f", "Culture · food · city breaks", "230", "4.7", False),
    ("Hoi An", "Vietnam", "Asia", "Lantern-lit evenings, riverside cafés, and easy rides through green countryside.", "photo-1528127269322-539801943592", "Food · culture · slow travel", "65", "4.8", False),
    ("Copenhagen", "Denmark", "Europe", "Design-minded neighbourhoods, harbour swims, and very good reasons to stay for dinner.", "photo-1513622470522-26c3c8a854bc", "Design · food · city breaks", "190", "4.7", False),
    ("Banff", "Canada", "Americas", "Glacier lakes and trailhead starts, with a small mountain town to come home to.", "photo-1503614472-8c93d56cd938", "Nature · outdoors · road trips", "175", "4.9", False),
]


def seed_destinations() -> int:
    created = 0
    with SessionLocal() as db:
        for name, country, region, description, photo, best_for, cost, rating, featured in DESTINATIONS:
            existing = db.scalar(select(Destination).where(Destination.name == name, Destination.country == country))
            if existing:
                continue
            db.add(Destination(
                name=name, country=country, region=region, description=description,
                image_url=f"https://images.unsplash.com/{photo}?auto=format&fit=crop&w=1400&q=85",
                best_for=best_for, estimated_daily_cost=Decimal(cost), rating=Decimal(rating), featured=featured,
            ))
            created += 1
        db.commit()
    return created


if __name__ == "__main__":
    print(f"Added {seed_destinations()} destinations.")
