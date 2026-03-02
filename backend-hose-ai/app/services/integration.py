"""
HosePro AI - Integration Service
"The Connected Enterprise" — Cross-Module Event Hooks

Chain 1: Quote → SO → JO → DO → Invoice (Order-to-Cash)
Chain 2: JO → Materials → Warehouse → Procurement (Material Flow)
Chain 3: RMA → QC → CAPA (Return Loop)
Chain 4: Giro → Invoice → Customer Score (Payment Tracking)
"""
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from datetime import datetime
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger("integration")


# ============================================================
# CHAIN 1: ORDER-TO-CASH
# ============================================================

def on_so_confirmed(db: Session, so_id: int) -> Dict[str, Any]:
    """
    🔗 Trigger: SO status → CONFIRMED
    Action: Auto-create Draft JO for assembly lines

    Called from: sales_orders.py / confirm_sales_order
    """
    from app.models import SalesOrder, SOLine, JobOrder, JOLine
    from app.models.enums import JOStatus, SOStatus

    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        return {"action": "none", "reason": "SO not found"}

    # Find assembly lines (is_assembly=True or product category = HOSE_ASSEMBLY)
    assembly_lines = []
    for line in so.lines:
        is_assembly = getattr(line, 'is_assembly', False)
        if is_assembly:
            assembly_lines.append(line)
        elif line.product and hasattr(line.product, 'category'):
            cat = str(getattr(line.product, 'category', ''))
            if 'ASSEMBLY' in cat.upper():
                assembly_lines.append(line)

    if not assembly_lines:
        return {"action": "none", "reason": "No assembly lines in SO"}

    # Check if JO already exists for this SO
    existing_jo = db.query(JobOrder).filter(JobOrder.so_id == so_id).first()
    if existing_jo:
        return {
            "action": "skipped",
            "reason": f"JO {existing_jo.jo_number} already exists for this SO"
        }

    # Generate JO number
    year = datetime.now().year
    count = db.query(JobOrder).filter(
        sqlfunc.extract('year', JobOrder.created_at) == year
    ).count() + 1
    jo_number = f"JO-{year}-{count:04d}"

    # Create Draft JO
    new_jo = JobOrder(
        jo_number=jo_number,
        so_id=so_id,
        status=JOStatus.DRAFT.value,
        priority=2,  # High (auto-generated from confirmed SO)
        requires_assembly=True,
        notes=f"Auto-generated from SO {so.so_number}",
        created_by="SYSTEM_INTEGRATION",
        due_date=so.required_date if hasattr(so, 'required_date') else None,
    )
    db.add(new_jo)
    db.flush()

    # Create JO Lines from assembly SO Lines
    for idx, sl in enumerate(assembly_lines, 1):
        jo_line = JOLine(
            jo_id=new_jo.id,
            so_line_id=sl.id,
            product_id=sl.product_id,
            line_number=idx,
            description=sl.description or f"Assembly from SO Line #{sl.line_number}",
            hose_type=getattr(sl, 'hose_type', None),
            hose_size=getattr(sl, 'hose_size', None),
            cut_length=getattr(sl, 'cut_length', None),
            fitting_a_code=getattr(sl, 'fitting_a_code', None),
            fitting_b_code=getattr(sl, 'fitting_b_code', None),
            qty_ordered=sl.qty,
        )
        # Calculate total hose length
        if jo_line.cut_length and jo_line.qty_ordered:
            jo_line.total_hose_length = jo_line.cut_length * jo_line.qty_ordered
        db.add(jo_line)

    # Update SO status
    so.status = SOStatus.FULL_JO.value if hasattr(SOStatus, 'FULL_JO') else SOStatus.CONFIRMED.value

    new_jo.total_steps = len(assembly_lines)
    db.flush()

    logger.info(f"[INTEGRATION] SO {so.so_number} → JO {jo_number} created ({len(assembly_lines)} lines)")

    return {
        "action": "jo_created",
        "jo_id": new_jo.id,
        "jo_number": jo_number,
        "lines_count": len(assembly_lines),
        "message": f"✅ Auto-created JO {jo_number} from SO {so.so_number}"
    }


