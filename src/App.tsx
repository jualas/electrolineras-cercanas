import { useEffect, useMemo, useState } from 'react'

import { fetchNearbyStations } from './api/nearby'
import type { GeocodeResult, Station } from './api/types'
import { useAuthGate } from './auth/AuthGate'
import { NearestResultCard, PowerChips } from './components/NearestPanel'
import { PlaceSearch } from './components/PlaceSearch'
import { formatPowerRange } from './filters/powerPresets'
import { useLiveNearestCharger } from './hooks/useLiveNearestCharger'
import { usePowerFilter } from './hooks/usePowerFilter'
import { MapView } from './map/MapView'

export function App() {
  const auth = useAuthGate()
  const { filter, setPreset, setCustomRange, apiQuery } = usePowerFilter('trip')
  const [place, setPlace] = useState<GeocodeResult | null>(null)
  const [active, setActive] = useState(true)
  const [adHocOnly, setAdHocOnly] = useState(false)
  const [excludeParking, setExcludeParking] = useState(false)
  const [nearbyStations, setNearbyStations] = useState<Station[]>([])

  const nearest = useLiveNearestCharger({
    active: auth.authenticated && active,
    minKw: apiQuery.minKw,
    maxKw: apiQuery.maxKw,
    adHocOnly,
    excludeParking,
    referenceOverride: place ? { lat: place.lat, lon: place.lon } : null,
  })

  const powerHint = useMemo(() => formatPowerRange(filter), [filter])

  useEffect(() => {
    if (!auth.authenticated || !nearest.location) {
      setNearbyStations([])
      return
    }
    const controller = new AbortController()
    void fetchNearbyStations(
      {
        lat: nearest.location.lat,
        lon: nearest.location.lon,
        radiusM: 15_000,
        minKw: apiQuery.minKw,
        maxKw: apiQuery.maxKw,
        publicOpenOnly: true,
        adHocOnly,
        excludeParking,
        limit: 40,
      },
      { signal: controller.signal },
    )
      .then((payload) => setNearbyStations(payload.results.map((item) => item.station)))
      .catch(() => {
        if (!controller.signal.aborted) setNearbyStations([])
      })
    return () => controller.abort()
  }, [
    auth.authenticated,
    nearest.location?.lat,
    nearest.location?.lon,
    apiQuery.minKw,
    apiQuery.maxKw,
    adHocOnly,
    excludeParking,
  ])

  if (!auth.ready) {
    return (
      <div className="boot">
        <p className="brand">Electrolineras</p>
        <p>Cargando…</p>
      </div>
    )
  }

  if (!auth.authenticated) {
    return (
      <auth.LoginForm
        loginEnabled={auth.loginEnabled}
        error={auth.error}
        onLogin={auth.login}
        onToken={auth.saveToken}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="brand">Electrolineras</p>
          <h1>Cercanas</h1>
        </div>
        <div className="app-header__actions">
          <button
            type="button"
            className={`btn ${active ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setActive((value) => !value)}
          >
            {active ? 'Más cercano ON' : 'Más cercano OFF'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void auth.logout()}>
            Salir
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <PlaceSearch
            activeLabel={place?.label ?? null}
            onSelect={(item) => setPlace(item)}
            onClear={() => {
              setPlace(null)
              nearest.clearManualOverride()
            }}
          />

          <PowerChips filter={filter} onPresetChange={setPreset} onCustomRangeChange={setCustomRange} />

          <div className="toggles">
            <label>
              <input type="checkbox" checked={adHocOnly} onChange={(e) => setAdHocOnly(e.target.checked)} />
              Solo ad‑hoc / pago al momento
            </label>
            <label>
              <input
                type="checkbox"
                checked={excludeParking}
                onChange={(e) => setExcludeParking(e.target.checked)}
              />
              Excluir parking
            </label>
          </div>

          <NearestResultCard
            status={nearest.status}
            station={nearest.station}
            distanceKm={nearest.distanceKm}
            distanceM={nearest.distanceM}
            usedMinKw={nearest.usedMinKw}
            powerHint={powerHint}
            error={nearest.error}
            onRefresh={nearest.refresh}
          />
        </aside>

        <main className="map-pane">
          <MapView
            user={nearest.location ? { lat: nearest.location.lat, lon: nearest.location.lon } : null}
            station={nearest.station}
            nearby={nearbyStations}
          />
        </main>
      </div>
    </div>
  )
}
