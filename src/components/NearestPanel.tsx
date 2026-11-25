import { formatDistanceKm, stationLabel } from '../api/nearby'
import type { Station } from '../api/types'
import {
  CUSTOM_KW_MAX,
  CUSTOM_KW_MIN,
  formatPowerRange,
  POWER_PRESETS,
  type PowerFilter,
  type PowerPresetId,
} from '../filters/powerPresets'
import type { LiveNearestStatus } from '../hooks/useLiveNearestCharger'
import { StationActions } from './StationActions'

type PowerChipsProps = {
  filter: PowerFilter
  onPresetChange: (id: PowerPresetId) => void
  onCustomRangeChange: (minKw: number, maxKw: number) => void
}

export function PowerChips({ filter, onPresetChange, onCustomRangeChange }: PowerChipsProps) {
  return (
    <section className="power-chips" aria-label="Filtro de potencia">
      <p className="power-chips__hint">{formatPowerRange(filter)}</p>
      <div className="chip-row">
        {POWER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`chip ${filter.presetId === preset.id ? 'chip--active' : ''}`}
            onClick={() => onPresetChange(preset.id)}
          >
            {preset.shortLabel}
          </button>
        ))}
      </div>
      {filter.presetId === 'custom' && (
        <div className="custom-range">
          <label>
            Mín {filter.minKw ?? CUSTOM_KW_MIN}
            <input
              type="range"
              min={CUSTOM_KW_MIN}
              max={CUSTOM_KW_MAX}
              value={filter.minKw ?? CUSTOM_KW_MIN}
              onChange={(e) => onCustomRangeChange(Number(e.target.value), filter.maxKw ?? CUSTOM_KW_MAX)}
            />
          </label>
          <label>
            Máx {filter.maxKw ?? CUSTOM_KW_MAX}
            <input
              type="range"
              min={CUSTOM_KW_MIN}
              max={CUSTOM_KW_MAX}
              value={filter.maxKw ?? CUSTOM_KW_MAX}
              onChange={(e) => onCustomRangeChange(filter.minKw ?? CUSTOM_KW_MIN, Number(e.target.value))}
            />
          </label>
        </div>
      )}
    </section>
  )
}

type ResultCardProps = {
  status: LiveNearestStatus
  station: Station | null
  distanceKm: number | null
  distanceM: number | null
  usedMinKw: number | null
  powerHint: string
  error: string | null
  onRefresh: () => void
}

export function NearestResultCard({
  status,
  station,
  distanceKm,
  distanceM,
  usedMinKw,
  powerHint,
  error,
  onRefresh,
}: ResultCardProps) {
  const dist =
    distanceKm != null && distanceM != null ? formatDistanceKm(distanceKm, distanceM) : null

  return (
    <section className="result-card" aria-label="Resultado más cercano">
      <header className="result-card__head">
        <h2>Más cercano</h2>
        <button type="button" className="btn btn--ghost" onClick={onRefresh}>
          Actualizar
        </button>
      </header>
      <p className="result-card__hint">Filtro: {powerHint}</p>

      {status === 'locating' && <p className="result-card__hint">Obteniendo GPS…</p>}
      {status === 'loading' && !station && <p className="result-card__hint">Buscando cargador…</p>}
      {status === 'empty' && (
        <p className="result-card__hint">
          No hay cargadores con {powerHint}
          {usedMinKw != null ? ` (probado ≥${usedMinKw} kW)` : ''} en el radio.
        </p>
      )}
      {error && <p className="result-card__error">{error}</p>}

      {station && (
        <>
          <div className="result-card__body">
            <p className="result-card__title">{stationLabel(station)}</p>
            <p className="result-card__meta">
              {station.operator ?? '—'} · {station.max_power_kw.toFixed(0)} kW
              {dist ? ` · a ${dist}` : ''}
            </p>
            {station.location.address && <p className="result-card__addr">{station.location.address}</p>}
          </div>
          <StationActions station={station} />
        </>
      )}
    </section>
  )
}
