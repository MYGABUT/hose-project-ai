package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.Location
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RackMapViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _locations = MutableStateFlow<List<Location>>(emptyList())
    val locations: StateFlow<List<Location>> = _locations

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _selectedLocation = MutableStateFlow<Location?>(null)
    val selectedLocation: StateFlow<Location?> = _selectedLocation

    fun loadLocations(zone: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getLocations(zone = zone)
                if (response.isSuccessful && response.body() != null) {
                    _locations.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _locations.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectLocation(location: Location) {
        _selectedLocation.value = if (_selectedLocation.value?.id == location.id) null else location
    }
}
