package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.DOCompleteRequest
import com.example.wmsenterprisescanner.data.model.DODetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.DOListResponseWrapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OutboundRepository(
    private val apiService: ApiService
) {
    suspend fun getPendingDOs(status: String? = null): Result<DOListResponseWrapper> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getPendingDOs(status)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception(response.message() ?: "Failed to fetch DOs"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getDODetail(doId: Int): Result<DODetailResponseWrapper> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getDODetail(doId)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception(response.message() ?: "Failed to fetch DO Detail"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun completeDO(doId: Int, request: DOCompleteRequest): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.completeDO(doId, request)
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    Result.failure(Exception(response.message() ?: "Failed to complete DO"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun confirmDO(doId: Int): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.confirmDO(doId)
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val err = response.errorBody()?.string() ?: response.message()
                    Result.failure(Exception(err))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun dispatchDO(doId: Int): Result<Boolean> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.dispatchDO(doId)
                if (response.isSuccessful) {
                    Result.success(true)
                } else {
                    val err = response.errorBody()?.string() ?: response.message()
                    Result.failure(Exception(err))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}

