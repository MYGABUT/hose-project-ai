package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.BatchDetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.BatchInboundRequest
import com.example.wmsenterprisescanner.data.model.BatchInboundResponse
import com.example.wmsenterprisescanner.data.model.Product
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class InventoryRepository(private val apiService: ApiService) {

    suspend fun getProducts(search: String? = null): Result<List<Product>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getProducts(search = search)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.data)
                } else {
                    Result.failure(Exception("Failed to fetch products: ${response.code()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun receiveBatchInbound(request: BatchInboundRequest): Result<BatchInboundResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.receiveBatchInbound(request)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Failed to post inbound: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getBatchByBarcode(barcode: String): Result<BatchDetailResponseWrapper> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getBatchByBarcode(barcode)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!)
                } else {
                    Result.failure(Exception("Failed to fetch batch: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
