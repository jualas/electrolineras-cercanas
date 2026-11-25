import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { stationLabel } from '../api/nearby'
import {
  fetchAlongRoute,
  formatDuration,
  type AlongRouteResponse,
  type RoutePreference,
} from '../api/route'
import type { GeocodeResult, LatLon } from '../api/types'
import { useDeviceLocation } from '../hooks/useDeviceLocation'
import { PlaceSearch } from './PlaceSearch'
import { StationActions } from './StationActions'

const PREFERENCES: { id: RoutePreference; label: string; hint: string }[] = [
  { id: 'fastest', label: 'Más rápida', hint: 'Prioriza la velocidad de las vías (autovías)' },
  { id: 'shortest', label: 'Menos km', hint: 'La ruta más corta en distancia' },
  { id: 'eco', label: 'Eco VE', hint: 'Menor consumo eléctrico (batería y desniveles)' },
]

type RoutePanelProps = {
  minKw?: number
  maxKw?: number
  powerHint: string
  /** Filtro de potencia (compartido con el modo Cercano). */
  filters?: ReactNode
  result: AlongRouteResponse | null
  onResult: (result: AlongRouteResponse | null) => void
  selectedStationId: string | null
  onSelectStation: (stationId: string | null) => void
  /** Origen efectivo (GPS o lugar elegido) para pintarlo en el mapa. */
  onOriginChange: (origin: LatLon | null) => void
}

