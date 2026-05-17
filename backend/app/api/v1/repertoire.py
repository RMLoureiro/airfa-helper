from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.repertoire import Repertoire
from app.models.user import User
from app.schemas.repertoire import RepertoireCreate, RepertoireFileRead, RepertoireRead

router = APIRouter(prefix="/repertoire", tags=["repertoire"])


def _resolve_folder(folder_path: str | None) -> Path | None:
    if not folder_path:
        return None
    base_dir = Path(settings.REPERTOIRE_FILES_DIR).resolve()
    folder = (base_dir / folder_path).resolve()
    if base_dir not in folder.parents and folder != base_dir:
        return None
    return folder


def _build_files(folder_path: str | None, repertoire_id: int) -> list[RepertoireFileRead]:
    folder = _resolve_folder(folder_path)
    if not folder or not folder.exists() or not folder.is_dir():
        return []

    files = []
    for file_path in sorted(folder.iterdir()):
        if file_path.is_file() and file_path.suffix.lower() == ".pdf":
            files.append(
                RepertoireFileRead(
                    name=file_path.name,
                    download_url=f"/api/v1/repertoire/{repertoire_id}/files/{file_path.name}",
                )
            )
    return files


@router.get("", response_model=list[RepertoireRead])
def list_repertoire(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repertoire_items = db.query(Repertoire).order_by(Repertoire.id.asc()).all()
    return [
        RepertoireRead(
            id=item.id,
            title=item.title,
            youtube_link=item.youtube_link,
            folder_path=item.folder_path,
            state=item.state,
            files=_build_files(item.folder_path, item.id),
        )
        for item in repertoire_items
    ]


@router.post("", response_model=RepertoireRead)
def create_repertoire(
    payload: RepertoireCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    repertoire = Repertoire(**payload.model_dump(exclude={"id"}))
    db.add(repertoire)
    db.commit()
    db.refresh(repertoire)
    return repertoire


@router.get("/{repertoire_id}/files")
def list_repertoire_files(
    repertoire_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repertoire = db.query(Repertoire).filter(Repertoire.id == repertoire_id).first()
    if not repertoire:
        raise HTTPException(status_code=404, detail="Repertório não encontrado")
    return _build_files(repertoire.folder_path, repertoire.id)


@router.get("/{repertoire_id}/files/{filename}")
def download_repertoire_file(
    repertoire_id: int,
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repertoire = db.query(Repertoire).filter(Repertoire.id == repertoire_id).first()
    if not repertoire:
        raise HTTPException(status_code=404, detail="Repertório não encontrado")

    folder = _resolve_folder(repertoire.folder_path)
    if not folder:
        raise HTTPException(status_code=404, detail="Pasta do repertório não encontrada")

    file_path = (folder / filename).resolve()
    if folder not in file_path.parents or not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Ficheiro não encontrado")

    return FileResponse(path=file_path, filename=file_path.name, media_type="application/pdf")
