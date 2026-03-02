package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.WarehouseTransfer
import com.example.wmsenterprisescanner.data.model.TransferPickItem
import com.example.wmsenterprisescanner.data.model.TransferShipRequest
import com.example.wmsenterprisescanner.data.model.TransferReceiveItem
import com.example.wmsenterprisescanner.data.model.TransferReceiveRequest
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import com.example.wmsenterprisescanner.data.repository.TransferRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TransferMenuState(
    val isLoading: Boolean = false,
    val transfers: List<WarehouseTransfer> = emptyList(),
    val error: String? = null
)

data class TransferShipState(
    val isLoading: Boolean = false,
    val transfer: WarehouseTransfer? = null,
    val pickedItems: List<TransferPickItem> = emptyList(),
    val scanSuccess: String? = null,
    val isSubmitSuccess: Boolean = false,
    val error: String? = null
)

data class TransferReceiveState(
    val isLoading: Boolean = false,
    val transfer: WarehouseTransfer? = null,
    val receivedItems: List<TransferReceiveItem> = emptyList(), // Store user inputted qty
    val isSubmitSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class TransferViewModel @Inject constructor(
    private val transferRepository: TransferRepository,
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    // --- State Holders ---
    private val _menuState = MutableStateFlow(TransferMenuState())
    val menuState: StateFlow<TransferMenuState> = _menuState.asStateFlow()

    private val _shipState = MutableStateFlow(TransferShipState())
    val shipState: StateFlow<TransferShipState> = _shipState.asStateFlow()

    private val _receiveState = MutableStateFlow(TransferReceiveState())
    val receiveState: StateFlow<TransferReceiveState> = _receiveState.asStateFlow()


    // =============================
    // MENU OPERATIONS
    // =============================
    fun loadTransfers() {
        viewModelScope.launch {
            _menuState.update { it.copy(isLoading = true, error = null) }
            
            // Note: We'll fetch all and filter in ViewModel to have both tabs (APPROVED, IN_TRANSIT) 
            // Alternatively, could pass status to Repository. Since we might need both, we'll fetch all active.
            try {
                // Fetch APPROVED
                val resultApprove = transferRepository.getTransfers("APPROVED")
                // Fetch IN_TRANSIT
                val resultTransit = transferRepository.getTransfers("IN_TRANSIT")
                
                val combinedList = mutableListOf<WarehouseTransfer>()
                
                if (resultApprove.isSuccess) { combinedList.addAll(resultApprove.getOrNull()!!) }
                if (resultTransit.isSuccess) { combinedList.addAll(resultTransit.getOrNull()!!) }
                
                _menuState.update {
                    it.copy(isLoading = false, transfers = combinedList.sortedByDescending { t -> t.id })
                }
            } catch (e: Exception) {
                _menuState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }


    // =============================
    // SHIP (OUTBOUND) OPERATIONS
    // =============================
    fun selectTransferForShipping(transferId: Int) {
        viewModelScope.launch {
            _shipState.update { TransferShipState(isLoading = true) }
            transferRepository.getTransferDetail(transferId).onSuccess { data ->
                _shipState.update { it.copy(isLoading = false, transfer = data) }
            }.onFailure { e ->
                _shipState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun handleScanForShipping(barcode: String) {
        val currentState = _shipState.value
        val transfer = currentState.transfer ?: return
        
        if (currentState.isLoading) return
        
        viewModelScope.launch {
            _shipState.update { it.copy(isLoading = true, error = null, scanSuccess = null) }
            
            // 1. Resolve Barcode to Batch
            inventoryRepository.getBatchByBarcode(barcode).onSuccess { batchWrapper ->
                val batch = batchWrapper.data
                val productId = batch.product_id

                // 2. Check if this product is needed for this Transfer
                val neededLine = transfer.items.find { it.product_id == productId }
                
                if (neededLine == null) {
                    _shipState.update { it.copy(isLoading = false, error = "Scanned item is not required for this Transfer.") }
                    return@launch
                }

                // Temporary check: Check if batch location string equals the from_location_name. 
                // Better would be if backend returned `location_id` on the Batch API.
                if (batch.location != transfer.from_location_name) {
                     _shipState.update { it.copy(isLoading = false, error = "Invalid location. Transfer ships from ${transfer.from_location_name}, but scanned item is in ${batch.location}.") }
                    return@launch
                }
                
                // 3. Check picked quantity vs requested
                val alreadyPickedQtyForProduct = currentState.pickedItems.filter { it.product_id == productId }.sumOf { it.qty }
                val remainingNeeded = neededLine.qty_requested - alreadyPickedQtyForProduct
                
                if (remainingNeeded <= 0) {
                    _shipState.update { it.copy(isLoading = false, error = "This item has already been fully picked.") }
                    return@launch
                }
                
                // Determine how much to pick from this batch
                val qtyToPick = minOf(batch.current_qty, remainingNeeded)
                
                if (qtyToPick <= 0) {
                    _shipState.update { it.copy(isLoading = false, error = "Batch is empty or unavailable.") }
                    return@launch
                }
                
                // 4. Update state with new pick
                val newPick = TransferPickItem(
                    product_id = productId,
                    batch_id = batch.id,
                    qty = qtyToPick
                )

                // If this batch was already partially picked, update it, else add new
                val currentPicks = currentState.pickedItems.toMutableList()
                val existingPickIndex = currentPicks.indexOfFirst { it.batch_id == batch.id }
                
                if (existingPickIndex != -1) {
                    val existing = currentPicks[existingPickIndex]
                    currentPicks[existingPickIndex] = existing.copy(qty = existing.qty + qtyToPick)
                } else {
                    currentPicks.add(newPick)
                }

                _shipState.update {
                    it.copy(
                        isLoading = false,
                        pickedItems = currentPicks,
                        scanSuccess = "Picked ${qtyToPick} of ${neededLine.product_name}"
                    )
                }
                
            }.onFailure { e ->
                _shipState.update { it.copy(isLoading = false, error = e.message ?: "Invalid barcode.") }
            }
        }
    }

    fun submitShipment() {
        val state = _shipState.value
        val transfer = state.transfer ?: return
        
        viewModelScope.launch {
            _shipState.update { it.copy(isLoading = true, error = null) }
            
            // Validation: Ensure all requested qty is picked. (Or allow partial if strictness is relaxed, but we enforce strict for now)
            val isFullyPicked = transfer.items.all { line ->
                val picked = state.pickedItems.filter { it.product_id == line.product_id }.sumOf { it.qty }
                picked >= line.qty_requested
            }
            
            if (!isFullyPicked) {
                 _shipState.update { it.copy(isLoading = false, error = "Cannot ship: Not all requested items have been picked completely.") }
                 return@launch
            }

            val request = TransferShipRequest(
                shipped_by = "scanner_user", // TODO: Get from auth token
                picked_batches = state.pickedItems
            )
            
            transferRepository.shipTransfer(transfer.id, request).onSuccess {
                _shipState.update { it.copy(isLoading = false, isSubmitSuccess = true) }
            }.onFailure { e ->
                _shipState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun dismissShipError() { _shipState.update { it.copy(error = null) } }
    fun dismissShipSuccess() { _shipState.update { it.copy(scanSuccess = null) } }


    // =============================
    // RECEIVE (INBOUND) OPERATIONS
    // =============================
    fun selectTransferForReceiving(transferId: Int) {
        viewModelScope.launch {
             _receiveState.update { TransferReceiveState(isLoading = true) }
             transferRepository.getTransferDetail(transferId).onSuccess { data ->
                 // Pre-fill receive qtys with shipped qtys (Assume perfect receipt by default)
                 val prefilled = data.items.map { item -> 
                     TransferReceiveItem(id = item.id, qty_received = item.qty_shipped)
                 }
                 _receiveState.update { it.copy(isLoading = false, transfer = data, receivedItems = prefilled) }
             }.onFailure { e ->
                 _receiveState.update { it.copy(isLoading = false, error = e.message) }
             }
        }
    }

    // Allows user to manually adjust qty if what arrived doesn't match shipped
    fun updateReceiveQty(itemId: Int, newQty: Double) {
        val currentItems = _receiveState.value.receivedItems.toMutableList()
        val index = currentItems.indexOfFirst { it.id == itemId }
        if (index != -1) {
            currentItems[index] = currentItems[index].copy(qty_received = newQty)
            _receiveState.update { it.copy(receivedItems = currentItems) }
        }
    }

    fun submitReceipt() {
        val state = _receiveState.value
        val transfer = state.transfer ?: return

        viewModelScope.launch {
            _receiveState.update { it.copy(isLoading = true, error = null) }
            
            val request = TransferReceiveRequest(
                received_by = "scanner_user", // TODO
                items_received = state.receivedItems
            )
            
            transferRepository.receiveTransfer(transfer.id, request).onSuccess {
                 _receiveState.update { it.copy(isLoading = false, isSubmitSuccess = true) }
            }.onFailure { e ->
                _receiveState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
    
    fun dismissReceiveError() { _receiveState.update { it.copy(error = null) } }
}
