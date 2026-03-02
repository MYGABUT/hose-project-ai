package com.example.wmsenterprisescanner.data.model

data class WarehouseTransfer(
    val id: Int,
    val transfer_number: String,
    val from_location_id: Int,
    val from_location_name: String,
    val to_location_id: Int,
    val to_location_name: String,
    val status: String,
    val request_date: String,
    val shipped_date: String?,
    val received_date: String?,
    val requested_by: String,
    val items: List<TransferItem> = emptyList() // Populated only in detail view
)

data class TransferItem(
    val id: Int,
    val product_id: Int,
    val product_sku: String,
    val product_name: String,
    val qty_requested: Double,
    val qty_shipped: Double,
    val qty_received: Double,
    val unit: String,
    val line_status: String
)

data class TransferListResponseWrapper(
    val status: String,
    val data: List<WarehouseTransfer>
)

data class TransferDetailResponseWrapper(
    val status: String,
    val data: WarehouseTransfer
)

data class TransferPickItem(
    val product_id: Int,
    val batch_id: Int,
    val qty: Double
)

data class TransferShipRequest(
    val shipped_by: String,
    val picked_batches: List<TransferPickItem>
)

data class TransferReceiveItem(
    val id: Int, // Refers to TransferItem ID
    val qty_received: Double
)

data class TransferReceiveRequest(
    val received_by: String,
    val items_received: List<TransferReceiveItem>
)
