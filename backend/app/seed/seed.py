import os
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.models.enums import SystemRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def seed_super_admin():
    db: Session = SessionLocal()
    email = os.getenv("SUPER_ADMIN_EMAIL", "admin@airfa.pt")
    password = os.getenv("SUPER_ADMIN_PASSWORD", "admin123")
    name = os.getenv("SUPER_ADMIN_NAME", "Super Admin")
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
        print(f"Super-admin criado: {email}")
    else:
        print(f"Super-admin já existe: {email}")
    db.close()

if __name__ == "__main__":
    seed_super_admin()