export function RoutePanel({
  minKw,
  maxKw,
  powerHint,
  filters,
  result,
  onResult,
  selectedStationId,
  onSelectStation,
  onOriginChange,
}: RoutePanelProps) {
  const [originPlace, setOriginPlace] = useState<GeocodeResult | null>(null)
  const [destination, setDestination] = useState<GeocodeResult | null>(null)
  const [preference, setPreference] = useState<RoutePreference>('fastest')
  const [avoidTolls, setAvoidTolls] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const gps = useDeviceLocation({ autoStart: originPlace == null, watch: false, gpsLabel: 'Mi ubicación' })
  const origin: LatLon | null = originPlace
    ? { lat: originPlace.lat, lon: originPlace.lon }
    : gps.location
      ? { lat: gps.location.lat, lon: gps.location.lon }
      : null

  useEffect(() => {
    // origin es un objeto nuevo en cada render: dependemos solo de sus coordenadas.
    onOriginChange(origin ? { lat: origin.lat, lon: origin.lon } : null)
  }, [origin?.lat, origin?.lon, onOriginChange])

  useEffect(() => () => abortRef.current?.abort(), [])

  const stations = useMemo(
    () => [...(result?.results ?? [])].sort((a, b) => a.route_distance_km - b.route_distance_km),
    [result],
  )

  const calculate = async (nextPreference = preference, nextAvoidTolls = avoidTolls) => {
    if (!origin) {
      setError(gps.error ?? 'Esperando la ubicación de salida')
      return
    }
    if (!destination) {
      setError('Elige un destino')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setError(null)
    onSelectStation(null)
    try {
      const response = await fetchAlongRoute(
        {
          origin,
          destination: { lat: destination.lat, lon: destination.lon },
          routePreference: nextPreference,
          avoidTolls: nextAvoidTolls,
          minKw,
          maxKw,
        },
        { signal: controller.signal },
      )
      onResult(response)
    } catch (err) {
      if (controller.signal.aborted) return
      onResult(null)
      setError(err instanceof Error ? err.message : 'No se pudo calcular la ruta')
    } finally {
      if (abortRef.current === controller) setBusy(false)
    }
  }

  const changeRouteOption = (nextPreference: RoutePreference, nextAvoidTolls: boolean) => {
    setPreference(nextPreference)
    setAvoidTolls(nextAvoidTolls)
    // Con una ruta ya calculada, recalcular al cambiar la opción.
    if (result) void calculate(nextPreference, nextAvoidTolls)
  }

  const originText = originPlace
    ? null
    : gps.status === 'loading'
      ? 'Obteniendo GPS…'
      : gps.location
        ? gps.location.label
        : gps.error ?? 'Sin GPS: elige un origen'

  return (
    <>
      <PlaceSearch
        title="Salida"
        ariaLabel="Origen de la ruta"
        placeholder="Mi ubicación (GPS) o busca un lugar"
        activePrefix="Salida"
        activeLabel={originPlace?.label ?? null}
        onSelect={(place) => {
          setOriginPlace(place)
          onResult(null)
        }}
        onClear={() => {
          setOriginPlace(null)
          onResult(null)
          void gps.refreshGps()
        }}
      />
      {originText && <p className="route-origin-hint">Salida: {originText}</p>}

      <PlaceSearch
        title="Destino"
        ariaLabel="Destino de la ruta"
        placeholder="Ciudad, dirección…"
        activePrefix="Destino"
        clearLabel="Quitar"
        activeLabel={destination?.label ?? null}
        onSelect={(place) => {
          setDestination(place)
          onResult(null)
        }}
        onClear={() => {
          setDestination(null)
          onResult(null)
        }}
      />

      {filters}

      <section className="route-options" aria-label="Tipo de ruta">
        <div className="chip-row">
          {PREFERENCES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${preference === item.id ? 'chip--active' : ''}`}
              aria-pressed={preference === item.id}
              title={item.hint}
              disabled={busy}
              onClick={() => changeRouteOption(item.id, avoidTolls)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="result-card__hint">{PREFERENCES.find((item) => item.id === preference)?.hint}</p>
        <label className="route-options__toggle">
          <input
            type="checkbox"
            checked={avoidTolls}
            disabled={busy}
            onChange={(e) => changeRouteOption(preference, e.target.checked)}
          />
          Evitar peajes
        </label>
        <button
          type="button"
          className="btn btn--primary route-options__go"
          disabled={busy || !destination || !origin}
          onClick={() => void calculate()}
        >
          {busy ? 'Calculando…' : result ? 'Recalcular ruta' : 'Calcular ruta'}
        </button>
        {error && <p className="result-card__error">{error}</p>}
      </section>

      {result && (
        <section className="result-card" aria-label="Cargadores en la ruta">
          <header className="result-card__head">
            <h2>Cargadores en la ruta</h2>
          </header>
          <p className="result-card__hint">
            {result.route_distance_km.toFixed(0)} km · {formatDuration(result.route_duration_minutes)} ·{' '}
            {stations.length} cargadores ({powerHint}, a ≤{result.corridor_km.toFixed(0)} km de la vía)
          </p>
          {stations.length === 0 && (
            <p className="result-card__hint">No hay cargadores con este filtro de potencia en el recorrido.</p>
          )}
          <ol className="route-stations">
            {stations.map((item) => {
              const selected = item.station.id === selectedStationId
              return (
                <li key={item.station.id} className={selected ? 'route-stations__item--selected' : undefined}>
                  <button
                    type="button"
                    className="route-stations__select"
                    aria-expanded={selected}
                    onClick={() => onSelectStation(selected ? null : item.station.id)}
                  >
                    <span className="route-stations__km">km {item.route_distance_km.toFixed(0)}</span>
                    <span className="route-stations__main">
                      <span className="route-stations__name">{stationLabel(item.station)}</span>
                      <span className="route-stations__meta">
                        {item.station.operator ?? '—'} · {item.station.max_power_kw.toFixed(0)} kW · desvío{' '}
                        {item.deviation_km.toFixed(1)} km
                        {item.extra_minutes >= 1 ? ` (+${Math.round(item.extra_minutes)} min)` : ''}
                      </span>
                    </span>
                  </button>
                  {selected && (
                    <div className="route-stations__detail">
                      {item.station.location.address && (
                        <p className="result-card__addr">{item.station.location.address}</p>
                      )}
                      <StationActions station={item.station} />
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </>
  )
}
