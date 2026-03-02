package com.example.wmsenterprisescanner.data.api

import com.example.wmsenterprisescanner.data.model.BatchInboundRequest
import com.example.wmsenterprisescanner.data.model.BatchInboundResponse
import com.example.wmsenterprisescanner.data.model.FinalizeResponse
import com.example.wmsenterprisescanner.data.model.LoginResponse
import com.example.wmsenterprisescanner.data.model.MarkMissingRequest
import com.example.wmsenterprisescanner.data.model.OpnameItemsResponseWrapper
import com.example.wmsenterprisescanner.data.model.OpnameResponseWrapper
import com.example.wmsenterprisescanner.data.model.ProductListResponse
import com.example.wmsenterprisescanner.data.model.ScanOpnameRequest
import com.example.wmsenterprisescanner.data.model.ScanOpnameResponse
import com.example.wmsenterprisescanner.data.model.UserResponseWrapper
import com.example.wmsenterprisescanner.data.model.DOListResponseWrapper
import com.example.wmsenterprisescanner.data.model.DODetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.DOCompleteRequest
import com.example.wmsenterprisescanner.data.model.BatchDetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.TransferDetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.TransferListResponseWrapper
import com.example.wmsenterprisescanner.data.model.TransferReceiveRequest
import com.example.wmsenterprisescanner.data.model.TransferShipRequest
import com.example.wmsenterprisescanner.data.model.JODetailResponseWrapper
import com.example.wmsenterprisescanner.data.model.JOLineProgressRequest
import com.example.wmsenterprisescanner.data.model.JOTrackingResponseWrapper
import com.example.wmsenterprisescanner.data.model.JOWizardResponseWrapper
import com.example.wmsenterprisescanner.data.model.MaterialCutComplete
import com.example.wmsenterprisescanner.data.model.MaterialScanConfirm
import com.example.wmsenterprisescanner.data.model.QCInspectionRequest
import com.example.wmsenterprisescanner.data.model.QCInspectResponseWrapper
import com.example.wmsenterprisescanner.data.model.QCPendingListResponseWrapper
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    
    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("username") username: String,
        @Field("password") password: String
    ): Response<LoginResponse>

    @GET("users/me")
    suspend fun getCurrentUser(): Response<UserResponseWrapper>

    @GET("products")
    suspend fun getProducts(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 1000,
        @Query("search") search: String? = null
    ): Response<ProductListResponse>

    @POST("batches/inbound")
    suspend fun receiveBatchInbound(
        @Body request: BatchInboundRequest
    ): Response<BatchInboundResponse>

    @GET("batches/{barcode}")
    suspend fun getBatchByBarcode(
        @retrofit2.http.Path("barcode") barcode: String
    ): Response<BatchDetailResponseWrapper>

    // Opname Endpoints
    @GET("opname/current")
    suspend fun getCurrentOpname(): Response<OpnameResponseWrapper>

    @POST("opname/{opname_id}/scan")
    suspend fun scanOpnameItem(
        @retrofit2.http.Path("opname_id") opnameId: Int,
        @Body request: ScanOpnameRequest
    ): Response<ScanOpnameResponse>

    @POST("opname/{opname_id}/finalize")
    suspend fun finalizeOpname(
        @retrofit2.http.Path("opname_id") opnameId: Int
    ): Response<FinalizeResponse>

    @GET("opname/{opname_id}/items")
    suspend fun getOpnameItems(
        @retrofit2.http.Path("opname_id") opnameId: Int
    ): Response<OpnameItemsResponseWrapper>

    @POST("opname/{opname_id}/mark-missing")
    suspend fun markOpnameItemMissing(
        @retrofit2.http.Path("opname_id") opnameId: Int,
        @Body request: MarkMissingRequest
    ): Response<okhttp3.ResponseBody>

    // Delivery Order Endpoints
    @GET("do")
    suspend fun getPendingDOs(
        @Query("status") status: String? = null
    ): Response<DOListResponseWrapper>

    @GET("do/{do_id}")
    suspend fun getDODetail(
        @retrofit2.http.Path("do_id") doId: Int
    ): Response<DODetailResponseWrapper>

    @POST("do/{do_id}/complete")
    suspend fun completeDO(
        @retrofit2.http.Path("do_id") doId: Int,
        @Body request: DOCompleteRequest
    ): Response<okhttp3.ResponseBody>

    @POST("do/{do_id}/confirm")
    suspend fun confirmDO(
        @retrofit2.http.Path("do_id") doId: Int
    ): Response<okhttp3.ResponseBody>

    @POST("do/{do_id}/dispatch")
    suspend fun dispatchDO(
        @retrofit2.http.Path("do_id") doId: Int
    ): Response<okhttp3.ResponseBody>

    // Warehouse Transfer Endpoints
    @GET("transfers")
    suspend fun getTransfers(
        @Query("status") status: String? = null
    ): Response<TransferListResponseWrapper>

    @GET("transfers/{id}")
    suspend fun getTransferDetail(
        @retrofit2.http.Path("id") transferId: Int
    ): Response<TransferDetailResponseWrapper>

    @POST("transfers/{id}/ship")
    suspend fun shipTransfer(
        @retrofit2.http.Path("id") transferId: Int,
        @Body request: TransferShipRequest
    ): Response<okhttp3.ResponseBody>

    @POST("transfers/{id}/receive")
    suspend fun receiveTransfer(
        @retrofit2.http.Path("id") transferId: Int,
        @Body request: TransferReceiveRequest
    ): Response<okhttp3.ResponseBody>

    // Production / Job Order Endpoints
    @GET("jo/tracking/outstanding")
    suspend fun getOutstandingJOs(): Response<JOTrackingResponseWrapper>

    @GET("jo/{jo_id}")
    suspend fun getJODetail(
        @retrofit2.http.Path("jo_id") joId: Int
    ): Response<JODetailResponseWrapper>

    @POST("jo/{jo_id}/start")
    suspend fun startJobOrder(
        @retrofit2.http.Path("jo_id") joId: Int
    ): Response<okhttp3.ResponseBody>

    @GET("jo/{jo_id}/wizard")
    suspend fun getWizardSteps(
        @retrofit2.http.Path("jo_id") joId: Int
    ): Response<JOWizardResponseWrapper>

    @POST("jo/scan-material")
    suspend fun scanJOMaterial(
        @Body request: MaterialScanConfirm
    ): Response<okhttp3.ResponseBody>

    @POST("jo/complete-cut")
    suspend fun completeJOCut(
        @Body request: MaterialCutComplete
    ): Response<okhttp3.ResponseBody>

    @POST("jo/{jo_id}/lines/{line_id}/update-progress")
    suspend fun updateJOLineProgress(
        @retrofit2.http.Path("jo_id") joId: Int,
        @retrofit2.http.Path("line_id") lineId: Int,
        @Body request: JOLineProgressRequest
    ): Response<okhttp3.ResponseBody>

    @POST("jo/{jo_id}/complete")
    suspend fun completeJobOrder(
        @retrofit2.http.Path("jo_id") joId: Int
    ): Response<okhttp3.ResponseBody>

    // Quality Control (QC) Endpoints
    @GET("qc/pending")
    suspend fun getPendingQC(): Response<QCPendingListResponseWrapper>

    @POST("qc/inspect")
    suspend fun submitQCInspection(
        @Body request: QCInspectionRequest
    ): Response<QCInspectResponseWrapper>

    // Dashboard Endpoints
    @GET("dashboard/summary")
    suspend fun getDashboardSummary(): Response<com.example.wmsenterprisescanner.data.model.DashboardSummaryResponse>

    // Inventory Browser Endpoints
    @GET("batches")
    suspend fun getBatches(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50,
        @Query("search") search: String? = null,
        @Query("brand") brand: String? = null,
        @Query("location_code") locationCode: String? = null,
        @Query("status") status: String? = null,
        @Query("available_only") availableOnly: Boolean? = null
    ): Response<com.example.wmsenterprisescanner.data.model.BatchListResponse>

    @GET("batches/{barcode}/movements")
    suspend fun getBatchMovements(
        @retrofit2.http.Path("barcode") barcode: String
    ): Response<okhttp3.ResponseBody>

    // Location Endpoints
    @GET("locations")
    suspend fun getLocations(
        @Query("zone") zone: String? = null,
        @Query("search") search: String? = null
    ): Response<com.example.wmsenterprisescanner.data.model.LocationListResponse>

    // Sales Order Endpoints
    @GET("so")
    suspend fun getSalesOrders(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50,
        @Query("status") status: String? = null,
        @Query("search") search: String? = null
    ): Response<com.example.wmsenterprisescanner.data.model.SOListResponse>

    @GET("so/{so_id}")
    suspend fun getSalesOrderDetail(
        @retrofit2.http.Path("so_id") soId: Int
    ): Response<com.example.wmsenterprisescanner.data.model.SODetailResponse>

    // Purchase Request Endpoints
    @GET("pr")
    suspend fun getPurchaseRequests(
        @Query("status") status: String? = null,
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50
    ): Response<com.example.wmsenterprisescanner.data.model.PRListResponse>

    @GET("pr/{pr_id}")
    suspend fun getPurchaseRequestDetail(
        @retrofit2.http.Path("pr_id") prId: Int
    ): Response<com.example.wmsenterprisescanner.data.model.PRDetailResponse>

    // Invoice Endpoints
    @GET("invoices/")
    suspend fun getInvoices(
        @Query("skip") skip: Int = 0,
        @Query("limit") limit: Int = 50,
        @Query("payment_status") paymentStatus: String? = null
    ): Response<com.example.wmsenterprisescanner.data.model.InvoiceListResponse>

    @GET("invoices/summary")
    suspend fun getInvoiceSummary(): Response<com.example.wmsenterprisescanner.data.model.InvoiceSummaryResponse>

    // RMA Endpoints
    @GET("rma/rma")
    suspend fun getRMATickets(
        @Query("status") status: String = "all"
    ): Response<com.example.wmsenterprisescanner.data.model.RMAListResponse>
}
