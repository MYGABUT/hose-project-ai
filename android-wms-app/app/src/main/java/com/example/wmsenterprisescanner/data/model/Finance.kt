package com.example.wmsenterprisescanner.data.model

// ============ Invoice Models ============
data class Invoice(
    val id: Int,
    val invoice_number: String,
    val so_number: String?,
    val customer_name: String?,
    val invoice_date: String?,
    val due_date: String?,
    val status: String?,         // DRAFT, SENT, PAID
    val payment_status: String?, // UNPAID, PARTIAL, PAID
    val subtotal: Double?,
    val tax_amount: Double?,
    val total: Double?,
    val amount_paid: Double?,
    val amount_due: Double?,
    val created_by: String?
)

data class InvoiceListResponse(
    val status: String,
    val data: List<Invoice>
)

data class InvoiceSummary(
    val total_invoices: Int = 0,
    val total_outstanding: Double = 0.0,
    val overdue_amount: Double = 0.0,
    val overdue_count: Int = 0,
    val total_paid: Double = 0.0
)

data class InvoiceSummaryResponse(
    val status: String,
    val data: InvoiceSummary
)

// ============ RMA Models ============
data class RMATicket(
    val id: Int?,
    val ticket_number: String,
    val customer_name: String?,
    val invoice_number: String?,
    val product_name: String?,
    val qty: Int?,
    val status: String?,         // NEW, INSPECTED, APPROVED, CLOSED
    val root_cause: String?,
    val supplier_name: String?,
    val solution: String?,
    val created_at: String?
)

data class RMAListResponse(
    val status: String,
    val data: List<RMATicket>
)
