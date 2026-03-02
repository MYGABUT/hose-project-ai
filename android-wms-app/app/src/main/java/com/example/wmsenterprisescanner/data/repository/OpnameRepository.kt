package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.FinalizeResponse
import com.example.wmsenterprisescanner.data.model.MarkMissingRequest
import com.example.wmsenterprisescanner.data.model.OpnameItem
import com.example.wmsenterprisescanner.data.model.OpnameResponseWrapper
import com.example.wmsenterprisescanner.data.model.ScanOpnameRequest
import com.example.wmsenterprisescanner.data.model.ScanOpnameResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class OpnameRepository(
    private val apiService: ApiService
) {
    suspend fun getCurrentOpname(): Result<OpnameResponseWrapper> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getCurrentOpname()
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Failed to fetch opname: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun scanOpnameItem(opnameId: Int, barcode: String, qty: Float): Result<ScanOpnameResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.scanOpnameItem(opnameId, ScanOpnameRequest(barcode, qty))
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Scan failed: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun finalizeOpname(opnameId: Int): Result<FinalizeResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.finalizeOpname(opnameId)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Finalize failed: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getOpnameItems(opnameId: Int): Result<List<OpnameItem>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getOpnameItems(opnameId)
                if (response.isSuccessful) {
                    Result.success(response.body()?.data ?: emptyList())
                } else {
                    Result.failure(Exception("Failed to load items: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun markItemMissing(opnameId: Int, itemId: Int): Result<Unit> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.markOpnameItemMissing(opnameId, MarkMissingRequest(itemId))
                if (response.isSuccessful) {
                    Result.success(Unit)
                } else {
                    Result.failure(Exception("Failed to mark missing: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
