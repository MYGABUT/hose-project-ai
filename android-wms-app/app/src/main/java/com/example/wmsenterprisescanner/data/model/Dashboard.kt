package com.example.wmsenterprisescanner.data.model

data class DashboardSummary(
    val total_batches: Int = 0,
    val total_products: Int = 0,
    val total_stock_value: Double = 0.0,
    val low_stock_count: Int = 0,
    val today_inbound: Int = 0,
    val today_outbound: Int = 0,
    val pending_transfers: Int = 0,
    val active_opname: Int = 0,
    val pending_qc: Int = 0,
    val outstanding_jo: Int = 0
)

data class DashboardSummaryResponse(
    val status: String,
    val data: DashboardSummary
)

data class RecentActivity(
    val id: Int,
    val type: String,        // INBOUND, OUTBOUND, TRANSFER, OPNAME, QC
    val description: String,
    val timestamp: String,
    val user: String?
)
