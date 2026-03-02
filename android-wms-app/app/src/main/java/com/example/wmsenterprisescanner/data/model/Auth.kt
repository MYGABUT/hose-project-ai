package com.example.wmsenterprisescanner.data.model

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val access_token: String,
    val token_type: String,
    val user: User
)

data class User(
    val id: Int,
    val email: String,
    val name: String,
    val role: String,
    val company_id: Int?
)

data class UserResponseWrapper(
    val status: String,
    val data: User
)
