package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.Batch
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InquiryState(
    val isLoading: Boolean = false,
    val scannedBatch: Batch? = null,
    val error: String? = null
)

@HiltViewModel
class InquiryViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InquiryState())
    val uiState: StateFlow<InquiryState> = _uiState.asStateFlow()

    fun scanBarcode(barcode: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, scannedBatch = null) }
            
            val result = inventoryRepository.getBatchByBarcode(barcode)
            
            result.onSuccess { wrapper ->
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        scannedBatch = wrapper.data
                    )
                }
            }.onFailure { e ->
                _uiState.update { 
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Gagal memuat detail barang."
                    )
                }
            }
        }
    }

    fun dismissError() {
        _uiState.update { it.copy(error = null) }
    }
    
    fun resetScan() {
        _uiState.update { InquiryState() }
    }
}
