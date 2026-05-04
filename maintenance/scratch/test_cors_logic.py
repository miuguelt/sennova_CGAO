
import os
import sys

# Mock settings
class MockSettings:
    ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173,http://127.0.0.1:3001"
    DEBUG = True

settings = MockSettings()

BASE_ORIGINS = [
    "http://localhost:3001",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
]

if settings.ALLOWED_ORIGINS:
    all_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")] + BASE_ORIGINS
else:
    all_origins = BASE_ORIGINS

ALLOWED_ORIGINS_LIST = list(set([o.strip() for o in all_origins if o]))
print(f"ALLOWED_ORIGINS_LIST: {ALLOWED_ORIGINS_LIST}")
