package com.example.wmsenterprisescanner.data.di

import com.example.wmsenterprisescanner.data.api.ApiService
import com.example.wmsenterprisescanner.data.repository.AuthRepository
import com.example.wmsenterprisescanner.data.repository.InventoryRepository
import com.example.wmsenterprisescanner.data.repository.OpnameRepository
import com.example.wmsenterprisescanner.data.repository.OutboundRepository
import com.example.wmsenterprisescanner.data.repository.TransferRepository
import com.example.wmsenterprisescanner.data.repository.ProductionRepository
import com.example.wmsenterprisescanner.data.repository.QCRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideAuthRepository(apiService: ApiService): AuthRepository {
        return AuthRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideInventoryRepository(apiService: ApiService): InventoryRepository {
        return InventoryRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideOpnameRepository(apiService: ApiService): OpnameRepository {
        return OpnameRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideOutboundRepository(apiService: ApiService): OutboundRepository {
        return OutboundRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideTransferRepository(apiService: ApiService): TransferRepository {
        return TransferRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideProductionRepository(apiService: ApiService): ProductionRepository {
        return ProductionRepository(apiService)
    }

    @Provides
    @Singleton
    fun provideQCRepository(apiService: ApiService): QCRepository {
        return QCRepository(apiService)
    }
}
