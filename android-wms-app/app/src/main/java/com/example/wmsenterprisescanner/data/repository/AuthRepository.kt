package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.LoginRequest
import com.example.wmsenterprisescanner.data.model.LoginResponse
import com.example.wmsenterprisescanner.data.model.User
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(private val apiService: ApiService) {

    suspend fun login(request: LoginRequest): Result<LoginResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.login(request.email, request.password)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    val errorBody = response.errorBody()?.string() ?: ""
                    // Try to extract "detail" from JSON error
                    val detail = try {
                        val json = org.json.JSONObject(errorBody)
                        json.optString("detail", "Login gagal")
                    } catch (_: Exception) {
                        "Login gagal: ${response.code()}"
                    }
                    Result.failure(Exception(detail))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getCurrentUser(): Result<User> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getCurrentUser()
                if (response.isSuccessful && response.body() != null) {
                    val userWrapper = response.body()!!
                    Result.success(userWrapper.data)
                } else {
                    Result.failure(Exception("Failed getting user info"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
