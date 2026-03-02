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

@HiltViewModel
class InventoryBrowserViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _batches = MutableStateFlow<List<Batch>>(emptyList())
    val batches: StateFlow<List<Batch>> = _batches

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadBatches(search: String? = null, status: String? = null, brand: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getBatches(
                    search = search,
                    status = status,
                    brand = brand,
                    limit = 100
                )
                if (response.isSuccessful && response.body() != null) {
                    _batches.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _batches.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }
}
