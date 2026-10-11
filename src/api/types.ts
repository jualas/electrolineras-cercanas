export type LatLon = {
  lat: number
  lon: number
}

export type Station = {
  id: string
  source: string
  country: string
  site_name: string | null
  operator: string | null
  location: LatLon & { address?: string | null }
  connectors: { connector_type: string; power_kw: number }[]
  max_power_kw: number
  access: string | null
  raw_ref: string
  dynamic_status?: string | null
  dynamic_price_eur_kwh?: number | null
}

export type NearbyStationResult = {
  station: Station
  distance_m: number
  distance_km: number
}

export type NearbyResponse = {
  reference: LatLon
  reference_label: string | null
  radius_m: number
  count: number
  results: NearbyStationResult[]
}

export type GeocodeResult = {
  lat: number
  lon: number
  label: string
}

export type AuthSessionResponse = {
  authenticated: boolean
  username?: string | null
  private_stack_enabled?: boolean
}

export type AuthConfigResponse = {
  private_stack_enabled: boolean
  login_enabled: boolean
  token_fallback_enabled?: boolean
}