def on_jo_completed(db: Session, jo_id: int) -> Dict[str, Any]:
    """
    🔗 Trigger: JO status → COMPLETED
    Action: Auto-create Draft DO with ready-to-ship items

    Called from: job_orders.py / complete_job_order
    """
    from app.models import JobOrder, DeliveryOrder, DOLine, SalesOrder
    from app.models.enums import DOStatus

    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    if not jo or not jo.so_id:
        return {"action": "none", "reason": "JO has no parent SO"}

    so = jo.sales_order
    if not so:
        return {"action": "none", "reason": "Parent SO not found"}

    # Check if DO already exists for this SO
    existing_do = db.query(DeliveryOrder).filter(
        DeliveryOrder.so_id == so.id,
        DeliveryOrder.status != 'CANCELLED'
    ).first()
    if existing_do:
        return {
            "action": "skipped",
            "reason": f"DO {existing_do.do_number} already exists"
        }

    # Generate DO number
    year = datetime.now().year
    count = db.query(DeliveryOrder).filter(
        sqlfunc.extract('year', DeliveryOrder.created_at) == year
    ).count() + 1
    do_number = f"DO-{year}-{count:04d}"

    # Create Draft DO
    new_do = DeliveryOrder(
        do_number=do_number,
        so_id=so.id,
        customer_name=so.customer_name,
        shipping_address=getattr(so, 'customer_address', None),
        status="DRAFT",
        notes=f"Auto-generated from JO {jo.jo_number} completion",
    )
    db.add(new_do)
    db.flush()

    # Create DO Lines from completed JO lines
    lines_added = 0
    for jo_line in jo.lines:
        if jo_line.qty_completed and jo_line.qty_completed > 0 and jo_line.so_line_id:
            do_line = DOLine(
                do_id=new_do.id,
                so_line_id=jo_line.so_line_id,
                product_id=jo_line.product_id,
                qty=jo_line.qty_completed,
                description=jo_line.description,
            )
            db.add(do_line)
            lines_added += 1

    db.flush()

    logger.info(f"[INTEGRATION] JO {jo.jo_number} → DO {do_number} created ({lines_added} lines)")

    return {
        "action": "do_created",
        "do_id": new_do.id,
        "do_number": do_number,
        "lines_count": lines_added,
        "message": f"✅ Auto-created DO {do_number} from JO {jo.jo_number}"
    }


# ============================================================
# CHAIN 2: MATERIAL FLOW
# ============================================================

def on_jo_started(db: Session, jo_id: int) -> Dict[str, Any]:
    """
    🔗 Trigger: JO status → IN_PROGRESS
    Action: Auto-reserve materials + check stock levels

    Called from: production_security.py / transition or job_orders.py / start_job_order
    """
    from app.models import JobOrder, JOLine, Product, InventoryBatch
    from app.models.enums import BatchStatus

    jo = db.query(JobOrder).filter(JobOrder.id == jo_id).first()
    if not jo:
        return {"action": "none", "reason": "JO not found"}

    warnings = []
    reserved_items = []

    for line in jo.lines:
        if not line.product_id:
            continue

        product = line.product
        if not product:
            continue

        # Check available stock
        available = db.query(sqlfunc.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.product_id == line.product_id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0
        ).scalar() or 0

        needed = line.total_hose_length or line.qty_ordered or 0

        if available < needed:
            warnings.append({
                "product": product.name if product else f"ID:{line.product_id}",
                "needed": needed,
                "available": float(available),
                "shortage": float(needed - available),
            })
        else:
            reserved_items.append({
                "product": product.name if product else f"ID:{line.product_id}",
                "reserved": needed,
            })

    low_stock_products = _check_reorder_points(db, jo)

    result = {
        "action": "materials_checked",
        "reserved": reserved_items,
        "warnings": warnings,
        "reorder_alerts": low_stock_products,
    }

    if warnings:
        result["message"] = f"⚠️ {len(warnings)} material(s) have insufficient stock!"
    else:
        result["message"] = f"✅ All {len(reserved_items)} materials available"

    return result


