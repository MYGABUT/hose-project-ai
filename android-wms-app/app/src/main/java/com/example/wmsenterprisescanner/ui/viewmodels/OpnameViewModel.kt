package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.OpnameItem
import com.example.wmsenterprisescanner.data.model.ScanOpnameResponse
import com.example.wmsenterprisescanner.data.model.StockOpname
import com.example.wmsenterprisescanner.data.repository.OpnameRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class SessionState {
    object Idle : SessionState()
    object Loading : SessionState()
    data class Success(val opname: StockOpname?) : SessionState()
    data class Error(val message: String) : SessionState()
}

sealed class ScanActionState {
    object Idle : ScanActionState()
    object Processing : ScanActionState()
    data class Success(val response: ScanOpnameResponse) : ScanActionState()
    data class Error(val message: String) : ScanActionState()
}

sealed class FinalizeState {
    object Idle : FinalizeState()
    object Processing : FinalizeState()
    object Success : FinalizeState()
    data class Error(val message: String) : FinalizeState()
}

data class OpnameItemsState(
    val isLoading: Boolean = false,
    val items: List<OpnameItem> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class OpnameViewModel @Inject constructor(
    private val repository: OpnameRepository
) : ViewModel() {

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Idle)
    val sessionState: StateFlow<SessionState> = _sessionState

    private val _scanState = MutableStateFlow<ScanActionState>(ScanActionState.Idle)
    val scanState: StateFlow<ScanActionState> = _scanState

    private val _finalizeState = MutableStateFlow<FinalizeState>(FinalizeState.Idle)
    val finalizeState: StateFlow<FinalizeState> = _finalizeState

    private val _itemsState = MutableStateFlow(OpnameItemsState())
    val itemsState: StateFlow<OpnameItemsState> = _itemsState

    fun checkCurrentSession() {
        viewModelScope.launch {
            _sessionState.value = SessionState.Loading
            val result = repository.getCurrentOpname()
            if (result.isSuccess) {
                _sessionState.value = SessionState.Success(result.getOrNull()?.data)
            } else {
                _sessionState.value = SessionState.Error(result.exceptionOrNull()?.message ?: "Gagal memuat sesi opname")
            }
        }
    }

    fun scanItem(opnameId: Int, barcode: String) {
        viewModelScope.launch {
            _scanState.value = ScanActionState.Processing
            val result = repository.scanOpnameItem(opnameId, barcode, 1.0f) // default qty 1
            if (result.isSuccess) {
                _scanState.value = ScanActionState.Success(result.getOrNull()!!)
                // Auto-refresh items list after successful scan
                loadItems(opnameId)
            } else {
                _scanState.value = ScanActionState.Error(result.exceptionOrNull()?.message ?: "Gagal scan item")
            }
        }
    }

    fun finalizeSession(opnameId: Int) {
        viewModelScope.launch {
            _finalizeState.value = FinalizeState.Processing
            val result = repository.finalizeOpname(opnameId)
            if (result.isSuccess) {
                _finalizeState.value = FinalizeState.Success
            } else {
                _finalizeState.value = FinalizeState.Error(result.exceptionOrNull()?.message ?: "Gagal finalisasi")
            }
        }
    }

    fun loadItems(opnameId: Int) {
        viewModelScope.launch {
            _itemsState.value = _itemsState.value.copy(isLoading = true, error = null)
            repository.getOpnameItems(opnameId).onSuccess { items ->
                _itemsState.value = OpnameItemsState(isLoading = false, items = items)
            }.onFailure { e ->
                _itemsState.value = OpnameItemsState(isLoading = false, error = e.message)
            }
        }
    }

    fun markItemMissing(opnameId: Int, itemId: Int) {
        viewModelScope.launch {
            repository.markItemMissing(opnameId, itemId).onSuccess {
                loadItems(opnameId) // Refresh list
            }.onFailure { e ->
                _itemsState.value = _itemsState.value.copy(error = e.message)
            }
        }
    }

    fun resetScanState() {
        _scanState.value = ScanActionState.Idle
    }
}
