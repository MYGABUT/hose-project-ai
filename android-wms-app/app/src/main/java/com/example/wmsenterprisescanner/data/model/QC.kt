package com.example.wmsenterprisescanner.data.model

data class QCPendingItem(
    val id: Int,
    val jo_number: String,
    val product_name: String?,
    val qty_ordered: Double,
    val qty_completed: Double,
    val qty_pending: Double,
    val status: String
)

data class QCInspectionRequest(
    val jo_line_id: Int,
    val qty_passed: Double,
    val qty_failed: Double,
    val notes: String? = null,
    val inspected_by: String = "scanner_user"
)

data class QCPendingListResponseWrapper(
    val status: String,
    val data: List<QCPendingItem>
)

data class QCInspectResponseData(
    val batch_barcode: String?,
    val jo_status: String
)

data class QCInspectResponseWrapper(
    val status: String,
    val message: String,
    val data: QCInspectResponseData?
)
