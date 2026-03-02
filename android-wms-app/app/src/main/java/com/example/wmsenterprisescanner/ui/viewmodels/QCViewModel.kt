package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.QCInspectionRequest
import com.example.wmsenterprisescanner.data.model.QCPendingItem
import com.example.wmsenterprisescanner.data.repository.QCRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class QCMenuState(
    val isLoading: Boolean = false,
    val pendingItems: List<QCPendingItem> = emptyList(),
    val error: String? = null
)

data class QCInspectState(
    val isLoading: Boolean = false,
    val selectedItem: QCPendingItem? = null,
    val isSubmitSuccess: Boolean = false,
    val successMessage: String? = null,
    val generatedBatchBarcode: String? = null,
    val error: String? = null
)

@HiltViewModel
class QCViewModel @Inject constructor(
    private val qcRepository: QCRepository
) : ViewModel() {

    // --- State Holders ---
    private val _menuState = MutableStateFlow(QCMenuState())
    val menuState: StateFlow<QCMenuState> = _menuState.asStateFlow()

    private val _inspectState = MutableStateFlow(QCInspectState())
    val inspectState: StateFlow<QCInspectState> = _inspectState.asStateFlow()

    // =============================
    // MENU OPERATIONS
    // =============================
    fun loadPendingItems() {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null) }
            qcRepository.getPendingQCItems().onSuccess { items ->
                _menuState.update { it.copy(isLoading = false, pendingItems = items) }
            }.onFailure { e ->
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    // =============================
    // INSPECTION OPERATIONS
    // =============================
    fun selectItemForInspection(lineId: Int) {
        val item = _menuState.value.pendingItems.find { it.id == lineId }
        _inspectState.update { 
            QCInspectState(selectedItem = item)
        }
    }

    fun submitInspection(qtyPassed: Double, qtyFailed: Double, notes: String?) {
        val state = _inspectState.value
        val item = state.selectedItem ?: return
        
        if (qtyPassed + qtyFailed <= 0) {
             _inspectState.update { it.copy(error = "Total kuantitas (Lolos + Gagal) harus lebih dari 0.") }
             return
        }
        
        if (qtyPassed + qtyFailed > item.qty_pending) {
            // Note: in a real strict system we might block this, but assuming qty_pending represents what's ready for QC
            _inspectState.update { it.copy(error = "Total inspeksi melebihi kuantitas yang menunggu QC (${item.qty_pending}).") }
            return
        }

        viewModelScope.launch {
            _inspectState.update { it.copy(isLoading = true, error = null) }
            
            val request = QCInspectionRequest(
                jo_line_id = item.id,
                qty_passed = qtyPassed,
                qty_failed = qtyFailed,
                notes = notes,
                inspected_by = "scanner_user" // TODO: Fetch from actual auth
            )
            
            qcRepository.submitQCInspection(request).onSuccess { data ->
                val successMsg = "Inspeksi berhasil direkam. " + (data?.batch_barcode?.let { "\nBarcode FG: $it" } ?: "")
                _inspectState.update { 
                    it.copy(
                        isLoading = false, 
                        isSubmitSuccess = true,
                        successMessage = successMsg,
                        generatedBatchBarcode = data?.batch_barcode
                    ) 
                }
            }.onFailure { e ->
                _inspectState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun dismissInspectError() { _inspectState.update { it.copy(error = null) } }
}
