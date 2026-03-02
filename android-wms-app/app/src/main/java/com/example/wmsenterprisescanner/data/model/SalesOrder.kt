package com.example.wmsenterprisescanner.data.model

// ============ Sales Order Models ============
data class SalesOrder(
    val id: Int,
    val so_number: String,
    val customer_name: String,
    val customer_phone: String?,
    val status: String,        // DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
    val order_date: String?,
    val required_date: String?,
    val total_amount: Double?,
    val salesman_name: String?,
    val notes: String?,
    val lines: List<SOLine> = emptyList()
)

data class SOLine(
    val id: Int,
    val product_id: Int?,
    val description: String,
    val qty: Int,
    val unit_price: Double,
    val total_price: Double?,
    val is_assembly: Boolean?,
    val notes: String?
)

data class SOListResponse(
    val status: String,
    val total: Int?,
    val data: List<SalesOrder>
)

data class SODetailResponse(
    val status: String,
    val data: SalesOrder
)

// ============ Purchase Request Models ============
data class PurchaseRequest(
    val id: Int,
    val pr_number: String,
    val supplier_name: String?,
    val status: String,        // DRAFT, PENDING, APPROVED, REJECTED, ORDERED, RECEIVED
    val priority: String?,     // LOW, NORMAL, HIGH, URGENT
    val requested_by: String?,
    val request_date: String?,
    val required_date: String?,
    val total_estimated: Double?,
    val notes: String?,
    val lines: List<PRLine> = emptyList()
)

data class PRLine(
    val id: Int,
    val product_name: String,
    val product_sku: String?,
    val qty_requested: Double,
    val unit: String?,
    val estimated_price: Double,
    val reason: String?
)

data class PRListResponse(
    val status: String,
    val data: List<PurchaseRequest>
)

data class PRDetailResponse(
    val status: String,
    val data: PurchaseRequest
)
