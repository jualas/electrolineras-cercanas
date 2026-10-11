import { fetchApi } from './client'
import type { AuthConfigResponse, AuthSessionResponse, GeocodeResult } from './types'

export async function fetchAuthConfig(): Promise<AuthConfigResponse> {
  return fetchApi<AuthConfigResponse>('/api/v1/auth/config')
}

export async function fetchAuthSession(): Promise<AuthSessionResponse> {
  return fetchApi<AuthSessionResponse>('/api/v1/auth/session')
}

export async function loginWithTotp(username: string, totpCode: string): Promise<void> {
  await fetchApi('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, totp_code: totpCode }),
  })
}

export async function logoutSession(): Promise<void> {
  await fetchApi('/api/v1/auth/logout', { method: 'POST' })
}

export async function fetchGeocodeSuggestions(query: string, limit = 5): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  })
  return fetchApi<GeocodeResult[]>(`/api/v1/meta/geocode?${params.toString()}`)
}
