/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'

import { loadGoogleMapsApi, type GoogleMapsApi } from './googleMapsLoader'
import type { MapViewProps } from './MapView'

function clearMarkers(list: any[]): void {
  for (const item of list) {
    item?.setMap?.(null)
  }
  list.length = 0
}

export function GoogleMapView({
  user,
  station,
  nearby = [],
  onSelectStation,
  route = null,
  followNearest = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gmRef = useRef<GoogleMapsApi | null>(null)
  const mapRef = useRef<any | null>(null)
  const userMarkerRef = useRef<any | null>(null)
  const stationMarkerRef = useRef<any | null>(null)
  const nearbyMarkersRef = useRef<any[]>([])
  const routeLinesRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    void loadGoogleMapsApi()
      .then((gm) => {
        if (cancelled || !containerRef.current) return
        const map = new gm.Map(containerRef.current, {
          center: { lat: 40.4, lng: -3.7 },
          zoom: 6,
          mapTypeId: 'roadmap',
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        })
        gmRef.current = gm
        mapRef.current = map
        setMapReady(true)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('No se pudo cargar Google Maps', err)
        setMapError('No se pudo cargar Google Maps. Los resultados siguen en la lista.')
      })

    return () => {
      cancelled = true
      userMarkerRef.current?.setMap?.(null)
      userMarkerRef.current = null
      stationMarkerRef.current?.setMap?.(null)
      stationMarkerRef.current = null
      clearMarkers(nearbyMarkersRef.current)
      clearMarkers(routeLinesRef.current)
      if (mapRef.current && gmRef.current) {
        gmRef.current.event.clearInstanceListeners(mapRef.current)
      }
      mapRef.current = null
      gmRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const gm = gmRef.current
    if (!mapReady || !map || !gm) return

    if (user) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new gm.Marker({
          map,
          position: { lat: user.lat, lng: user.lon },
          zIndex: 80,
          title: 'Tu ubicación',
          icon: {
            path: gm.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        })
      } else {
        userMarkerRef.current.setPosition({ lat: user.lat, lng: user.lon })
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
      userMarkerRef.current = null
    }

    if (station) {
      const pos = { lat: station.location.lat, lng: station.location.lon }
      if (!stationMarkerRef.current) {
        stationMarkerRef.current = new gm.Marker({
          map,
          position: pos,
          zIndex: 90,
          title: station.site_name ?? station.operator ?? 'Cargador elegido',
          icon: {
            path: gm.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: '#16a34a',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        })
      } else {
        stationMarkerRef.current.setPosition(pos)
      }
    } else if (stationMarkerRef.current) {
      stationMarkerRef.current.setMap(null)
      stationMarkerRef.current = null
    }

    clearMarkers(nearbyMarkersRef.current)
    for (const item of nearby.filter((s) => s.id !== station?.id).slice(0, 50)) {
      const marker = new gm.Marker({
        map,
        position: { lat: item.location.lat, lng: item.location.lon },
        zIndex: 40,
        title: item.site_name ?? item.operator ?? 'Cargador',
        icon: {
          path: gm.SymbolPath.CIRCLE,
          scale: 7.5,
          fillColor: '#0d7ea6',
          fillOpacity: 0.92,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => onSelectStation?.(item))
      nearbyMarkersRef.current.push(marker)
    }

    if (!followNearest) {
      if (station) {
        map.panTo({ lat: station.location.lat, lng: station.location.lon })
        if (Number(map.getZoom?.() ?? 6) < 12) map.setZoom(12)
      }
    } else if (user && station) {
      const bounds = new gm.LatLngBounds()
      bounds.extend({ lat: user.lat, lng: user.lon })
      bounds.extend({ lat: station.location.lat, lng: station.location.lon })
      map.fitBounds(bounds, 72)
    } else if (user) {
      map.panTo({ lat: user.lat, lng: user.lon })
      if (Number(map.getZoom?.() ?? 6) < 12) map.setZoom(12)
    } else if (station) {
      map.panTo({ lat: station.location.lat, lng: station.location.lon })
      if (Number(map.getZoom?.() ?? 6) < 13) map.setZoom(13)
    }
  }, [mapReady, user, station, nearby, onSelectStation, followNearest])

  useEffect(() => {
    const map = mapRef.current
    const gm = gmRef.current
    if (!mapReady || !map || !gm) return

    clearMarkers(routeLinesRef.current)
    if (!route || route.coordinates.length < 2) return

    const path = route.coordinates.map(([lon, lat]) => ({ lat, lng: lon }))
    const casing = new gm.Polyline({
      map,
      path,
      strokeColor: '#ffffff',
      strokeOpacity: 0.92,
      strokeWeight: 8,
      zIndex: 10,
    })
    const line = new gm.Polyline({
      map,
      path,
      strokeColor: '#2563eb',
      strokeOpacity: 0.95,
      strokeWeight: 5,
      zIndex: 11,
    })
    routeLinesRef.current.push(casing, line)

    const bounds = new gm.LatLngBounds()
    for (const pt of path) bounds.extend(pt)
    map.fitBounds(bounds, 48)
  }, [mapReady, route])

  return (
    <div className="map-shell-wrap">
      <div ref={containerRef} className="map-shell" role="application" aria-label="Mapa de cargadores (Google Maps)" />
      {mapError && (
        <p className="map-error" role="alert">
          {mapError}
        </p>
      )}
    </div>
  )
}
