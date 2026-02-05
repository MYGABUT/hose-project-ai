"""
WMS Enterprise - Database Enums
Centralized enum definitions for WMS
"""
import enum


class LocationType(str, enum.Enum):
    """Types of storage locations"""
    HOSE_RACK = "HOSE_RACK"
    FITTING_BIN = "FITTING_BIN"
    STAGING_AREA = "STAGING_AREA"
    RETURN_AREA = "RETURN_AREA"
    SCRAP = "SCRAP"
    RECEIVING = "RECEIVING"


class ProductCategory(str, enum.Enum):
    """Product categories"""
    HOSE = "HOSE"
    FITTING = "FITTING"
    ASSEMBLY = "ASSEMBLY"
    ACCESSORY = "ACCESSORY"
    CONNECTOR = "CONNECTOR"
    ADAPTER = "ADAPTER"


class ProductUnit(str, enum.Enum):
    """Units of measurement"""
    METER = "METER"
    PCS = "PCS"
    SET = "SET"
    ROLL = "ROLL"


class AliasType(str, enum.Enum):
    """Types of product aliases/codes"""
    INTERNAL = "INTERNAL"
    MANUFACTURER = "MANUFACTURER"
    BARCODE = "BARCODE"
    AI_SCAN = "AI_SCAN"
    CUSTOMER = "CUSTOMER"


class BatchStatus(str, enum.Enum):
    """Inventory batch status"""
    AVAILABLE = "AVAILABLE"
    RESERVED_JO = "RESERVED_JO"
    RESERVED_SO = "RESERVED_SO"
    QC_PENDING = "QC_PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    DAMAGED = "DAMAGED"
    SOLD = "SOLD"
    CONSUMED = "CONSUMED"
    BLOCKED_RETURN = "BLOCKED_RETURN"
    LOANED = "LOANED"
    SCRAPPED = "SCRAPPED"


class MovementType(str, enum.Enum):
    """Types of inventory movements"""
    INBOUND = "INBOUND"
    OUTBOUND = "OUTBOUND"
    TRANSFER = "TRANSFER"
    RESERVE = "RESERVE"
    UNRESERVE = "UNRESERVE"
    CONSUME = "CONSUME"
    ADJUST_PLUS = "ADJUST_PLUS"
    ADJUST_MINUS = "ADJUST_MINUS"
    RETURN_IN = "RETURN_IN"
    RETURN_OUT = "RETURN_OUT"
    ASSEMBLY_USE = "ASSEMBLY_USE"
    ASSEMBLY_RESULT = "ASSEMBLY_RESULT"
    SWAP_IN = "SWAP_IN"
    SWAP_OUT = "SWAP_OUT"
    LOAN_OUT = "LOAN_OUT"
    LOAN_RETURN = "LOAN_RETURN"
    SCRAP = "SCRAP"


class SOStatus(str, enum.Enum):
    """Sales Order status"""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIAL_JO = "PARTIAL_JO"
    FULL_JO = "FULL_JO"
    PARTIAL_DELIVERED = "PARTIAL_DELIVERED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class JOStatus(str, enum.Enum):
    """Job Order status"""
    DRAFT = "DRAFT"
    MATERIALS_RESERVED = "MATERIALS_RESERVED"
    IN_PROGRESS = "IN_PROGRESS"
    QC_PENDING = "QC_PENDING"
    QC_PASSED = "QC_PASSED"
    QC_FAILED = "QC_FAILED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class JOMaterialStatus(str, enum.Enum):
    """JO Material allocation status"""
    ALLOCATED = "ALLOCATED"      # Roll sudah dialokasikan
    PICKED = "PICKED"            # Roll sudah diambil dari rak
    CUTTING = "CUTTING"          # Sedang dipotong
    CONSUMED = "CONSUMED"        # Sudah habis dipotong
    RETURNED = "RETURNED"        # Sisa dikembalikan ke rak


class DOStatus(str, enum.Enum):
    """Delivery Order status"""
    DRAFT = "DRAFT"
    READY_TO_SHIP = "READY_TO_SHIP"
    PARTIAL_SHIPPED = "PARTIAL_SHIPPED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class ReturnStatus(str, enum.Enum):
    """Return status"""
    PENDING = "PENDING"
    INSPECTION = "INSPECTION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class QCResult(str, enum.Enum):
    """Quality Control result"""
    PENDING = "PENDING"
    GOOD = "GOOD"
    DAMAGED = "DAMAGED"
    SCRAP = "SCRAP"
