package com.example.wmsenterprisescanner.data.model

data class Location(
    val id: Int,
    val code: String,
    val zone: String?,
    val type: String?,        // SHELF, FLOOR, STAGING, etc.
    val capacity: Int?,
    val current_load: Int?,
    val is_active: Boolean = true
)

data class LocationListResponse(
    val status: String,
    val data: List<Location>
)

data class LocationBatch(
    val barcode: String,
    val product_sku: String?,
    val product_name: String?,
    val qty: Double,
    val status: String
)

data class BatchListResponse(
    val status: String,
    val total: Int?,
    val data: List<Batch>
)
