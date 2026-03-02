package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.RMATicket
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RMAViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _tickets = MutableStateFlow<List<RMATicket>>(emptyList())
    val tickets: StateFlow<List<RMATicket>> = _tickets

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadTickets(status: String = "all") {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getRMATickets(status = status)
                if (response.isSuccessful && response.body() != null) {
                    _tickets.value = response.body()!!.data
                }
            } catch (_: Exception) {
                _tickets.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }
}
