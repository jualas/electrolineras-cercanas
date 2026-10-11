import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { useCallback, useEffect, useRef, useState } from 'react'

export type DeviceLocationSnapshot = {
  lat: number
  lon: number
  accuracyM: number | null
  label: string
  source: 'gps' | 'manual'
  updatedAt: number
}

export type DeviceLocationStatus = 'idle' | 'loading' | 'active' | 'error' | 'unsupported'

type Options = {
  autoStart?: boolean
  watch?: boolean
  gpsLabel?: string
}

function formatLabel(base: string, accuracyM: number | null): string {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return base
  if (accuracyM < 1000) return `${base} · ±${Math.round(accuracyM)} m`
  return `${base} · ±${(accuracyM / 1000).toFixed(1)} km`
}

export function useDeviceLocation(options: Options = {}) {
  const { autoStart = false, watch = false, gpsLabel = 'Mi ubicación' } = options
  const [location, setLocation] = useState<DeviceLocationSnapshot | null>(null)
  const [status, setStatus] = useState<DeviceLocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const manualOverrideRef = useRef(false)
  const watchIdRef = useRef<string | number | null>(null)
  const native = Capacitor.isNativePlatform()

  const applyGps = useCallback(
    (lat: number, lon: number, accuracy: number | null, timestamp: number) => {
      if (manualOverrideRef.current) return
      setLocation({
        lat,
        lon,
        accuracyM: accuracy,
        label: formatLabel(gpsLabel, accuracy),
        source: 'gps',
        updatedAt: timestamp,
      })
      setStatus('active')
      setError(null)
    },
    [gpsLabel],
  )

  const stopWatch = useCallback(async () => {
    const id = watchIdRef.current
    if (id == null) return
    watchIdRef.current = null
    if (native && typeof id === 'string') {
      await Geolocation.clearWatch({ id })
    } else if (typeof id === 'number') {
      navigator.geolocation.clearWatch(id)
    }
  }, [native])

  const handleError = useCallback((message: string) => {
    setError(message)
    setStatus('error')
  }, [])

  const startWatch = useCallback(async () => {
    setStatus('loading')
    setError(null)
    await stopWatch()

    if (native) {
      try {
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') {
          handleError('Permiso de ubicación denegado. Actívalo en Ajustes.')
          return
        }
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 20_000 },
          (position, err) => {
            if (err || !position) {
              handleError(err?.message ?? 'No se pudo obtener GPS')
              return
            }
            applyGps(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy ?? null,
              position.timestamp,
            )
          },
        )
        watchIdRef.current = id
      } catch (err) {
        handleError(err instanceof Error ? err.message : 'GPS no disponible')
      }
      return
    }

    if (!navigator.geolocation) {
      setStatus('unsupported')
      setError('Geolocalización no disponible')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) =>
        applyGps(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
          position.timestamp,
        ),
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Permiso de ubicación denegado.'
            : geoError.code === geoError.TIMEOUT
              ? 'Tiempo agotado al obtener GPS.'
              : 'No se pudo obtener la ubicación GPS'
        handleError(message)
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 },
    )
  }, [applyGps, handleError, native, stopWatch])

  const refreshGps = useCallback(async () => {
    manualOverrideRef.current = false
    setStatus('loading')
    setError(null)

    if (native) {
      try {
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') {
          handleError('Permiso de ubicación denegado. Actívalo en Ajustes.')
          return
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20_000,
        })
        applyGps(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? null,
          position.timestamp,
        )
        if (watch) await startWatch()
      } catch (err) {
        handleError(err instanceof Error ? err.message : 'GPS no disponible')
      }
      return
    }

    if (!navigator.geolocation) {
      setStatus('unsupported')
      setError('Geolocalización no disponible')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyGps(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
          position.timestamp,
        )
        if (watch) void startWatch()
      },
      () => handleError('No se pudo obtener la ubicación GPS'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )
  }, [applyGps, handleError, native, startWatch, watch])

  const setManualLocation = useCallback(
    (point: { lat: number; lon: number; label: string }) => {
      manualOverrideRef.current = true
      void stopWatch()
      setLocation({
        lat: point.lat,
        lon: point.lon,
        accuracyM: null,
        label: point.label,
        source: 'manual',
        updatedAt: Date.now(),
      })
      setStatus('active')
      setError(null)
    },
    [stopWatch],
  )

  const clearManualOverride = useCallback(() => {
    manualOverrideRef.current = false
    void refreshGps()
  }, [refreshGps])

  useEffect(() => {
    if (!autoStart) {
      void stopWatch()
      return undefined
    }
    if (watch) void startWatch()
    else void refreshGps()
    return () => {
      void stopWatch()
    }
  }, [autoStart, watch, refreshGps, startWatch, stopWatch])

  return {
    location,
    status,
    error,
    isGpsActive: location?.source === 'gps' && status === 'active',
    refreshGps,
    setManualLocation,
    clearManualOverride,
  }
}
