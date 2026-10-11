import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { Station } from '../api/types'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'

type MapViewProps = {
  user?: { lat: number; lon: number } | null
  station?: Station | null
  nearby?: Station[]
  onSelectStation?: (station: Station) => void
}

export function MapView({ user, station, nearby = [], onSelectStation }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<Marker | null>(null)
  const stationMarkerRef = useRef<Marker | null>(null)
  const nearbyMarkersRef = useRef<Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-3.7, 40.4],
      zoom: 5.5,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (user) {
      if (!userMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'map-marker map-marker--user'
        userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([user.lon, user.lat]).addTo(map)
      } else {
        userMarkerRef.current.setLngLat([user.lon, user.lat])
      }
    }

    if (station) {
      if (!stationMarkerRef.current) {
        const el = document.createElement('div')
        el.className = 'map-marker map-marker--nearest'
        stationMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([station.location.lon, station.location.lat])
          .addTo(map)
      } else {
        stationMarkerRef.current.setLngLat([station.location.lon, station.location.lat])
      }
    } else if (stationMarkerRef.current) {
      stationMarkerRef.current.remove()
      stationMarkerRef.current = null
    }

    for (const marker of nearbyMarkersRef.current) marker.remove()
    nearbyMarkersRef.current = nearby
      .filter((item) => item.id !== station?.id)
      .slice(0, 40)
      .map((item) => {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'map-marker map-marker--nearby'
        el.title = item.site_name ?? item.operator ?? 'Cargador'
        el.addEventListener('click', () => onSelectStation?.(item))
        return new maplibregl.Marker({ element: el })
          .setLngLat([item.location.lon, item.location.lat])
          .addTo(map)
      })

    if (user && station) {
      const bounds = new maplibregl.LngLatBounds()
      bounds.extend([user.lon, user.lat])
      bounds.extend([station.location.lon, station.location.lat])
      map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 600 })
    } else if (user) {
      map.easeTo({ center: [user.lon, user.lat], zoom: Math.max(map.getZoom(), 12), duration: 500 })
    } else if (station) {
      map.easeTo({
        center: [station.location.lon, station.location.lat],
        zoom: Math.max(map.getZoom(), 13),
        duration: 500,
      })
    }
  }, [user, station, nearby, onSelectStation])

  return <div ref={containerRef} className="map-shell" role="application" aria-label="Mapa de cargadores" />
}
