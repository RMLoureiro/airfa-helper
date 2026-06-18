from sqlalchemy import Column, Integer, String, Enum, Date, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.enums import SystemRole, MusicalRole

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    address = Column(String, nullable=True)
    join_year = Column(Integer, nullable=True)
    system_role = Column(Enum(SystemRole), nullable=False)
    musical_role = Column(Enum(MusicalRole), nullable=True)
    # Soft delete: when set, the member is a "former member" and is excluded
    # from all active features while keeping their historical records intact.
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    instruments = relationship("Instrument", back_populates="user")

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
