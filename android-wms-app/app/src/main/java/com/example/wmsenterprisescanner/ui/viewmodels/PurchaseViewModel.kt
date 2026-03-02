package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.PurchaseRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PurchaseViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _requests = MutableStateFlow<List<PurchaseRequest>>(emptyList())
    val requests: StateFlow<List<PurchaseRequest>> = _requests

    private val _selectedPR = MutableStateFlow<PurchaseRequest?>(null)
    val selectedPR: StateFlow<PurchaseRequest?> = _selectedPR

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadRequests(status: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getPurchaseRequests(status = status)
                if (response.isSuccessful && response.body() != null) {
                    _requests.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _requests.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectPR(prId: Int) {
        viewModelScope.launch {
            try {
                val response = apiService.getPurchaseRequestDetail(prId)
                if (response.isSuccessful && response.body() != null) {
                    _selectedPR.value = response.body()!!.data
                }
            } catch (_: Exception) {}
        }
    }

    fun clearSelection() { _selectedPR.value = null }
}