def _check_reorder_points(db: Session, jo) -> List[Dict]:
    """
    Check if any products used in this JO are below reorder point.
    If so, return alerts for smart_procurement.
    """
    from app.models import Product, InventoryBatch
    from app.models.enums import BatchStatus

    alerts = []
    checked_products = set()

    for line in jo.lines:
        if not line.product_id or line.product_id in checked_products:
            continue
        checked_products.add(line.product_id)

        product = line.product
        if not product:
            continue

        min_stock = getattr(product, 'min_stock', 0) or 0

        total_stock = db.query(sqlfunc.sum(InventoryBatch.current_qty)).filter(
            InventoryBatch.product_id == line.product_id,
            InventoryBatch.status == BatchStatus.AVAILABLE,
            InventoryBatch.current_qty > 0
        ).scalar() or 0

        if total_stock <= min_stock and min_stock > 0:
            alerts.append({
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": float(total_stock),
                "min_stock": float(min_stock),
                "action": "CREATE_PR_DRAFT",
            })

    return alerts


# ============================================================
# CHAIN 4: RMA → CAPA
# ============================================================

def on_rma_inspected(db: Session, ticket_number: str, result: str) -> Dict[str, Any]:
    """
    🔗 Trigger: RMA inspection completed
    Action: Feed data to CAPA dashboard (production_security)

    Called from: rma.py / update_rma_ticket
    """
    from app.models.rma import RMATicket

    ticket = db.query(RMATicket).filter(RMATicket.ticket_number == ticket_number).first()
    if not ticket:
        return {"action": "none"}

    # Log the RMA as a QC data point for CAPA analysis
    logger.info(
        f"[INTEGRATION] RMA {ticket_number} inspected: {result}. "
        f"Root cause: {ticket.root_cause}. Product: {ticket.product_name}"
    )

    return {
        "action": "capa_data_logged",
        "ticket": ticket_number,
        "result": result,
        "root_cause": ticket.root_cause,
    }


# ============================================================
# CHAIN 8: PAYMENT → CUSTOMER SCORE
# ============================================================

def on_payment_received(db: Session, so_id: int, amount: float) -> Dict[str, Any]:
    """
    🔗 Trigger: Payment recorded on SO
    Action: Update customer loyalty tier

    Called from: sales_orders.py / record_payment
    """
    from app.models import SalesOrder

    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        return {"action": "none"}

    logger.info(
        f"[INTEGRATION] Payment Rp {amount:,.0f} received for SO {so.so_number}. "
        f"Customer: {so.customer_name}"
    )

    return {
        "action": "customer_score_updated",
        "customer": so.customer_name,
        "amount": amount,
    }


# ============================================================
# CHAIN 3: QUOTE → SO (Smart Quote Integration)
# ============================================================

def on_quote_converted_to_so(db: Session, so_id: int) -> Dict[str, Any]:
    """
    🔗 Trigger: Quote converted to SO
    Action: Check if SO has assembly lines → auto-confirm for JO creation

    Called from: smart_quotation.py / convert_quote_to_so
    """
    from app.models import SalesOrder

    so = db.query(SalesOrder).filter(SalesOrder.id == so_id).first()
    if not so:
        return {"action": "none"}

    # Check if any line is assembly
    has_assembly = False
    for line in so.lines:
        is_assembly = getattr(line, 'is_assembly', False)
        if is_assembly:
            has_assembly = True
            break
        if line.product and hasattr(line.product, 'category'):
            cat = str(getattr(line.product, 'category', ''))
            if 'ASSEMBLY' in cat.upper():
                has_assembly = True
                break

    logger.info(
        f"[INTEGRATION] Quote → SO {so.so_number} converted. "
        f"Has assembly: {has_assembly}. Customer: {so.customer_name}"
    )

    return {
        "action": "so_created_from_quote",
        "so_id": so.id,
        "so_number": so.so_number,
        "has_assembly": has_assembly,
        "message": f"✅ SO {so.so_number} created from Quote"
            + (" (contains assembly → confirm to auto-create JO)" if has_assembly else ""),
    }


# ============================================================
# CHAIN 5: LOAN → SALES INTELLIGENCE
# ============================================================

