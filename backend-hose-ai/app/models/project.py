from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="NEW") # NEW, IN_PROGRESS, COMPLETED, CANCELLED
    start_date = Column(Date)
    end_date = Column(Date)
    total_value = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="projects")
    work_orders = relationship("WorkOrder", back_populates="project", cascade="all, delete-orphan")
    sppds = relationship("SPPD", back_populates="project", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="project", cascade="all, delete-orphan")
    commissioning = relationship("Commissioning", back_populates="project", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.name if self.customer else None,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "total_value": float(self.total_value or 0),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    technician_name = Column(String(100), nullable=False)
    task_name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default="OPEN") # OPEN, IN_PROGRESS, COMPLETED, ON_HOLD
    priority = Column(String(20), default="NORMAL") # LOW, NORMAL, HIGH, URGENT
    scheduled_date = Column(Date)
    completion_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="work_orders")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "technician_name": self.technician_name,
            "task_name": self.task_name,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SPPD(Base):
    __tablename__ = "project_sppd"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    technician_name = Column(String(100), nullable=False)
    destination = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    transport_cost = Column(Numeric(15, 2), default=0)
    accommodation_cost = Column(Numeric(15, 2), default=0)
    meal_allowance = Column(Numeric(15, 2), default=0)
    other_cost = Column(Numeric(15, 2), default=0)
    total_cost = Column(Numeric(15, 2), default=0)
    status = Column(String(50), default="DRAFT") # DRAFT, APPROVED, REIMBURSED
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="sppds")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "technician_name": self.technician_name,
            "destination": self.destination,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "transport_cost": float(self.transport_cost or 0),
            "accommodation_cost": float(self.accommodation_cost or 0),
            "meal_allowance": float(self.meal_allowance or 0),
            "other_cost": float(self.other_cost or 0),
            "total_cost": float(self.total_cost or 0),
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class DailyReport(Base):
    __tablename__ = "project_daily_reports"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    report_date = Column(Date, nullable=False)
    technician_name = Column(String(100), nullable=False)
    activity_description = Column(Text, nullable=False)
    challenges = Column(Text)
    materials_used = Column(Text)
    progress_percentage = Column(Integer)
    image_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="daily_reports")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "technician_name": self.technician_name,
            "activity_description": self.activity_description,
            "challenges": self.challenges,
            "materials_used": self.materials_used,
            "progress_percentage": self.progress_percentage,
            "image_path": self.image_path,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Commissioning(Base):
    __tablename__ = "project_commissioning"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    document_number = Column(String(100))
    client_evaluator = Column(String(100))
    evaluation_date = Column(Date)
    status = Column(String(50), default="PENDING") # PENDING, APPROVED, REJECTED
    notes = Column(Text)
    signature_image_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="commissioning")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "document_number": self.document_number,
            "client_evaluator": self.client_evaluator,
            "evaluation_date": self.evaluation_date.isoformat() if self.evaluation_date else None,
            "status": self.status,
            "notes": self.notes,
            "signature_image_path": self.signature_image_path,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
