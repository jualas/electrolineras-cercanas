export type PowerPresetId = 'slow' | 'semi' | 'fast' | 'trip' | 'ultra' | 'custom' | 'all'

export type PowerFilter = {
  presetId: PowerPresetId
  minKw?: number
  maxKw?: number
}

export type PowerPresetDefinition = {
  id: PowerPresetId
  label: string
  shortLabel: string
  minKw?: number
  maxKw?: number
}

export const POWER_PRESETS: PowerPresetDefinition[] = [
  { id: 'slow', label: 'Lento (AC)', shortLabel: 'Lento', minKw: 3, maxKw: 22 },
  { id: 'semi', label: 'Semi-rápido', shortLabel: 'Semi', minKw: 22, maxKw: 43 },
  { id: 'fast', label: 'Rápido (DC)', shortLabel: 'Rápido', minKw: 43, maxKw: 100 },
  { id: 'trip', label: 'Viaje (≥100)', shortLabel: 'Viaje', minKw: 100 },
  { id: 'ultra', label: 'Ultrarrápido (≥150)', shortLabel: 'Ultra', minKw: 150 },
  { id: 'all', label: 'Todo', shortLabel: 'Todo' },
  { id: 'custom', label: 'Personalizado', shortLabel: 'Custom' },
]

export const CUSTOM_KW_MIN = 0
export const CUSTOM_KW_MAX = 500
export const CUSTOM_KW_DEFAULT_MIN = 22
export const CUSTOM_KW_DEFAULT_MAX = 150

const STORAGE_KEY = 'electrolineras-cercanas-power-filter'

export function presetToFilter(
  presetId: PowerPresetId,
  custom?: { minKw: number; maxKw: number },
): PowerFilter {
  if (presetId === 'custom') {
    return {
      presetId: 'custom',
      minKw: custom?.minKw ?? CUSTOM_KW_DEFAULT_MIN,
      maxKw: custom?.maxKw ?? CUSTOM_KW_DEFAULT_MAX,
    }
  }
  if (presetId === 'all') return { presetId: 'all' }
  const preset = POWER_PRESETS.find((item) => item.id === presetId)
  if (!preset) return { presetId: 'all' }
  return { presetId, minKw: preset.minKw, maxKw: preset.maxKw }
}

export function formatPowerRange(filter: PowerFilter): string {
  if (filter.presetId === 'all' || (filter.minKw === undefined && filter.maxKw === undefined)) {
    return 'Todas las potencias'
  }
  const { minKw: min, maxKw: max } = filter
  if (min !== undefined && max !== undefined) return `${min}–${max} kW`
  if (min !== undefined) return `≥ ${min} kW`
  if (max !== undefined) return `≤ ${max} kW`
  return 'Todas las potencias'
}

export function loadStoredPowerFilter(): PowerFilter | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PowerFilter
    return parsed.presetId ? parsed : null
  } catch {
    return null
  }
}

export function storePowerFilter(filter: PowerFilter): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filter))
}

export function apiQueryFromFilter(filter: PowerFilter): { minKw?: number; maxKw?: number } {
  if (filter.presetId === 'all') return {}
  return { minKw: filter.minKw, maxKw: filter.maxKw }
}
