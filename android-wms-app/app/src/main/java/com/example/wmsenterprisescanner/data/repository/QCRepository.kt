package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.QCInspectionRequest
import com.example.wmsenterprisescanner.data.model.QCInspectResponseData
import com.example.wmsenterprisescanner.data.model.QCPendingItem
import javax.inject.Inject

class QCRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getPendingQCItems(): Result<List<QCPendingItem>> {
        return try {
            val response = apiService.getPendingQC()
            if (response.isSuccessful) {
                Result.success(response.body()?.data ?: emptyList())
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun submitQCInspection(request: QCInspectionRequest): Result<QCInspectResponseData?> {
        return try {
            val response = apiService.submitQCInspection(request)
            if (response.isSuccessful) {
                Result.success(response.body()?.data)
            } else {
                val errorMsg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
