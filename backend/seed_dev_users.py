#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DevAuth — Sennova
=================
Resetea/crea usuarios de desarrollo. La contraseña se inyecta mediante DEV_SEED_PASSWORD.

Uso:
    python seed_dev_users.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import bcrypt

PROJECT_NAME = "sennova"
DEV_PASSWORD = os.getenv("DEV_SEED_PASSWORD")
if not DEV_PASSWORD:
    raise RuntimeError("Define DEV_SEED_PASSWORD antes de ejecutar el seed de desarrollo")

DEV_USERS = [
    # (nombre,              email,                              rol,            documento)
    ("Admin Sennova",       "admin@sennova.dev.co",            "admin",        "admin01"),
    ("Investigador Dev",    "investigador@sennova.dev.co",     "investigador", "inv01"),
    ("Aprendiz Dev",        "aprendiz@sennova.dev.co",         "aprendiz",     "apr01"),
]


def seed():
    from app.database import SessionLocal, engine, Base
    from app.models import User

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print(f"\n🌱 DevAuth Bootstrap — {PROJECT_NAME.upper()}")
    print("=" * 50)
    print("   Contraseña: suministrada por DEV_SEED_PASSWORD")
    print("=" * 50)

    created, updated = 0, 0
    hashed = bcrypt.hashpw(DEV_PASSWORD.encode(), bcrypt.gensalt()).decode()

    for nombre, email, rol, documento in DEV_USERS:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                email=email,
                nombre=nombre,
                password_hash=hashed,
                rol=rol,
                documento=documento,
                is_active=True,
            )
            db.add(user)
            created += 1
            print(f"  ✅ CREADO  — {email} ({rol})")
        else:
            user.password_hash = hashed  # Forzar reset siempre en dev
            user.is_active = True
            updated += 1
            print(f"  🔄 RESET   — {email} ({rol})")

    try:
        db.commit()
    except Exception as __db_err:
        import logging
        logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
        try:
            if 'session' in globals() or 'session' in locals(): db.session.rollback()
            else: db.rollback()
        except: pass
    db.close()

    print(f"\n  Total: {created} creados, {updated} actualizados")
    print("=" * 50)
    print("  🎯 Acceso rápido listo. UI: botones 'Acceso Rápido'")
    print()


if __name__ == "__main__":
    seed()
