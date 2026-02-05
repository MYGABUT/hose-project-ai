"""
HoseMaster WMS - Period Lock Model
Prevent backdate transactions after period close
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class PeriodLock(Base):
    """
    Period Lock - Tutup Buku Bulanan
    
    When a period is locked:
    - No new transactions can be created with dates in that period
    - No existing transactions can be modified
    - Reports for that period are finalized
    """
    __tablename__ = "period_locks"

    id = Column(Integer, primary_key=True, index=True)
    
    # Period
    year = Column(Integer, nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True)  # 1-12
    
    # Lock status
    is_locked = Column(Boolean, default=False)
    
    # Lock info
    locked_at = Column(DateTime(timezone=True))
    locked_by = Column(String(100))
    lock_reason = Column(String(255))
    
    # Unlock info (for emergency unlock)
    unlocked_at = Column(DateTime(timezone=True))
    unlocked_by = Column(String(100))
    unlock_reason = Column(String(255))
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        status = "LOCKED" if self.is_locked else "OPEN"
        return f"<Period {self.year}-{self.month:02d} {status}>"
    
    @property
    def period_str(self):
        return f"{self.year}-{self.month:02d}"
    
    def to_dict(self):
        return {
            "id": self.id,
            "year": self.year,
            "month": self.month,
            "period": self.period_str,
            "is_locked": self.is_locked,
            "locked_at": self.locked_at.isoformat() if self.locked_at else None,
            "locked_by": self.locked_by,
            "lock_reason": self.lock_reason,
            "unlocked_at": self.unlocked_at.isoformat() if self.unlocked_at else None,
            "unlocked_by": self.unlocked_by
        }


def is_period_locked(db, year: int, month: int) -> bool:
    """Check if a period is locked"""
    lock = db.query(PeriodLock).filter(
        PeriodLock.year == year,
        PeriodLock.month == month
    ).first()
    return lock.is_locked if lock else False


def check_transaction_allowed(db, transaction_date) -> tuple:
    """
    Check if transaction is allowed for given date.
    Returns (allowed: bool, message: str)
    """
    if not transaction_date:
        return True, "OK"
    
    year = transaction_date.year
    month = transaction_date.month
    
    if is_period_locked(db, year, month):
        return False, f"Periode {year}-{month:02d} sudah ditutup. Transaksi tidak dapat dibuat atau diubah."
    
    return True, "OK"
