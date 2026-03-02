package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.Invoice
import com.example.wmsenterprisescanner.data.model.InvoiceSummary
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class InvoiceViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _invoices = MutableStateFlow<List<Invoice>>(emptyList())
    val invoices: StateFlow<List<Invoice>> = _invoices

    private val _summary = MutableStateFlow(InvoiceSummary())
    val summary: StateFlow<InvoiceSummary> = _summary

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadAll() {
        loadInvoices()
        loadSummary()
    }

    fun loadInvoices(paymentStatus: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getInvoices(paymentStatus = paymentStatus)
                if (response.isSuccessful && response.body() != null) {
                    _invoices.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _invoices.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun loadSummary() {
        viewModelScope.launch {
            try {
                val response = apiService.getInvoiceSummary()
                if (response.isSuccessful && response.body() != null) {
                    _summary.value = response.body()!!.data
                }
            } catch (_: Exception) {}
        }
    }
}
