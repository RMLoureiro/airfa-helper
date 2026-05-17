from sqlalchemy import Column, Integer, String, Enum
from app.db.base import Base
from app.models.enums import RepertoireState

class Repertoire(Base):
    __tablename__ = "repertoire"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    youtube_link = Column(String, nullable=True)
    folder_path = Column(String, nullable=True)
    state = Column(Enum(RepertoireState), nullable=False)
