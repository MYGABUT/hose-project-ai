package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.JobOrder
import com.example.wmsenterprisescanner.data.model.JODetail
import com.example.wmsenterprisescanner.data.model.JOWizardResponseWrapper
import com.example.wmsenterprisescanner.data.model.MaterialCutComplete
import com.example.wmsenterprisescanner.data.model.MaterialScanConfirm
import com.example.wmsenterprisescanner.data.model.JOLineProgressRequest
import com.example.wmsenterprisescanner.data.model.WizardData
import javax.inject.Inject

class ProductionRepository @Inject constructor(
    private val apiService: ApiService
) {
    suspend fun getOutstandingJOs(): Result<List<JobOrder>> {
        return try {
            val response = apiService.getOutstandingJOs()
            if (response.isSuccessful) {
                Result.success(response.body()?.data ?: emptyList())
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getJODetail(joId: Int): Result<JODetail> {
        return try {
            val response = apiService.getJODetail(joId)
            if (response.isSuccessful) {
                response.body()?.data?.let {
                    Result.success(it)
                } ?: Result.failure(Exception("JODetail data is null"))
            } else {
                 Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startJobOrder(joId: Int): Result<Unit> {
        return try {
            val response = apiService.startJobOrder(joId)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getWizardSteps(joId: Int): Result<WizardData> {
        return try {
            val response = apiService.getWizardSteps(joId)
            if (response.isSuccessful) {
                 response.body()?.data?.let {
                    Result.success(it)
                } ?: Result.failure(Exception("WizardData data is null"))
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun scanJOMaterial(request: MaterialScanConfirm): Result<Unit> {
         return try {
            val response = apiService.scanJOMaterial(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMsg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeJOCut(request: MaterialCutComplete): Result<Unit> {
         return try {
            val response = apiService.completeJOCut(request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                 val errorMsg = response.errorBody()?.string() ?: response.message()
                 Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateJOLineProgress(joId: Int, lineId: Int, request: JOLineProgressRequest): Result<Unit> {
         return try {
            val response = apiService.updateJOLineProgress(joId, lineId, request)
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMsg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeJobOrder(joId: Int): Result<Unit> {
        return try {
            val response = apiService.completeJobOrder(joId)
             if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                val errorMsg = response.errorBody()?.string() ?: response.message()
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
