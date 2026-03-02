package com.example.wmsenterprisescanner.data.model

data class StockOpname(
    val id: Int,
    val opname_number: String,
    val description: String,
    val status: String,
    val total_items: Int,
    val scanned_items: Int
)

data class OpnameResponseWrapper(
    val status: String,
    val data: StockOpname?
)

data class ScanOpnameRequest(
    val barcode: String,
    val qty: Float = 1.0f
)

data class ScanOpnameResponse(
    val status: String,
    val message: String
)

data class FinalizeResponse(
    val status: String,
    val message: String
)

// --- Phase 9: Items list & Mark Missing ---

data class OpnameItemBatchInfo(
    val barcode: String?,
    val product_name: String?,
    val location_code: String?
)

data class OpnameItem(
    val id: Int,
    val batch_id: Int?,
    val system_qty: Double,
    val actual_qty: Double?,
    val status: String,           // PENDING, FOUND, MISMATCH, MISSING
    val scanned_at: String?,
    val barcode: String?,         // from batch
    val name: String?,            // from batch.product.name
    val location: String?,        // from batch.location.code
    val brand: String?            // from batch.product.brand
)

data class OpnameItemsResponseWrapper(
    val status: String,
    val data: List<OpnameItem>
)

data class MarkMissingRequest(
    val item_id: Int
)
