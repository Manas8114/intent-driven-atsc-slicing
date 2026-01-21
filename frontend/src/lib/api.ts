/**
 * API configuration and utilities for the frontend.
 * 
 * Provides:
 * - Centralized API base URL from environment
 * - fetchWithRetry() for resilient API calls
 * - Error handling utilities
 */

// API Base URL - uses environment variable or defaults to localhost
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// WebSocket Base URL - matches API_BASE but with ws protocol
export const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

/**
 * Fetch with automatic retry and exponential backoff.
 * 
 * @param url - URL to fetch (relative or absolute)
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Response object
 * @throws Error if all retries fail
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3
): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(fullUrl, {
                ...options,
                signal: AbortSignal.timeout(10000), // 10 second timeout
            });

            // Return on success or client error (4xx)
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }

            // Server error (5xx) - will retry
            lastError = new Error(`Server error: ${response.status}`);
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));

            // Don't retry on abort
            if (err instanceof Error && err.name === 'AbortError') {
                throw err;
            }
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms
        if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

/**
 * Safe JSON fetch with retry logic.
 * Returns null on error instead of throwing.
 */
export async function fetchJson<T>(
    url: string,
    options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
    try {
        const response = await fetchWithRetry(url, options);

        if (!response.ok) {
            return { data: null, error: `HTTP ${response.status}` };
        }

        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`API Error (${url}):`, errorMessage);
        return { data: null, error: errorMessage };
    }
}

/**
 * Check if the backend API is available.
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/docs`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
        });
        return response.ok;
    } catch {
        return false;
    }
}
