package com.example.wmsenterprisescanner.data.model

data class Product(
    val id: Int,
    val sku: String,
    val name: String,
    val brand: String,
    val category: String,
    val unit: String
)

data class ProductListResponse(
    val status: String,
    val total: Int,
    val data: List<Product>
)

data class BatchInboundRequest(
    val product_id: Int? = null,
    val product_sku: String? = null,

    // Brand & Specs
    val brand: String? = null,
    val standard: String? = null,
    val category: String? = null,
    val size_inch: String? = null,
    val size_dn: String? = null,
    val wire_type: String? = null,
    val working_pressure_bar: Double? = null,
    val working_pressure_psi: Double? = null,

    // Fitting/Adaptor Specs
    val thread_type: String? = null,
    val thread_size: String? = null,
    val seal_type: String? = null,
    val configuration: String? = null,

    // Cut Piece
    val is_cut_piece: Boolean? = false,
    val cut_length_cm: Double? = null,

    // Location & quantity
    val location_code: String?,
    val barcode: String? = null,
    val quantity: Double = 1.0,

    // Source tracking
    val source_type: String = "MANUAL",
    val notes: String? = null,
    val received_by: String = "android-app",

    // Legacy compat
    val specifications: Map<String, String>? = null
)

data class BatchInboundResponse(
    val status: String,
    val message: String,
    val transaction_id: String?
)

data class Batch(
    val id: Int,
    val barcode: String,
    val batch_number: String,
    val product_id: Int,
    val product_sku: String?,
    val product_name: String?,
    val current_qty: Double,
    val available_qty: Double,
    val initial_qty: Double?,
    val location: String?,
    val status: String,
    val received_date: String?
)

data class BatchDetailResponseWrapper(
    val status: String,
    val data: Batch
)
