import os

import bcrypt
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import SystemRole

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def seed_super_admin():
    db: Session = SessionLocal()
    try:
        email = os.getenv("SUPER_ADMIN_EMAIL", "admin@airfa.pt")
        password = os.getenv("SUPER_ADMIN_PASSWORD", "admin123")
        name = os.getenv("SUPER_ADMIN_NAME", "Super Admin")
        print(f"Using database URL: {db.bind.url}", flush=True)

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                email=email,
                hashed_password=get_password_hash(password),
                name=name,
                system_role=SystemRole.SUPER_ADMIN,
            )
            db.add(user)
            db.commit()
            print(f"Super-admin criado: {email}", flush=True)
        else:
            print(f"Super-admin já existe: {email}", flush=True)

        total = db.query(User).filter(User.email == email).count()
        print(f"Matching super-admin rows: {total}", flush=True)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_super_admin()
