package com.example.wmsenterprisescanner.data.model

data class DeliveryOrder(
    val id: Int,
    val do_number: String,
    val so_id: Int,
    val recipient_name: String?,
    val delivery_address: String?,
    val status: String,
    val lines: List<DOLine> = emptyList()
)

data class DOLine(
    val id: Int,
    val do_id: Int,
    val so_line_id: Int,
    val product_id: Int,
    val description: String,
    val qty_shipped: Double
)

data class DOListResponseWrapper(
    val status: String,
    val data: List<DeliveryOrder>,
    val pagination: PaginationDetail? = null
)

data class PaginationDetail(
    val total: Int,
    val skip: Int,
    val limit: Int
)

data class DODetailResponseWrapper(
    val status: String,
    val data: DeliveryOrder
)

// The request payload to send exactly which items were physically scanned
data class DOPickItem(
    val product_id: Int,
    val batch_id: Int,
    val qty: Double
)

data class DOCompleteRequest(
    val picked_batches: List<DOPickItem>? = null
)
