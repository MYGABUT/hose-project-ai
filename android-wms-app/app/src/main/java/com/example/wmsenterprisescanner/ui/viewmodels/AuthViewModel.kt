package com.example.wmsenterprisescanner.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.wmsenterprisescanner.data.model.LoginRequest
import com.example.wmsenterprisescanner.data.model.User
import com.example.wmsenterprisescanner.data.repository.AuthRepository
import com.example.wmsenterprisescanner.utils.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    fun login(email: String, pin: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            
            // Note: We use pin as password for simplicity in scanner devices
            val request = LoginRequest(email, pin)
            val result = repository.login(request)
            
            if (result.isSuccess) {
                val response = result.getOrNull()
                if (response != null) {
                    sessionManager.saveAuthToken(response.access_token)
                    _authState.value = AuthState.Success(response.user)
                } else {
                    _authState.value = AuthState.Error("Invalid empty token")
                }
            } else {
                _authState.value = AuthState.Error(result.exceptionOrNull()?.message ?: "Unknown Error")
            }
        }
    }

    private fun fetchCurrentUser() {
        // Disabled since we get User data directly from LoginResponse
    }
    
    fun logout() {
        sessionManager.clearSession()
        _authState.value = AuthState.Idle
    }
}
