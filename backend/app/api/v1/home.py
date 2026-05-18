from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db
from app.models.event import Event
from app.models.newsletter import Newsletter
from app.models.user import User
from app.schemas.dashboard import HomeFeedItemRead, HomeResponse, UpcomingBirthdayRead

router = APIRouter(prefix="/home", tags=["home"])


def _days_until_birthday(birth_date: date | None) -> int | None:
    if not birth_date:
        return None
    today = date.today()
    next_birthday = birth_date.replace(year=today.year)
    if next_birthday < today:
        next_birthday = next_birthday.replace(year=today.year + 1)
    return (next_birthday - today).days


@router.get("", response_model=HomeResponse)
def read_home(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    events = (
        db.query(Event)
        .filter(Event.start_time >= now)
        .order_by(Event.start_time.asc())
        .limit(10)
        .all()
    )
    newsletters = db.query(Newsletter).order_by(Newsletter.created_at.desc()).limit(10).all()

    users = db.query(User).filter(User.birth_date.isnot(None)).order_by(User.birth_date.asc()).all()
    birthdays = []
    for user in users:
        birthdays.append(
            UpcomingBirthdayRead(
                id=user.id,
                name=user.name,
                birth_date=user.birth_date,
                days_until=_days_until_birthday(user.birth_date),
            )
        )

    recent_feed = [
        HomeFeedItemRead(
            id=event.id,
            item_type="EVENT",
            title=event.title,
            description=event.description,
            published_at=event.start_time,
            event_type=event.type.value,
            facebook_link=event.facebook_link,
            instagram_link=event.instagram_link,
        )
        for event in events
    ]
    recent_feed.extend(
        [
            HomeFeedItemRead(
                id=post.id,
                item_type="NEWSLETTER",
                title=post.title,
                description=post.content,
                published_at=post.created_at,
            )
            for post in newsletters
        ]
    )
    recent_feed.sort(key=lambda item: item.published_at, reverse=True)

    return HomeResponse(
        name=current_user.name,
        system_role=current_user.system_role.value,
        musical_role=current_user.musical_role.value if current_user.musical_role else None,
        upcoming_events=[
            {
                "id": event.id,
                "title": event.title,
                "description": event.description,
                "start_time": event.start_time,
                "location": event.location,
                "type": event.type.value,
                "facebook_link": event.facebook_link,
                "instagram_link": event.instagram_link,
            }
            for event in events
        ],
        upcoming_birthdays=birthdays[:10],
        recent_feed=recent_feed[:12],
    )
