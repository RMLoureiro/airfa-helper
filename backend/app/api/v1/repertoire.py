from pathlib import Path
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.repertoire import Repertoire
from app.models.user import User
from app.schemas.repertoire import RepertoireCreate, RepertoireFileRead, RepertoireRead

router = APIRouter(prefix="/repertoire", tags=["repertoire"])


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return sanitized or "partitura.pdf"


def _ensure_repertoire_folder(db: Session, repertoire: Repertoire) -> Path:
    base_dir = Path(settings.REPERTOIRE_FILES_DIR).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    folder_name = repertoire.folder_path or f"work-{repertoire.id}"
    folder_name = re.sub(r"[^a-zA-Z0-9._-]", "_", folder_name)
    if not folder_name:
        folder_name = f"work-{repertoire.id}"

    folder = (base_dir / folder_name).resolve()
    if base_dir not in folder.parents and folder != base_dir:
        raise HTTPException(status_code=400, detail="Pasta de repertório inválida")

    folder.mkdir(parents=True, exist_ok=True)

    if repertoire.folder_path != folder_name:
        repertoire.folder_path = folder_name
        db.add(repertoire)
        db.commit()
        db.refresh(repertoire)

    return folder


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


@router.post("/{repertoire_id}/files")
async def upload_repertoire_files(
    repertoire_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    repertoire = db.query(Repertoire).filter(Repertoire.id == repertoire_id).first()
    if not repertoire:
        raise HTTPException(status_code=404, detail="Repertório não encontrado")

    if not files:
        raise HTTPException(status_code=400, detail="Nenhum ficheiro recebido")

    folder = _ensure_repertoire_folder(db, repertoire)
    uploaded: list[str] = []

    for upload in files:
        filename = _sanitize_filename(upload.filename or "")
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Apenas ficheiros PDF são permitidos")

        destination = (folder / filename).resolve()
        if folder not in destination.parents:
            raise HTTPException(status_code=400, detail="Nome de ficheiro inválido")

        content = await upload.read()
        destination.write_bytes(content)
        uploaded.append(filename)

    return {"uploaded": uploaded, "folder_path": repertoire.folder_path}


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
