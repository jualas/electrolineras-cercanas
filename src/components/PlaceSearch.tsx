import { useState } from 'react'

import { fetchGeocodeSuggestions } from '../api/auth'
import type { GeocodeResult } from '../api/types'

type PlaceSearchProps = {
  onSelect: (place: GeocodeResult) => void
  onClear: () => void
  activeLabel: string | null
}

export function PlaceSearch({ onSelect, onClear, activeLabel }: PlaceSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async () => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setError('Escribe al menos 3 caracteres')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const results = await fetchGeocodeSuggestions(trimmed, 5)
      setSuggestions(results)
      if (results.length === 0) setError('Sin resultados')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al geocodificar')
      setSuggestions([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="place-search" aria-label="Buscar ubicación">
      <div className="place-search__row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ciudad, dirección…"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void search()
            }
          }}
        />
        <button type="button" className="btn btn--secondary" onClick={() => void search()} disabled={busy}>
          Buscar
        </button>
      </div>

      {activeLabel && (
        <div className="place-search__active">
          <span>Referencia: {activeLabel}</span>
          <button type="button" className="btn btn--ghost" onClick={onClear}>
            Usar GPS
          </button>
        </div>
      )}

      {error && <p className="place-search__error">{error}</p>}

      {suggestions.length > 0 && (
        <ul className="place-search__list">
          {suggestions.map((item) => (
            <li key={`${item.lat},${item.lon},${item.label}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item)
                  setSuggestions([])
                  setQuery(item.label)
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
