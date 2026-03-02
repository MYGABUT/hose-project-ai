package com.example.wmsenterprisescanner.utils

import android.content.Context
import android.content.SharedPreferences
import com.example.wmsenterprisescanner.BuildConfig

class SessionManager(context: Context) {
    private var prefs: SharedPreferences = context.getSharedPreferences("wms_session", Context.MODE_PRIVATE)

    companion object {
        const val USER_TOKEN = "user_token"
        const val SERVER_URL = "server_url"
        const val TERMS_ACCEPTED = "terms_accepted"

        /**
         * Production builds use the hardcoded BuildConfig URL.
         * Debug builds allow overriding via SharedPreferences.
         */
        fun getDefaultUrl(): String = BuildConfig.SERVER_URL
        fun isServerConfigAllowed(): Boolean = BuildConfig.ALLOW_SERVER_CONFIG
    }

    fun saveAuthToken(token: String) {
        prefs.edit().putString(USER_TOKEN, token).apply()
    }

    fun fetchAuthToken(): String? {
        return prefs.getString(USER_TOKEN, null)
    }

    /**
     * Save custom server URL (only effective in debug builds).
     */
    fun saveServerUrl(url: String) {
        prefs.edit().putString(SERVER_URL, url).apply()
    }

    /**
     * Returns the effective server URL:
     * - Production: always returns BuildConfig.SERVER_URL (cannot be overridden)
     * - Debug: returns user-configured URL if set, otherwise BuildConfig.SERVER_URL
     */
    fun fetchServerUrl(): String {
        return if (isServerConfigAllowed()) {
            prefs.getString(SERVER_URL, getDefaultUrl()) ?: getDefaultUrl()
        } else {
            // Production: always use hardcoded URL, ignore any saved override
            getDefaultUrl()
        }
    }

    fun hasAcceptedTerms(): Boolean {
        return prefs.getBoolean(TERMS_ACCEPTED, false)
    }

    fun setTermsAccepted() {
        prefs.edit().putBoolean(TERMS_ACCEPTED, true).apply()
    }

    fun clearSession() {
        val serverUrl = fetchServerUrl()
        prefs.edit().clear().apply()
        if (isServerConfigAllowed()) {
            saveServerUrl(serverUrl) // Preserve custom URL in debug only
        }
    }
}
