import { fetchApi } from './client'

export type ReliabilityLevel = 'high' | 'medium' | 'low'

export type StationReliabilityResponse = {
  station_id: string
  level: ReliabilityLevel
  score: number
  summary: string
  warnings: string[]
  connector_count: number
  single_connector: boolean
  isolation_radius_km: number
  isolated_area: boolean
  backup_stations_in_radius: number
  backup_station_km?: number | null
  backup_station_label?: string | null
  reve_status?: string | null
  google_checked: boolean
  google_matched: boolean
  google_status?: string | null
  google_available_count?: number | null
  google_out_of_service_count?: number | null
  google_total_connectors?: number | null
  google_rating?: number | null
  google_rating_count?: number | null
  google_maps_uri?: string | null
}

export async function fetchStationReliability(
  stationId: string,
  verifyGoogle = true,
): Promise<StationReliabilityResponse> {
  const qs = `verify_google=${verifyGoogle ? 'true' : 'false'}`
  return fetchApi<StationReliabilityResponse>(
    `/api/v1/stations/${encodeURIComponent(stationId)}/reliability?${qs}`,
  )
}
