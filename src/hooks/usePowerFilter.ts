import { useCallback, useEffect, useState } from 'react'

import {
  apiQueryFromFilter,
  loadStoredPowerFilter,
  presetToFilter,
  storePowerFilter,
  type PowerFilter,
  type PowerPresetId,
} from '../filters/powerPresets'

export function usePowerFilter(initialPreset: PowerPresetId = 'trip') {
  const [filter, setFilterState] = useState<PowerFilter>(() => {
    return loadStoredPowerFilter() ?? presetToFilter(initialPreset)
  })

  useEffect(() => {
    storePowerFilter(filter)
  }, [filter])

  const setPreset = useCallback((presetId: PowerPresetId) => {
    if (presetId === 'custom') {
      setFilterState((current) =>
        presetToFilter('custom', {
          minKw: current.minKw ?? 22,
          maxKw: current.maxKw ?? 150,
        }),
      )
      return
    }
    setFilterState(presetToFilter(presetId))
  }, [])

  const setCustomRange = useCallback((minKw: number, maxKw: number) => {
    setFilterState({
      presetId: 'custom',
      minKw: Math.min(minKw, maxKw),
      maxKw: Math.max(minKw, maxKw),
    })
  }, [])

  return {
    filter,
    setPreset,
    setCustomRange,
    apiQuery: apiQueryFromFilter(filter),
  }
}
