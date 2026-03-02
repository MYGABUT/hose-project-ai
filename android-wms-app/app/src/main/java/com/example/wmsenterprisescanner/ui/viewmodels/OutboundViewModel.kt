package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.DOCompleteRequest
import com.example.wmsenterprisescanner.data.model.DOPickItem
import com.example.wmsenterprisescanner.data.model.DeliveryOrder
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import com.example.wmsenterprisescanner.data.repository.OutboundRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OutboundMenuState(
    val isLoading: Boolean = false,
    val dos: List<DeliveryOrder> = emptyList(),
    val error: String? = null,
    val activeFilter: String? = null,
    val actionMessage: String? = null
)

data class OutboundPickState(
    val isLoading: Boolean = false,
    val deliveryOrder: DeliveryOrder? = null,
    val pickedItems: List<DOPickItem> = emptyList(),
    val isCompleteMode: Boolean = false,
    val error: String? = null,
    val scanSuccess: String? = null,
    val isSubmitSuccess: Boolean = false
)

@HiltViewModel
class OutboundViewModel @Inject constructor(
    private val outboundRepository: OutboundRepository,
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    private val _menuState = MutableStateFlow(OutboundMenuState())
    val menuState: StateFlow<OutboundMenuState> = _menuState.asStateFlow()

    private val _pickState = MutableStateFlow(OutboundPickState())
    val pickState: StateFlow<OutboundPickState> = _pickState.asStateFlow()

    fun loadPendingDOs(status: String? = null) {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null, activeFilter = status) }
            val result = outboundRepository.getPendingDOs(status)
            result.onSuccess { wrapper ->
                _menuState.update { it.copy(isLoading = false, dos = wrapper.data) }
            }.onFailure { e ->
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun confirmDO(doId: Int) {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null) }
            outboundRepository.confirmDO(doId).onSuccess {
                _menuState.update { it.copy(actionMessage = "DO dikonfirmasi dan siap kirim") }
                loadPendingDOs(_menuState.value.activeFilter)
            }.onFailure { e ->
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun dispatchDO(doId: Int) {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null) }
            outboundRepository.dispatchDO(doId).onSuccess {
                _menuState.update { it.copy(actionMessage = "DO telah dikirim (dispatched)") }
                loadPendingDOs(_menuState.value.activeFilter)
            }.onFailure { e ->
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun dismissActionMessage() {
        _menuState.update { it.copy(actionMessage = null) }
    }

    fun selectDO(doId: Int) {
        viewModelScope.launch {
            _pickState.update { OutboundPickState(isLoading = true) } // reset
            val result = outboundRepository.getDODetail(doId)
            result.onSuccess { wrapper ->
                _pickState.update { it.copy(isLoading = false, deliveryOrder = wrapper.data) }
            }.onFailure { e ->
                _pickState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun handleScan(barcode: String) {
        viewModelScope.launch {
            val currentState = _pickState.value
            val doDetail = currentState.deliveryOrder ?: return@launch
            
            _pickState.update { it.copy(isLoading = true, error = null, scanSuccess = null) }

            // 1. Resolve barcode
            val batchResult = inventoryRepository.getBatchByBarcode(barcode)
            if (batchResult.isFailure) {
                _pickState.update { it.copy(isLoading = false, error = "Barcode tidak valid atau tidak ditemukan") }
                return@launch
            }

            val batch = batchResult.getOrNull()?.data
            if (batch == null || batch.available_qty <= 0) {
                _pickState.update { it.copy(isLoading = false, error = "Batch kosong atau tidak tersedia") }
                return@launch
            }

            // 2. Find matching DO Line
            val matchingLine = doDetail.lines.find { it.product_id == batch.product_id }
            if (matchingLine == null) {
                _pickState.update { it.copy(isLoading = false, error = "Barang ini (${batch.product_name}) tidak ada di Delivery Order ini!") }
                return@launch
            }

            // 3. Check Qty bounds
            val alreadyPickedQty = currentState.pickedItems
                .filter { it.product_id == batch.product_id }
                .sumOf { it.qty }
            
            val qtyNeeded = matchingLine.qty_shipped - alreadyPickedQty
            
            if (qtyNeeded <= 0) {
                _pickState.update { it.copy(isLoading = false, error = "Barang ini sudah dipick sesuai target DO!") }
                return@launch
            }

            // Deduct whatever is smaller: what we need or what the batch has
            val qtyToPick = minOf(qtyNeeded, batch.available_qty)

            // Update state
            val existingPicks = currentState.pickedItems.toMutableList()
            
            // Check if batch already in list
            val existingBatchPickIndex = existingPicks.indexOfFirst { it.batch_id == batch.id }
            if (existingBatchPickIndex != -1) {
                val currentPick = existingPicks[existingBatchPickIndex]
                existingPicks[existingBatchPickIndex] = currentPick.copy(qty = currentPick.qty + qtyToPick)
            } else {
                existingPicks.add(DOPickItem(product_id = batch.product_id, batch_id = batch.id, qty = qtyToPick))
            }

            _pickState.update { 
                it.copy(
                    isLoading = false, 
                    pickedItems = existingPicks,
                    scanSuccess = "Berhasil pick ${qtyToPick}x ${batch.product_name}"
                ) 
            }
        }
    }

    fun dismissError() {
        _pickState.update { it.copy(error = null) }
        _menuState.update { it.copy(error = null) }
    }

    fun dismissSuccess() {
        _pickState.update { it.copy(scanSuccess = null) }
    }

    fun submitPick() {
        val currentState = _pickState.value
        val doId = currentState.deliveryOrder?.id ?: return
        
        viewModelScope.launch {
            _pickState.update { it.copy(isLoading = true, error = null) }
            val request = DOCompleteRequest(picked_batches = currentState.pickedItems)
            val result = outboundRepository.completeDO(doId, request)
            
            result.onSuccess {
                _pickState.update { it.copy(isLoading = false, isSubmitSuccess = true) }
            }.onFailure { e ->
                _pickState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
