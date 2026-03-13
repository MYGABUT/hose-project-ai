"""
WMS Enterprise - Database Enums
Centralized enum definitions for WMS
"""
import enum


class LocationType(str, enum.Enum):
    """Types of storage locations (Zone-based warehouse)"""
    # Hose Storage
    HOSE_RACK = "HOSE_RACK"           # Rak slang gulungan/coil
    HOSE_REEL = "HOSE_REEL"           # Reel besar (industrial hose)
    HOSE_CUT_BIN = "HOSE_CUT_BIN"     # Bin untuk potongan hose
    # Fitting & Adapter Storage
    FITTING_BIN = "FITTING_BIN"       # Rak bin kecil untuk fitting
    ADAPTER_SHELF = "ADAPTER_SHELF"   # Rak adapter & QRC
    # Operational Areas
    ASSEMBLY_BENCH = "ASSEMBLY_BENCH" # Meja kerja crimping/assembly
    STAGING_AREA = "STAGING_AREA"     # Area staging (DO pickup)
    RECEIVING = "RECEIVING"           # Area penerimaan barang
    # Return & Disposal
    RETURN_AREA = "RETURN_AREA"
    QC_AREA = "QC_AREA"              # Area inspeksi kualitas
    SCRAP = "SCRAP"


class ProductCategory(str, enum.Enum):
    """Product categories — Hydraulink Standard"""
    # Hoses
    HYDRAULIC_HOSE = "HYDRAULIC_HOSE"     # Braided, Multispiral (SAE 100R1-R17)
    INDUSTRIAL_HOSE = "INDUSTRIAL_HOSE"   # Air, Water, Suction, Chemical
    SPECIALTY_HOSE = "SPECIALTY_HOSE"     # Thermoplastic, PTFE/Teflon
    HOSE = "HOSE"                         # Legacy/generic (backward compat)
    # Fittings
    CRIMP_FITTING = "CRIMP_FITTING"       # One-piece / Two-piece swage
    REUSABLE_FITTING = "REUSABLE_FITTING" # Field attachable
    FITTING = "FITTING"                   # Legacy/generic
    # Connectors & Adapters
    ADAPTER = "ADAPTER"                   # BSP, JIC, ORFS, NPT
    QUICK_COUPLING = "QUICK_COUPLING"     # QRC, Push-to-connect
    CONNECTOR = "CONNECTOR"               # Legacy/generic
    # Assemblies & Accessories
    HOSE_ASSEMBLY = "HOSE_ASSEMBLY"       # Pre-crimped ready-to-use
    ASSEMBLY = "ASSEMBLY"                 # Legacy/generic
    ACCESSORY = "ACCESSORY"               # Clamps, spiraguard, o-rings, ferrules
    # Support Equipment
    VALVE = "VALVE"                       # Ball valves, check valves
    PIPE_TUBE = "PIPE_TUBE"              # Steel pipe, tube, tube clamps
    TOOL = "TOOL"                         # Saws, swagers, test equipment


class ProductUnit(str, enum.Enum):
    """Units of measurement"""
    METER = "METER"   # Slang per meter
    PCS = "PCS"       # Fitting, adapter, coupling
    SET = "SET"       # Assembly set
    ROLL = "ROLL"     # Gulungan (50m, 100m)
    BOX = "BOX"       # Dus (fitting bulk)
    KG = "KG"         # Berat (material besi)
    LITER = "LITER"   # Cairan (oli, lubricant)
    FEET = "FEET"     # Imperial measurement


class ProductForm(str, enum.Enum):
    """Physical form of the product for inventory input"""
    FULL_ROLL = "FULL_ROLL"       # Gulungan utuh (e.g., 50m, 100m)
    CUT_LENGTH = "CUT_LENGTH"     # Potongan sesuai pesanan
    COIL = "COIL"                 # Coil (smaller than roll)
    STRAIGHT = "STRAIGHT"         # Lurus (rigid pipe/tube)
    LOOSE = "LOOSE"               # Satuan lepas (fitting, adapter)
    BOXED = "BOXED"               # Dalam kemasan dus
    ASSEMBLED = "ASSEMBLED"       # Sudah di-crimping (hose assembly)


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
    PENDING_APPROVAL = "PENDING_APPROVAL"
    CONFIRMED = "CONFIRMED"
    BLANKET = "BLANKET"                     # Blanket Order — scheduled delivery
    PARTIAL_JO = "PARTIAL_JO"
    FULL_JO = "FULL_JO"
    PARTIAL_DELIVERED = "PARTIAL_DELIVERED"
    COMPLETED = "COMPLETED"
    INVOICED = "INVOICED"
    CANCELLED = "CANCELLED"


class BlanketReleaseStatus(str, enum.Enum):
    """Blanket Order release/call-off status"""
    PLANNED = "PLANNED"         # Dijadwalkan
    READY = "READY"             # Siap kirim
    RELEASED = "RELEASED"       # DO sudah dibuat
    DELIVERED = "DELIVERED"     # Sudah terkirim
    CANCELLED = "CANCELLED"


class JOStatus(str, enum.Enum):
    """Job Order status — Production Security State Machine"""
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"                    # Manager approved
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


class POStatus(str, enum.Enum):
    """Purchase Order status"""
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ORDERED = "ORDERED"
    PARTIAL_RECEIVED = "PARTIAL_RECEIVED"
    RECEIVED = "RECEIVED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


class DOStatus(str, enum.Enum):
    """Delivery Order status"""
    DRAFT = "DRAFT"
    READY_TO_SHIP = "READY_TO_SHIP"
    PARTIAL_SHIPPED = "PARTIAL_SHIPPED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class InvoiceStatus(str, enum.Enum):
    """Invoice status"""
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
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


class QCFailureReason(str, enum.Enum):
    """QC Failure reasons — ISO 9001 CAPA compliance"""
    WRONG_CRIMP = "WRONG_CRIMP"          # Salah tekanan crimp
    LEAK = "LEAK"                        # Kebocoran saat tes
    WRONG_DIMENSION = "WRONG_DIMENSION"  # Panjang/ukuran salah
    WRONG_FITTING = "WRONG_FITTING"      # Fitting tidak sesuai spec
    MATERIAL_DEFECT = "MATERIAL_DEFECT"  # Cacat bahan baku
    PRESSURE_FAIL = "PRESSURE_FAIL"      # Gagal tes tekanan
    VISUAL_DEFECT = "VISUAL_DEFECT"      # Cacat visual (kink, deformasi)
    OTHER = "OTHER"                      # Lainnya (wajib isi notes)
