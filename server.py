from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pathlib import Path
from typing import Optional
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="STREAMFLIX API")
api = APIRouter(prefix="/api")

POSTERS = [
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=600&auto=format&fit=crop",
    "https://images.pexels.com/photos/28302225/pexels-photo-28302225.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.unsplash.com/photo-1505274664176-44ccaa7969a8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1782020934325-cfe4cea4fd9c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
]
BACKDROPS = [
    "https://images.unsplash.com/photo-1519608487953-e999c86e7455?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=1920&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop",
]
TITLES = [
    ("The Last Signal", "Sci-Fi", "A cartographer on a silent planet receives one impossible transmission.", 8.8),
    ("Neon Meridian", "Thriller", "Two strangers race through a city that remembers every secret.", 8.2),
    ("Afterlight", "Drama", "When the sun disappears, a family finds a new way to come home.", 8.6),
    ("Velocity Run", "Action", "A getaway driver gets one night to outrun her past.", 7.9),
    ("The Quiet House", "Horror", "Some doors should stay closed, especially the ones in your dreams.", 7.7),
    ("Small Hours", "Comedy", "Four friends, one wedding, and a weekend with no room for plans.", 8.1),
    ("Blue Atlas", "Documentary", "A visual journey through the last wild places on Earth.", 9.1),
    ("Paper Moons", "Romance", "Two artists meet at the wrong time and make the right kind of noise.", 8.0),
    ("Northbound", "Drama", "A restless musician takes the long way toward forgiveness.", 7.8),
    ("Parallel Skin", "Sci-Fi", "A scientist discovers her reflection is living five minutes ahead.", 8.4),
    ("Open Circuit", "Action", "The world's best hacker has 24 hours to become invisible.", 8.3),
    ("Wild Type", "Animation", "A small fox finds a city hidden beneath the forest floor.", 8.7),
]
MOVIES = [
    {"id": f"m{i+1}", "title": title, "genre": genre, "description": desc, "rating": rating,
     "year": 2024 - (i % 5), "runtime": f"{92 + i * 7}m", "poster": POSTERS[i % len(POSTERS)],
     "backdrop": BACKDROPS[i % len(BACKDROPS)], "type": "Movie", "cast": "Mara Voss · Elias Chen · June Hart",
     "director": "Avery North", "language": "English", "match": f"{92 - (i % 8)}%"}
    for i, (title, genre, desc, rating) in enumerate(TITLES)
]
WATCHLIST = set()
PROFILES = [{"id": "p1", "name": "Alex", "initials": "A", "kids": False}, {"id": "p2", "name": "Milo", "initials": "M", "kids": True}]

class ListItem(BaseModel):
    movie_id: str

class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=24)
    kids: bool = False

@api.get("/")
async def root():
    return {"message": "STREAMFLIX is ready"}

@api.get("/movies")
async def movies(genre: Optional[str] = None):
    return [m for m in MOVIES if not genre or m["genre"].lower() == genre.lower()]

@api.get("/movies/{movie_id}")
async def movie(movie_id: str):
    item = next((m for m in MOVIES if m["id"] == movie_id), None)
    if not item:
        raise HTTPException(404, "Title not found")
    return item

@api.get("/search")
async def search(q: str = Query("", max_length=80)):
    term = q.strip().lower()
    return [m for m in MOVIES if term in f"{m['title']} {m['genre']} {m['description']} {m['director']}".lower()]

@api.get("/watchlist")
async def get_watchlist():
    return [m for m in MOVIES if m["id"] in WATCHLIST]

@api.post("/watchlist")
async def add_watchlist(item: ListItem):
    if not any(m["id"] == item.movie_id for m in MOVIES):
        raise HTTPException(404, "Title not found")
    WATCHLIST.add(item.movie_id)
    return {"saved": True, "movie_id": item.movie_id}

@api.delete("/watchlist/{movie_id}")
async def remove_watchlist(movie_id: str):
    WATCHLIST.discard(movie_id)
    return {"saved": False, "movie_id": movie_id}

@api.get("/profiles")
async def profiles():
    return PROFILES

@api.post("/profiles")
async def create_profile(profile: ProfileCreate):
    new_profile = {"id": f"p{len(PROFILES)+1}", "name": profile.name, "initials": profile.name[0].upper(), "kids": profile.kids}
    PROFILES.append(new_profile)
    return new_profile

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)