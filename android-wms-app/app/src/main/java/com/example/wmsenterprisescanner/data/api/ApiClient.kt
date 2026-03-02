package com.example.wmsenterprisescanner.data.api

import android.content.Context
import com.example.wmsenterprisescanner.utils.SessionManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private var retrofit: Retrofit? = null
    private var currentBaseUrl: String? = null

    /**
     * Returns the ApiService, rebuilding the Retrofit client if the server URL changed.
     * This allows users to configure the server URL from the login screen.
     */
    fun getService(context: Context): ApiService {
        val sessionManager = SessionManager(context)
        val baseUrl = sessionManager.fetchServerUrl()

        // Rebuild Retrofit if URL changed or first time
        if (retrofit == null || currentBaseUrl != baseUrl) {
            currentBaseUrl = baseUrl

            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val httpClient = OkHttpClient.Builder()
                .addInterceptor(logging)
                .addInterceptor { chain ->
                    val original = chain.request()
                    val token = sessionManager.fetchAuthToken()

                    val requestBuilder = original.newBuilder()
                        .header("Accept", "application/json")

                    // Don't force Content-Type for form-encoded requests
                    if (original.body?.contentType()?.subtype != "x-www-form-urlencoded") {
                        requestBuilder.header("Content-Type", "application/json")
                    }

                    if (!token.isNullOrEmpty()) {
                        requestBuilder.header("Authorization", "Bearer $token")
                    }

                    chain.proceed(requestBuilder.build())
                }
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .client(httpClient)
                .build()
        }
        return retrofit!!.create(ApiService::class.java)
    }

    /**
     * Force rebuild on next getService call (e.g. after URL change)
     */
    fun invalidate() {
        retrofit = null
        currentBaseUrl = null
    }
}
