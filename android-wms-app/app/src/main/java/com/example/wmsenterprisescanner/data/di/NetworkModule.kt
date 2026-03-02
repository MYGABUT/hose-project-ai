package com.example.wmsenterprisescanner.data.di

import android.content.Context
import com.example.wmsenterprisescanner.data.api.ApiClient
import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.utils.SessionManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideSessionManager(@ApplicationContext context: Context): SessionManager {
        return SessionManager(context)
    }

    @Provides
    @Singleton
    fun provideApiService(@ApplicationContext context: Context): ApiService {
        return ApiClient.getService(context)
    }
}
