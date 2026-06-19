from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import NotificationType, SystemRole
from app.models.newsletter import Newsletter
from app.models.user import User
from app.schemas.newsletter import NewsletterCreate, NewsletterRead
from app.services.notifications import broadcast_notification

router = APIRouter(prefix="/newsletter", tags=["newsletter"])



def _to_read(newsletter: Newsletter, author_name: str | None) -> NewsletterRead:
    return NewsletterRead(
        id=newsletter.id,
        title=newsletter.title,
        content=newsletter.content,
        author_id=newsletter.author_id,
        author_name=author_name,
        created_at=newsletter.created_at,
        facebook_link=newsletter.facebook_link,
        instagram_link=newsletter.instagram_link,
        youtube_link=newsletter.youtube_link,
    )


@router.get("", response_model=list[NewsletterRead])
def list_newsletter(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Newsletter, User.name)
        .join(User, Newsletter.author_id == User.id)
        .order_by(Newsletter.created_at.desc())
        .all()
    )
    return [_to_read(newsletter, author_name) for newsletter, author_name in rows]


@router.post("", response_model=NewsletterRead)
def create_newsletter(
    payload: NewsletterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    newsletter = Newsletter(
        title=payload.title,
        content=payload.content,
        author_id=current_user.id,
        facebook_link=payload.facebook_link,
        instagram_link=payload.instagram_link,
        youtube_link=payload.youtube_link,
    )
    db.add(newsletter)
    broadcast_notification(db, NotificationType.NEWSLETTER, f"Nova publicação: {payload.title}")
    db.commit()
    db.refresh(newsletter)
    return _to_read(newsletter, current_user.name)


@router.put("/{newsletter_id}", response_model=NewsletterRead)
def update_newsletter(
    newsletter_id: int,
    payload: NewsletterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    newsletter = db.query(Newsletter).filter(Newsletter.id == newsletter_id).first()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")

    newsletter.title = payload.title
    newsletter.content = payload.content
    newsletter.facebook_link = payload.facebook_link
    newsletter.instagram_link = payload.instagram_link
    newsletter.youtube_link = payload.youtube_link

    broadcast_notification(db, NotificationType.NEWSLETTER, f"Publicação atualizada: {newsletter.title}")
    db.commit()
    db.refresh(newsletter)

    author = db.query(User).filter(User.id == newsletter.author_id).first()
    return _to_read(newsletter, author.name if author else None)


@router.delete("/{newsletter_id}")
def delete_newsletter(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    newsletter = db.query(Newsletter).filter(Newsletter.id == newsletter_id).first()
    if not newsletter:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")

    title = newsletter.title
    db.delete(newsletter)
    broadcast_notification(db, NotificationType.NEWSLETTER, f"Publicação removida: {title}")
    db.commit()
    return {"ok": True}
