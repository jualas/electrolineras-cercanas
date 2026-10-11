import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/** Destino en Google Maps (navegación en coche / móvil). */
export function googleMapsDestinationUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`
}

/**
 * Formato que la app Tesla parsea al recibir un «Compartir» desde Maps:
 * nombre + https://maps.google.com/?q=lat,lon
 */
export function teslaMapsPlaceUrl(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat},${lon}`
}

export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

export async function copyCoordinates(lat: number, lon: number): Promise<boolean> {
  const text = formatCoordinates(lat, lon)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallthrough
  }
  return false
}

/** Texto idéntico al que Google Maps suele mandar a la app Tesla. */
export function teslaShareText(lat: number, lon: number, label?: string): string {
  const title = label?.trim() || 'Destino'
  const url = teslaMapsPlaceUrl(lat, lon)
  return `${title}\n${url}`
}

/**
 * Intent Android directo a la app Tesla (mismo ACTION_SEND que Maps → Tesla).
 * En WebView a veces falla; el camino fiable es Share.share (menú nativo).
 */
export function teslaAndroidShareIntentUrl(lat: number, lon: number, label?: string): string {
  const text = encodeURIComponent(teslaShareText(lat, lon, label))
  const subject = encodeURIComponent(label?.trim() || 'Destino')
  return (
    'intent:#Intent;' +
    'action=android.intent.action.SEND;' +
    'type=text/plain;' +
    'package=com.teslamotors.tesla;' +
    `S.android.intent.extra.SUBJECT=${subject};` +
    `S.android.intent.extra.TEXT=${text};` +
    'end'
  )
}

export type TeslaHandoffResult = 'share' | 'intent' | 'copied' | 'cancelled' | 'failed'

/**
 * Envía el destino a la app Tesla (y ella al coche), igual que Maps → Compartir → Tesla.
 * 1) Menú nativo Compartir (elige Tesla)
 * 2) Intent directo al package Tesla
 * 3) Copiar enlace Maps
 */
export async function openInTeslaApp(
  lat: number,
  lon: number,
  label?: string,
): Promise<TeslaHandoffResult> {
  const text = teslaShareText(lat, lon, label)
  const title = label?.trim() || 'Destino'
  const url = teslaMapsPlaceUrl(lat, lon)

  // 1) Share sheet nativo (Capacitor) — mismo flujo que Google Maps
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: 'Enviar a Tesla',
      })
      return 'share'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (/cancel|abort/i.test(message)) return 'cancelled'
      // fallthrough
    }
  }

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'share'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }

  // 2) Intent directo (Android)
  if (Capacitor.getPlatform() === 'android' || /Android/i.test(navigator.userAgent)) {
    try {
      const a = document.createElement('a')
      a.href = teslaAndroidShareIntentUrl(lat, lon, label)
      a.rel = 'noopener'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      a.remove()
      return 'intent'
    } catch {
      // fallthrough
    }
  }

  const copied = await copyCoordinates(lat, lon)
  return copied ? 'copied' : 'failed'
}
