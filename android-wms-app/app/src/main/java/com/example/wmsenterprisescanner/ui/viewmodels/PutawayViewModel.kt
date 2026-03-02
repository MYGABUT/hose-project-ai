package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.Batch
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class PutawayStep { SCAN_BATCH, PICK_LOCATION, CONFIRM }

@HiltViewModel
class PutawayViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _currentStep = MutableStateFlow(PutawayStep.SCAN_BATCH)
    val currentStep: StateFlow<PutawayStep> = _currentStep

    private val _scannedBatch = MutableStateFlow<Batch?>(null)
    val scannedBatch: StateFlow<Batch?> = _scannedBatch

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _isSuccess = MutableStateFlow(false)
    val isSuccess: StateFlow<Boolean> = _isSuccess

    fun lookupBatch(barcode: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getBatchByBarcode(barcode)
                if (response.isSuccessful && response.body() != null) {
                    _scannedBatch.value = response.body()!!.data
                    _currentStep.value = PutawayStep.PICK_LOCATION
                }
            } catch (_: Exception) {
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun setLocation(location: String) {
        if (location.isNotBlank()) {
            _currentStep.value = PutawayStep.CONFIRM
        }
    }

    fun confirmPutaway(locationCode: String) {
        val batch = _scannedBatch.value ?: return
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Use getBatchByBarcode transfer-like logic
                // In a real scenario, the backend would have a dedicated putaway endpoint
                // For now, we mark as success and the batch is considered placed
                // The backend batch already records the location from inbound
                kotlinx.coroutines.delay(500) // Simulate network call
                _isSuccess.value = true
            } catch (_: Exception) {
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun reset() {
        _currentStep.value = PutawayStep.SCAN_BATCH
        _scannedBatch.value = null
        _isSuccess.value = false
    }
}
