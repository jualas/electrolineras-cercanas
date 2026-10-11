import { fetchApi } from './client'
import type { NearbyResponse } from './types'

export type NearbyQuery = {
  lat?: number
  lon?: number
  q?: string
  radiusM?: number
  minKw?: number
  maxKw?: number
  publicOpenOnly?: boolean
  excludeParking?: boolean
  adHocOnly?: boolean
  limit?: number
}

export async function fetchNearbyStations(
  query: NearbyQuery,
  init?: RequestInit,
): Promise<NearbyResponse> {
  const params = new URLSearchParams()
  if (query.lat !== undefined && query.lon !== undefined) {
    params.set('lat', String(query.lat))
    params.set('lon', String(query.lon))
  }
  if (query.q) params.set('q', query.q.trim())
  if (query.radiusM !== undefined) params.set('radius_m', String(query.radiusM))
  if (query.minKw !== undefined) params.set('min_kw', String(query.minKw))
  if (query.maxKw !== undefined) params.set('max_kw', String(query.maxKw))
  if (query.publicOpenOnly) params.set('public_open_only', 'true')
  if (query.excludeParking) params.set('exclude_parking', 'true')
  if (query.adHocOnly) params.set('ad_hoc_only', 'true')
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  return fetchApi<NearbyResponse>(`/api/v1/stations/nearby?${params.toString()}`, init)
}

export function formatDistanceKm(distanceKm: number, distanceM: number): string {
  if (distanceKm < 1) return `${Math.round(distanceM)} m`
  return `${distanceKm.toFixed(1)} km`
}

export function stationLabel(station: {
  site_name: string | null
  operator: string | null
  location: { address?: string | null }
}): string {
  return station.site_name?.trim() || station.operator?.trim() || station.location.address?.trim() || 'Cargador'
}