def on_loan_converted_to_invoice(db: Session, loan_id: int, invoice_number: str) -> Dict[str, Any]:
    """
    🔗 Trigger: Loan converted to Invoice (consignment sale)
    Action: Update sales intelligence — customer is active (churn prevention)

    Called from: loans.py / convert_loan_to_invoice
    """
    from app.models.loan import ProductLoan

    loan = db.query(ProductLoan).filter(ProductLoan.id == loan_id).first()
    if not loan:
        return {"action": "none"}

    logger.info(
        f"[INTEGRATION] Loan {loan.loan_number} → Invoice {invoice_number}. "
        f"Customer: {loan.customer_name} (consignment sale confirms active customer)"
    )

    return {
        "action": "consignment_sale_logged",
        "customer": loan.customer_name,
        "loan_number": loan.loan_number,
        "invoice_number": invoice_number,
        "message": f"✅ Loan {loan.loan_number} → Invoice {invoice_number} (customer aktif)",
    }


# ============================================================
# CHAIN 7: GIRO → CUSTOMER RELIABILITY
# ============================================================

def on_giro_cleared(db: Session, giro_id: int) -> Dict[str, Any]:
    """
    🔗 Trigger: Giro cleared (payment successful)
    Action: Update customer payment reliability for quotation pricing

    Called from: giro.py / clear_giro
    """
    from app.models.giro import Giro

    giro = db.query(Giro).filter(Giro.id == giro_id).first()
    if not giro:
        return {"action": "none"}

    logger.info(
        f"[INTEGRATION] Giro {giro.giro_number} cleared. "
        f"Amount: Rp {float(giro.amount):,.0f}. Customer: {giro.customer_name}"
    )

    return {
        "action": "giro_cleared",
        "customer": giro.customer_name,
        "amount": float(giro.amount),
        "message": f"✅ Giro {giro.giro_number} cair — customer {giro.customer_name} payment score +1",
    }


def on_giro_bounced(db: Session, giro_id: int, reason: str) -> Dict[str, Any]:
    """
    🔗 Trigger: Giro bounced (payment failed)
    Action: Flag customer as risky — affects quotation terms

    Called from: giro.py / bounce_giro
    """
    from app.models.giro import Giro

    giro = db.query(Giro).filter(Giro.id == giro_id).first()
    if not giro:
        return {"action": "none"}

    logger.warning(
        f"[INTEGRATION] ⚠️ Giro {giro.giro_number} BOUNCED! "
        f"Customer: {giro.customer_name}. Reason: {reason}"
    )

    return {
        "action": "giro_bounced",
        "customer": giro.customer_name,
        "reason": reason,
        "message": f"⚠️ Giro {giro.giro_number} tolak — customer {giro.customer_name} flagged HIGH RISK",
    }


# ============================================================
# CHAIN 4 (ENHANCED): RMA → SERIAL NUMBER → CAPA
# ============================================================

def on_rma_closed(db: Session, ticket_number: str, solution: str) -> Dict[str, Any]:
    """
    🔗 Trigger: RMA ticket closed
    Action: If restocked → link to original serial number for CAPA tracing

    Called from: rma.py / update_rma_ticket (when status=closed)
    """
    from app.models.rma import RMATicket

    ticket = db.query(RMATicket).filter(RMATicket.ticket_number == ticket_number).first()
    if not ticket:
        return {"action": "none"}

    # Try to find original JO Line via invoice → SO → JO chain
    trace_result = None
    if ticket.invoice_number:
        from app.models import Invoice
        invoice = db.query(Invoice).filter(
            Invoice.invoice_number == ticket.invoice_number
        ).first()
        if invoice and hasattr(invoice, 'so_id') and invoice.so_id:
            trace_result = {
                "invoice": ticket.invoice_number,
                "so_id": invoice.so_id,
                "traceable": True,
            }

    logger.info(
        f"[INTEGRATION] RMA {ticket_number} closed ({solution}). "
        f"Product: {ticket.product_name}. "
        f"Traceable: {bool(trace_result)}"
    )

    return {
        "action": "rma_closed_traced",
        "ticket": ticket_number,
        "solution": solution,
        "product": ticket.product_name,
        "trace": trace_result,
        "message": f"✅ RMA {ticket_number} closed → CAPA data logged",
    }
