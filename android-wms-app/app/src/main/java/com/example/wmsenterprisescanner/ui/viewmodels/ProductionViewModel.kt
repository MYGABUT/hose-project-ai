package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.JobOrder
import com.example.wmsenterprisescanner.data.model.JOLineProgressRequest
import com.example.wmsenterprisescanner.data.model.MaterialCutComplete
import com.example.wmsenterprisescanner.data.model.MaterialScanConfirm
import com.example.wmsenterprisescanner.data.model.WizardData
import com.example.wmsenterprisescanner.data.repository.ProductionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductionMenuState(
    val isLoading: Boolean = false,
    val jobOrders: List<JobOrder> = emptyList(),
    val error: String? = null
)

data class ProductionWizardState(
    val isLoading: Boolean = false,
    val wizardData: WizardData? = null,
    val activeLineId: Int? = null,
    val isScanSuccess: Boolean = false,
    val scanMessage: String? = null,
    val isCutSuccess: Boolean = false,
    val isSubmitSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProductionViewModel @Inject constructor(
    private val productionRepository: ProductionRepository
) : ViewModel() {

    // --- State Holders ---
    private val _menuState = MutableStateFlow(ProductionMenuState())
    val menuState: StateFlow<ProductionMenuState> = _menuState.asStateFlow()

    private val _wizardState = MutableStateFlow(ProductionWizardState())
    val wizardState: StateFlow<ProductionWizardState> = _wizardState.asStateFlow()

    // =============================
    // MENU OPERATIONS
    // =============================
    fun loadOutstandingJobOrders() {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null) }
            productionRepository.getOutstandingJOs().onSuccess { jos ->
                _menuState.update { it.copy(isLoading = false, jobOrders = jos) }
            }.onFailure { e ->
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    // =============================
    // WIZARD OPERATIONS
    // =============================
    fun loadWizard(joId: Int) {
        viewModelScope.launch {
            _wizardState.update { ProductionWizardState(isLoading = true) }
            productionRepository.getWizardSteps(joId).onSuccess { data ->
                val activeLine = data.lines.firstOrNull { l -> l.progress.completed < l.target.qty }?.id
                _wizardState.update { it.copy(isLoading = false, wizardData = data, activeLineId = activeLine) }
            }.onFailure { e ->
                _wizardState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun startJobOrder(joId: Int) {
         viewModelScope.launch {
             _wizardState.update { it.copy(isLoading = true, error = null) }
             productionRepository.startJobOrder(joId).onSuccess {
                 // Reload wizard after starting
                 loadWizard(joId)
             }.onFailure { e ->
                  _wizardState.update { it.copy(isLoading = false, error = e.message) }
             }
         }
    }

    fun scanMaterial(materialId: Int, barcode: String, joId: Int) {
        viewModelScope.launch {
            _wizardState.update { it.copy(isLoading = true, error = null, isScanSuccess = false, scanMessage = null) }
            val request = MaterialScanConfirm(material_id = materialId, scanned_barcode = barcode)
            
            productionRepository.scanJOMaterial(request).onSuccess {
                _wizardState.update { it.copy(isLoading = false, isScanSuccess = true, scanMessage = "Material verified!") }
                loadWizard(joId) // Refresh to advance step
            }.onFailure { e ->
                _wizardState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun completeCut(materialId: Int, qtyConsumed: Double, joId: Int) {
        viewModelScope.launch {
             _wizardState.update { it.copy(isLoading = true, error = null, isCutSuccess = false) }
             val request = MaterialCutComplete(material_id = materialId, qty_consumed = qtyConsumed)
             
             productionRepository.completeJOCut(request).onSuccess {
                 _wizardState.update { it.copy(isLoading = false, isCutSuccess = true) }
                 loadWizard(joId) // Refresh
             }.onFailure { e ->
                 _wizardState.update { it.copy(isLoading = false, error = e.message) }
             }
        }
    }

    fun updateLineProgress(joId: Int, lineId: Int, qtyCompleted: Int, notes: String?) {
        viewModelScope.launch {
             _wizardState.update { it.copy(isLoading = true, error = null) }
             val request = JOLineProgressRequest(qty_completed = qtyCompleted, notes = notes)
             
             productionRepository.updateJOLineProgress(joId, lineId, request).onSuccess {
                 loadWizard(joId)
             }.onFailure { e ->
                 _wizardState.update { it.copy(isLoading = false, error = e.message) }
             }
        }
    }

    fun completeJobOrder(joId: Int) {
        viewModelScope.launch {
            _wizardState.update { it.copy(isLoading = true, error = null) }
            productionRepository.completeJobOrder(joId).onSuccess {
                _wizardState.update { it.copy(isLoading = false, isSubmitSuccess = true) }
            }.onFailure { e ->
                 _wizardState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    // Dismiss flags
    fun dismissError() { _wizardState.update { it.copy(error = null) } }
    fun dismissScanSuccess() { _wizardState.update { it.copy(isScanSuccess = false, scanMessage = null) } }
    fun dismissCutSuccess() { _wizardState.update { it.copy(isCutSuccess = false) } }
}
