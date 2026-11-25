import { fetchApi } from './client'
import type { LatLon, Station } from './types'

/** fastest = prioriza la velocidad de las vías; shortest = menos km; eco = menor consumo VE. */
export type RoutePreference = 'fastest' | 'shortest' | 'eco'

export type RouteLineGeometry = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type AlongRouteStationResult = {
  station: Station
  /** Desvío aproximado desde la ruta hasta el cargador (km). */
  deviation_km: number
  /** Km recorridos por la ruta desde el origen hasta el punto más cercano al cargador. */
  route_distance_km: number
  extra_minutes: number
  wrong_side: boolean
}

export type AlongRouteResponse = {
  origin: LatLon
  destination: LatLon
  corridor_km: number
  route_distance_km: number
  route_duration_minutes: number
  route_geometry: RouteLineGeometry | null
  route_preference: RoutePreference | 'conventional'
  avoid_highways: boolean
  results: AlongRouteStationResult[]
}

export type AlongRouteQuery = {
  origin: LatLon
  destination: LatLon
  routePreference: RoutePreference
  avoidTolls: boolean
  minKw?: number
  maxKw?: number
  corridorKm?: number
  limit?: number
}

/** Máximo que admite /stations/along-route (MAX_ROUTE_RESULTS_LIMIT). */
export const ALONG_ROUTE_LIMIT_MAX = 50

export async function fetchAlongRoute(
  query: AlongRouteQuery,
  init?: RequestInit,
): Promise<AlongRouteResponse> {
  const params = new URLSearchParams({
    origin_lat: String(query.origin.lat),
    origin_lon: String(query.origin.lon),
    dest_lat: String(query.destination.lat),
    dest_lon: String(query.destination.lon),
    // Sin filtro de potencia la API aplicaría ≥100 kW por defecto.
    min_kw: String(query.minKw ?? 0),
    route_preference: query.routePreference,
    avoid_highways: query.avoidTolls ? 'true' : 'false',
    include_route: 'true',
    limit: String(query.limit ?? ALONG_ROUTE_LIMIT_MAX),
  })
  if (query.maxKw !== undefined) params.set('max_kw', String(query.maxKw))
  if (query.corridorKm !== undefined) params.set('corridor_km', String(query.corridorKm))
  return fetchApi<AlongRouteResponse>(`/api/v1/stations/along-route?${params.toString()}`, init)
}

export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins} min`
  return `${hours} h ${String(mins).padStart(2, '0')} min`
}
