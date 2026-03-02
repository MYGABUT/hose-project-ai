package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.BatchInboundRequest
import com.example.wmsenterprisescanner.data.model.Product
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

sealed class ProductsState {
    object Idle : ProductsState()
    object Loading : ProductsState()
    data class Success(val products: List<Product>) : ProductsState()
    data class Error(val message: String) : ProductsState()
}

sealed class InboundState {
    object Idle : InboundState()
    object Submitting : InboundState()
    data class Success(val transactionId: String?) : InboundState()
    data class Error(val message: String) : InboundState()
}

@HiltViewModel
class InventoryViewModel @Inject constructor(
    private val repository: InventoryRepository
) : ViewModel() {

    private val _productsState = MutableStateFlow<ProductsState>(ProductsState.Idle)
    val productsState: StateFlow<ProductsState> = _productsState

    private val _inboundState = MutableStateFlow<InboundState>(InboundState.Idle)
    val inboundState: StateFlow<InboundState> = _inboundState

    // Load initial product list
    fun fetchProducts(search: String? = null) {
        viewModelScope.launch {
            _productsState.value = ProductsState.Loading
            val result = repository.getProducts(search)
            if (result.isSuccess) {
                _productsState.value = ProductsState.Success(result.getOrNull() ?: emptyList())
            } else {
                _productsState.value = ProductsState.Error(result.exceptionOrNull()?.message ?: "Unknown Error")
            }
        }
    }

    // Submit inbound scan
    fun submitInbound(request: BatchInboundRequest) {
        viewModelScope.launch {
            _inboundState.value = InboundState.Submitting
            val result = repository.receiveBatchInbound(request)
            if (result.isSuccess) {
                val response = result.getOrNull()
                _inboundState.value = InboundState.Success(response?.transaction_id)
            } else {
                _inboundState.value = InboundState.Error(result.exceptionOrNull()?.message ?: "Unknown Error")
            }
        }
    }
    
    // Reset inbound state after success dialog
    fun resetInboundState() {
        _inboundState.value = InboundState.Idle
    }
}
