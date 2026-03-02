"""
HoseMaster WMS - Job Order Model
Production orders with material allocation and cutting wizard
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, Float, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import JOStatus, JOMaterialStatus, QCFailureReason


class JobOrder(Base):
    """
    Job Order (JO) - Perintah Kerja Produksi
    
    Dibuat dari SO, berisi instruksi potong & rakit.
    """
    __tablename__ = "job_orders"

    id = Column(Integer, primary_key=True, index=True)
    
    # JO Number (auto-generated)
    jo_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Parent SO (optional - could be internal JO)
    so_id = Column(Integer, ForeignKey("sales_orders.id"), index=True)
    
    # Status
    status = Column(
        String(50),
        default=JOStatus.DRAFT.value,
        nullable=False,
        index=True
    )
    
    # Priority (1=Urgent, 2=High, 3=Normal, 4=Low)
    priority = Column(Integer, default=3)
    
    # Assignment
    assigned_to = Column(String(100))  # Teknisi yang mengerjakan
    workstation = Column(String(50))   # Meja kerja
    
    # Production Security — Digital Signatures (who approved each stage)
    confirmed_by = Column(String(100))    # Manager who approved CONFIRMED
    started_by = Column(String(100))      # Head Prod who started IN_PROGRESS
    qc_inspector = Column(String(100))    # QC Inspector (must != assigned_to)
    
    # Dates
    start_date = Column(DateTime(timezone=True))
    due_date = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))  # Actual start
    completed_at = Column(DateTime(timezone=True))
    
    # Wizard state (untuk cutting wizard)
    current_step = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    
    # HPP (Harga Pokok Produksi) - Calculated when JO completes
    total_hpp = Column(Integer, default=0)  # Total cost of all materials
    
    # Notes
    notes = Column(Text)
    
    # Assembly flag — if False, JO skips cutting wizard → Ready for Delivery
    requires_assembly = Column(Boolean, default=True)
    
    # Tracking
    created_by = Column(String(50))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sales_order = relationship("SalesOrder", back_populates="job_orders")
    lines = relationship("JOLine", back_populates="job_order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JobOrder {self.jo_number}: {self.status}>"
    
    @property
    def progress_percent(self):
        if self.total_steps == 0:
            return 0
        return int((self.current_step / self.total_steps) * 100)
    
    def to_dict(self):
        return {
            "id": self.id,
            "jo_number": self.jo_number,
            "so_id": self.so_id,
            "so_number": self.sales_order.so_number if self.sales_order else None,
            "status": self.status if self.status else None,
            "priority": self.priority,
            "assigned_to": self.assigned_to,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "progress_percent": self.progress_percent,
            "total_hpp": self.total_hpp,
            "requires_assembly": self.requires_assembly,
            "notes": self.notes,
            "lines": [line.to_dict() for line in self.lines] if self.lines else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def to_dict_simple(self):
        return {
            "id": self.id,
            "so_id": self.so_id,
            "jo_number": self.jo_number,
            "so_number": self.sales_order.so_number if self.sales_order else None,
            "status": self.status if self.status else None,
            "priority": self.priority,
            "assigned_to": self.assigned_to,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "progress_percent": self.progress_percent,
            "requires_assembly": self.requires_assembly,
            "line_count": len(self.lines) if self.lines else 0,
        }


class JOLine(Base):
    """
    Job Order Line - Detail item yang harus diproduksi
    
    Setiap line = 1 jenis hose assembly dengan qty tertentu.
    """
    __tablename__ = "jo_lines"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent JO
    jo_id = Column(Integer, ForeignKey("job_orders.id"), index=True, nullable=False)
    
    # Link to SO Line (for traceability)
    so_line_id = Column(Integer, ForeignKey("so_lines.id"), index=True)
    
    # Product to produce (finished goods)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    
    # Line details
    line_number = Column(Integer, default=1)
    description = Column(String(500), nullable=False)
    
    # Specifications
    hose_type = Column(String(50))       # R1, R2, etc
    hose_size = Column(String(20))       # 1/2", 3/4", etc
    cut_length = Column(Float)           # Length per pcs (meter)
    fitting_a_code = Column(String(50))  # Fitting A code
    fitting_b_code = Column(String(50))  # Fitting B code
    
    # Quantity
    qty_ordered = Column(Integer, nullable=False, default=1)
    qty_completed = Column(Integer, default=0)
    
    # Total material needed
    total_hose_length = Column(Float)  # cut_length x qty_ordered
    
    # ====== PRODUCTION SECURITY — NAHAD/ISO Traceability ======
    serial_number = Column(String(50), unique=True, index=True)  # Unique SN per assembly
    crimped_by = Column(String(100))          # User ID of technician
    crimped_at = Column(DateTime(timezone=True))  # Exact timestamp
    machine_id = Column(String(50))           # Crimping machine asset ID
    pressure_test_bar = Column(Float)         # Test pressure (1.5x WP)
    test_duration_sec = Column(Integer)       # Duration in seconds
    qc_result = Column(String(20))            # PASS / FAIL
    qc_failure_reason = Column(String(50))    # QCFailureReason enum value
    qc_notes = Column(Text)                   # Mandatory if FAIL
    
    # Notes
    notes = Column(Text)
    
    # HPP (Harga Pokok Produksi) per line
    line_hpp = Column(Integer, default=0)  # Cost: hose + fitting_a + fitting_b + labor
    hose_cost = Column(Integer, default=0)  # Hose material cost
    fitting_a_cost = Column(Integer, default=0)  # Fitting A cost
    fitting_b_cost = Column(Integer, default=0)  # Fitting B cost
    labor_cost = Column(Integer, default=0)  # Crimp/assembly cost
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    job_order = relationship("JobOrder", back_populates="lines")
    so_line = relationship("SOLine", back_populates="jo_lines")
    product = relationship("Product")
    materials = relationship("JOMaterial", back_populates="jo_line", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JOLine {self.line_number}: {self.description} x{self.qty_ordered}>"
    
    @property
    def qty_pending(self):
        return self.qty_ordered - self.qty_completed
    
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "line_number": self.line_number,
            "description": self.description,
            "hose_type": self.hose_type,
            "hose_size": self.hose_size,
            "cut_length": self.cut_length,
            "fitting_a_code": self.fitting_a_code,
            "fitting_b_code": self.fitting_b_code,
            "qty_ordered": self.qty_ordered,
            "qty_completed": self.qty_completed,
            "qty_pending": self.qty_pending,
            "total_hose_length": self.total_hose_length,
            "line_hpp": self.line_hpp,
            "hose_cost": self.hose_cost,
            "fitting_a_cost": self.fitting_a_cost,
            "fitting_b_cost": self.fitting_b_cost,
            "labor_cost": self.labor_cost,
            "materials": [m.to_dict() for m in self.materials] if self.materials else [],
        }


class JOMaterial(Base):
    """
    JO Material Allocation - Roll yang dialokasikan untuk JO
    
    Best-Fit Algorithm akan mengisi tabel ini.
    Setiap row = 1 roll yang harus diambil teknisi.
    """
    __tablename__ = "jo_materials"

    id = Column(Integer, primary_key=True, index=True)
    
    # Parent JO Line
    jo_line_id = Column(Integer, ForeignKey("jo_lines.id"), index=True, nullable=False)
    
    # Batch/Roll yang dialokasikan
    batch_id = Column(Integer, ForeignKey("inventory_batches.id"), index=True, nullable=False)
    
    # Allocation details
    sequence_order = Column(Integer, default=1)  # Urutan ambil (1 = pertama)
    allocated_qty = Column(Float, nullable=False)  # Qty yang dialokasikan
    consumed_qty = Column(Float, default=0)        # Qty yang sudah dipakai
    
    # Status
    status = Column(
        String(50),
        default=JOMaterialStatus.ALLOCATED.value,
        nullable=False
    )
    
    # Timestamps
    allocated_at = Column(DateTime(timezone=True), server_default=func.now())
    picked_at = Column(DateTime(timezone=True))   # Saat diambil dari rak
    consumed_at = Column(DateTime(timezone=True))  # Saat dipotong
    
    # Relationships
    jo_line = relationship("JOLine", back_populates="materials")
    batch = relationship("InventoryBatch")
    
    def __repr__(self):
        return f"<JOMaterial #{self.sequence_order}: Batch {self.batch_id} -> {self.allocated_qty}m>"
    
    def to_dict(self):
        batch = self.batch
        return {
            "id": self.id,
            "sequence_order": self.sequence_order,
            "batch_id": self.batch_id,
            "batch_barcode": batch.barcode if batch else None,
            "batch_location": batch.location.code if batch and batch.location else None,
            "batch_current_qty": batch.current_qty if batch else None,
            "allocated_qty": self.allocated_qty,
            "consumed_qty": self.consumed_qty,
            "remaining": self.allocated_qty - self.consumed_qty,
            "status": self.status if self.status else None,
        }
