package com.example.wmsenterprisescanner.data.repository

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.model.WarehouseTransfer
import com.example.wmsenterprisescanner.data.model.TransferReceiveRequest
import com.example.wmsenterprisescanner.data.model.TransferShipRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

class TransferRepository @Inject constructor(private val apiService: ApiService) {

    suspend fun getTransfers(status: String? = null): Result<List<WarehouseTransfer>> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getTransfers(status)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.data)
                } else {
                    Result.failure(Exception("Failed to load transfers: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun getTransferDetail(transferId: Int): Result<WarehouseTransfer> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.getTransferDetail(transferId)
                if (response.isSuccessful && response.body() != null) {
                    Result.success(response.body()!!.data)
                } else {
                    Result.failure(Exception("Failed to load transfer detail: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun shipTransfer(transferId: Int, request: TransferShipRequest): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.shipTransfer(transferId, request)
                if (response.isSuccessful) {
                    Result.success("Transfer berhasil dikirim")
                } else {
                    Result.failure(Exception("Ship failed: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }

    suspend fun receiveTransfer(transferId: Int, request: TransferReceiveRequest): Result<String> {
        return withContext(Dispatchers.IO) {
            try {
                val response = apiService.receiveTransfer(transferId, request)
                if (response.isSuccessful) {
                    Result.success("Transfer berhasil diterima")
                } else {
                    Result.failure(Exception("Receive failed: ${response.code()} ${response.errorBody()?.string()}"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
    }
}
