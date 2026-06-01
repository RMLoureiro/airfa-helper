# Import all models here so Alembic autogenerate can detect them
from app.models.user import User  # noqa: F401
from app.models.instrument import Instrument  # noqa: F401
from app.models.instrument_report import InstrumentReport  # noqa: F401
from app.models.event import Event  # noqa: F401
from app.models.event_attendance import EventAttendance  # noqa: F401
from app.models.repertoire import Repertoire  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.newsletter import Newsletter  # noqa: F401
from app.models.report import Report  # noqa: F401
from app.models.reinforcement import Reinforcement  # noqa: F401
from app.models.event_reinforcement import EventReinforcement  # noqa: F401
