import { useState } from 'react'

import { stationLabel } from '../api/nearby'
import { fetchStationReliability, type StationReliabilityResponse } from '../api/reliability'
import type { Station } from '../api/types'
import {
  copyCoordinates,
  googleMapsDestinationUrl,
  openInTeslaApp,
} from '../navigation/externalMaps'

/** Navegar (Google Maps), enviar al Tesla, verificar fiabilidad en vivo y copiar coordenadas. */
export function StationActions({ station }: { station: Station }) {
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [teslaState, setTeslaState] = useState<
    'idle' | 'ok' | 'copied' | 'cancelled' | 'error'
  >('idle')
  const [reliability, setReliability] = useState<StationReliabilityResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)

  const handleCheckReliability = async () => {
    setChecking(true)
    setCheckError(null)
    try {
      const data = await fetchStationReliability(station.id, true)
      setReliability(data)
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'No se pudo comprobar')
    } finally {
      setChecking(false)
    }
  }

  const teslaLabel =
    teslaState === 'ok'
      ? 'Elige Tesla…'
      : teslaState === 'copied'
        ? 'Coords copiadas'
        : teslaState === 'cancelled'
          ? 'Cancelado'
          : teslaState === 'error'
            ? 'No se pudo enviar'
            : 'Enviar al Tesla'

  return (
    <div className="result-card__actions">
      <a
        className="btn btn--primary"
        href={googleMapsDestinationUrl(station.location.lat, station.location.lon)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Navegar (Google Maps)
      </a>
      <button
        type="button"
        className="btn btn--secondary"
        title="Abre Compartir → elige Tesla (igual que desde Google Maps). La app Tesla manda el destino al coche."
        onClick={() => {
          void openInTeslaApp(station.location.lat, station.location.lon, stationLabel(station)).then(
            (result) => {
              if (result === 'share' || result === 'intent') {
                setTeslaState('ok')
              } else if (result === 'copied') {
                setTeslaState('copied')
              } else if (result === 'cancelled') {
                setTeslaState('cancelled')
              } else {
                setTeslaState('error')
              }
              window.setTimeout(() => setTeslaState('idle'), 2500)
            },
          )
        }}
      >
        {teslaLabel}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        disabled={checking}
        onClick={() => void handleCheckReliability()}
      >
        {checking ? 'Verificando…' : reliability ? 'Re-verificar estado' : 'Verificar estado'}
      </button>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={() => {
          void copyCoordinates(station.location.lat, station.location.lon).then((ok) => {
            setCopyState(ok ? 'ok' : 'error')
            window.setTimeout(() => setCopyState('idle'), 1500)
          })
        }}
      >
        {copyState === 'ok' ? 'Copiado' : copyState === 'error' ? 'Error' : 'Copiar coords'}
      </button>
      {reliability && (
        <div
          style={{
            flexBasis: '100%',
            marginTop: '0.4rem',
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            background:
              reliability.level === 'high'
                ? '#ecfdf5'
                : reliability.level === 'low'
                  ? '#fef2f2'
                  : '#fffbeb',
            color:
              reliability.level === 'high'
                ? '#065f46'
                : reliability.level === 'low'
                  ? '#991b1b'
                  : '#92400e',
          }}
        >
          <strong>{reliability.summary}</strong>
          {reliability.google_matched && (
            <div style={{ marginTop: '0.2rem' }}>
              Google:
              {reliability.google_available_count != null
                ? ` ${reliability.google_available_count}/${reliability.google_total_connectors ?? '?'} libres`
                : ' sin conteo libre'}
              {reliability.google_out_of_service_count ? ` · ${reliability.google_out_of_service_count} averiado(s)` : ''}
              {reliability.google_rating != null ? ` · ${reliability.google_rating.toFixed(1)}/5` : ''}
            </div>
          )}
          {reliability.isolated_area ? (
            <div style={{ marginTop: '0.2rem', fontWeight: 600 }}>
              Zona aislada: sin otro cargador rápido en {reliability.isolation_radius_km.toFixed(0)} km.
            </div>
          ) : reliability.backup_station_km != null ? (
            <div style={{ marginTop: '0.2rem' }}>
              Plan B: {reliability.backup_station_label ?? 'alternativa'} a {reliability.backup_station_km.toFixed(1)} km.
            </div>
          ) : null}
          {reliability.google_maps_uri && (
            <div style={{ marginTop: '0.25rem' }}>
              <a href={reliability.google_maps_uri} target="_blank" rel="noopener noreferrer">
                Ver reseñas en Google Maps
              </a>
            </div>
          )}
        </div>
      )}
      {checkError && (
        <p className="result-card__error" style={{ flexBasis: '100%', marginTop: '0.25rem' }}>
          {checkError}
        </p>
      )}
    </div>
  )
}
