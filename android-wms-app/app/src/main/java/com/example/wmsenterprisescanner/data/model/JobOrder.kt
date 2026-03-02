package com.example.wmsenterprisescanner.data.model

data class JobOrder(
    val id: Int,
    val jo_number: String,
    val so_number: String?,
    val customer_name: String?,
    val status: String,
    val priority: Int,
    val assigned_to: String?,
    val requires_assembly: Boolean,
    val due_date: String?,
    val current_step: Int?,
    val total_steps: Int?,
    val total_ordered: Int,
    val total_completed: Int,
    val total_pending: Int,
    val progress_pct: Double,
    val lines: List<JOLineSummary> = emptyList()
)

data class JOLineSummary(
    val line_number: Int,
    val description: String?,
    val qty_ordered: Int,
    val qty_completed: Int,
    val qty_pending: Int,
    val progress_pct: Double
)

data class JODetail(
    val id: Int,
    val jo_number: String,
    val status: String,
    val priority: Int,
    val due_date: String?,
    val lines: List<JOLineDetail> = emptyList()
)

data class JOLineDetail(
    val id: Int,
    val line_number: Int,
    val description: String?,
    val cut_length: Double?,
    val qty_ordered: Int,
    val qty_completed: Int,
    val materials: List<JOMaterialDetail> = emptyList()
)

data class JOMaterialDetail(
    val id: Int,
    val batch_barcode: String?,
    val product_name: String?,
    val allocated_qty: Double,
    val consumed_qty: Double,
    val status: String
)

data class JOTrackingResponseWrapper(
    val status: String,
    val data: List<JobOrder>
)

data class JODetailResponseWrapper(
    val status: String,
    val data: JODetail
)

// --- Wizard Data Models ---
data class WizardData(
    val jo_number: String,
    val status: String,
    val current_step: Int,
    val total_steps: Int,
    val lines: List<WizardLine>
)

data class WizardLine(
    val id: Int,
    val line_number: Int,
    val description: String?,
    val target: WizardLineTarget,
    val progress: WizardLineProgress,
    val steps: List<WizardStep>
)

data class WizardLineTarget(
    val qty: Int,
    val cut_length: Double?,
    val total_length: Double
)

data class WizardLineProgress(
    val completed: Int,
    val pending: Int
)

data class WizardStep(
    val step_number: Int,
    val instruction: String,
    val action_type: String, // e.g., "SCAN_MATERIAL", "CUTTING"
    val material: WizardMaterial? = null
)

data class WizardMaterial(
    val material_id: Int,
    val product_name: String?,
    val target_qty: Double,
    val consumed_qty: Double,
    val barcode: String?
)

data class JOWizardResponseWrapper(
    val status: String,
    val data: WizardData
)

// --- API Request Models ---
data class MaterialScanConfirm(
    val material_id: Int,
    val scanned_barcode: String
)

data class MaterialCutComplete(
    val material_id: Int,
    val qty_consumed: Double
)

data class JOLineProgressRequest(
    val qty_completed: Int,
    val notes: String? = null
)
