from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps.auth import get_current_user, get_db, require_roles
from app.models.enums import SystemRole
from app.models.instrument import Instrument
from app.models.instrument_report import InstrumentReport
from app.models.user import User
from app.schemas.instrument import InstrumentCreate, InstrumentRead, InstrumentUpdate
from app.schemas.instrument_report import InstrumentReportCreate, InstrumentReportRead

router = APIRouter(prefix="/instruments", tags=["instruments"])


@router.get("", response_model=list[InstrumentRead])
def list_instruments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.system_role in {SystemRole.ADMIN, SystemRole.SUPER_ADMIN}:
        return db.query(Instrument).order_by(Instrument.id.asc()).all()
    return db.query(Instrument).filter(Instrument.user_id == current_user.id).order_by(Instrument.id.asc()).all()


@router.post("", response_model=InstrumentRead, status_code=201)
def create_instrument(
    payload: InstrumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    instrument = Instrument(**payload.model_dump())
    db.add(instrument)
    db.commit()
    db.refresh(instrument)
    return instrument


@router.put("/{instrument_id}", response_model=InstrumentRead)
def update_instrument(
    instrument_id: int,
    payload: InstrumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrumento não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(instrument, field, value)
    db.commit()
    db.refresh(instrument)
    return instrument


@router.delete("/{instrument_id}", status_code=204)
def delete_instrument(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrumento não encontrado")
    db.delete(instrument)
    db.commit()


@router.post("/{instrument_id}/assign")
def assign_instrument(
    instrument_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrumento não encontrado")

    member = db.query(User).filter(User.id == user_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado")

    instrument.user_id = user_id
    db.commit()
    db.refresh(instrument)
    return {"id": instrument.id, "user_id": instrument.user_id}


@router.get("/reports", response_model=list[InstrumentReportRead])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)),
):
    return db.query(InstrumentReport).order_by(InstrumentReport.created_at.desc()).all()


@router.post("/{instrument_id}/reports", response_model=InstrumentReportRead)
def create_report(
    instrument_id: int,
    payload: InstrumentReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    instrument = db.query(Instrument).filter(Instrument.id == instrument_id).first()
    if not instrument:
        raise HTTPException(status_code=404, detail="Instrumento não encontrado")

    # Regular members can only report instruments assigned to them.
    if current_user.system_role not in {SystemRole.ADMIN, SystemRole.SUPER_ADMIN}:
        if instrument.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sem permissões para reportar este instrumento")

    report = InstrumentReport(
        instrument_id=instrument_id,
        user_id=current_user.id,
        report_type=payload.report_type,
        severity=payload.severity,
        description=payload.description,
        addressed=False,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
