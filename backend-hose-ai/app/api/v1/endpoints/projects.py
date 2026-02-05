from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import date

from app.core.database import get_db
from app.models.project import Project, WorkOrder, SPPD, DailyReport, Commissioning
from app.models.customer import Customer
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["Projects"])

# --- Pydantic Schemas ---
class ProjectCreate(BaseModel):
    customer_id: int
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_value: Optional[float] = 0

class WorkOrderCreate(BaseModel):
    technician_name: str
    task_name: str
    description: Optional[str] = None
    priority: Optional[str] = "NORMAL"
    scheduled_date: Optional[date] = None

class SPPDCreate(BaseModel):
    technician_name: str
    destination: str
    start_date: date
    end_date: date
    meal_allowance: Optional[float] = 0
    transport_cost: Optional[float] = 0
    accommodation_cost: Optional[float] = 0
    other_cost: Optional[float] = 0

class DailyReportCreate(BaseModel):
    report_date: date
    technician_name: str
    activity_description: str
    challenges: Optional[str] = None
    materials_used: Optional[str] = None
    progress_percentage: Optional[int] = 0

class CommissioningCreate(BaseModel):
    document_number: Optional[str] = None
    client_evaluator: Optional[str] = None
    evaluation_date: Optional[date] = None
    status: Optional[str] = "PENDING"
    notes: Optional[str] = None

# --- Project Base Endpoints ---

@router.get("/", response_model=dict)
def get_projects(skip: int = 0, limit: int = 100, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status)
    projects = query.order_by(desc(Project.created_at)).offset(skip).limit(limit).all()
    return {"status": "success", "data": [p.to_dict() for p in projects]}

@router.post("/", response_model=dict)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == project.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    new_project = Project(**project.dict())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return {"status": "success", "data": new_project.to_dict()}

@router.get("/{id}", response_model=dict)
def get_project_detail(id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    data = project.to_dict()
    # Eager load children for simple detail view, or fetch separately if list is huge
    data['work_orders'] = [wo.to_dict() for wo in project.work_orders]
    data['sppd'] = [s.to_dict() for s in project.sppds]
    data['daily_reports'] = [r.to_dict() for r in project.daily_reports]
    data['commissioning'] = project.commissioning.to_dict() if project.commissioning else None
    
    return {"status": "success", "data": data}

@router.put("/{id}/status", response_model=dict)
def update_project_status(id: int, status_update: str = Body(..., embed=True), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project.status = status_update
    db.commit()
    return {"status": "success", "message": f"Project status updated to {status_update}"}

# --- Sub-Module Endpoints (WO, SPPD, Reports) ---

# 1. Work Orders
@router.post("/{id}/work-orders", response_model=dict)
def create_work_order(id: int, wo: WorkOrderCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_wo = WorkOrder(project_id=id, **wo.dict())
    db.add(new_wo)
    db.commit()
    return {"status": "success", "data": new_wo.to_dict()}

@router.put("/work-orders/{wo_id}/status", response_model=dict)
def update_wo_status(wo_id: int, status: str = Body(..., embed=True), db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
    wo.status = status
    if status == 'COMPLETED':
        wo.completion_date = date.today()
    db.commit()
    return {"status": "success", "data": wo.to_dict()}

# 2. SPPD
@router.post("/{id}/sppd", response_model=dict)
def create_sppd(id: int, sppd: SPPDCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    total = (sppd.meal_allowance or 0) + (sppd.transport_cost or 0) + (sppd.accommodation_cost or 0) + (sppd.other_cost or 0)
    new_sppd = SPPD(project_id=id, total_cost=total, **sppd.dict())
    db.add(new_sppd)
    db.commit()
    return {"status": "success", "data": new_sppd.to_dict()}

# 3. Daily Reports
@router.post("/{id}/daily-reports", response_model=dict)
def create_daily_report(id: int, report: DailyReportCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_report = DailyReport(project_id=id, **report.dict())
    db.add(new_report)
    db.commit()
    return {"status": "success", "data": new_report.to_dict()}

# 4. Commissioning
@router.post("/{id}/commissioning", response_model=dict)
def create_or_update_commissioning(id: int, com: CommissioningCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    existing = db.query(Commissioning).filter(Commissioning.project_id == id).first()
    if existing:
        # Update
        for key, value in com.dict(exclude_unset=True).items():
            setattr(existing, key, value)
        db_obj = existing
    else:
        # Create
        new_com = Commissioning(project_id=id, **com.dict())
        db.add(new_com)
        db_obj = new_com
    
    db.commit()
    db.refresh(db_obj)
    return {"status": "success", "data": db_obj.to_dict()}
