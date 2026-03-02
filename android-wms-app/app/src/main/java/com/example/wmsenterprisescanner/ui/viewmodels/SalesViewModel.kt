package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.SalesOrder
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SalesViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _orders = MutableStateFlow<List<SalesOrder>>(emptyList())
    val orders: StateFlow<List<SalesOrder>> = _orders

    private val _selectedOrder = MutableStateFlow<SalesOrder?>(null)
    val selectedOrder: StateFlow<SalesOrder?> = _selectedOrder

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadOrders(search: String? = null, status: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getSalesOrders(search = search, status = status)
                if (response.isSuccessful && response.body() != null) {
                    _orders.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _orders.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectOrder(soId: Int) {
        viewModelScope.launch {
            try {
                val response = apiService.getSalesOrderDetail(soId)
                if (response.isSuccessful && response.body() != null) {
                    _selectedOrder.value = response.body()!!.data
                }
            } catch (_: Exception) {}
        }
    }

    fun clearSelection() { _selectedOrder.value = null }
}
