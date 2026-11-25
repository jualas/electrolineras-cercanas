import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'

import type { RouteLineGeometry } from '../api/route'
import type { Station } from '../api/types'
import { GoogleMapView } from './GoogleMapView'
import { shouldUseGoogleMaps } from './googleMapsLoader'

// maplibre 6 carga su worker desde un fichero aparte que Vite no copia por sí solo.
maplibregl.setWorkerUrl(workerUrl)

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const ROUTE_SOURCE = 'route'
const ROUTE_LAYER = 'route-line'
const ROUTE_CASING_LAYER = 'route-line-casing'

export type MapViewProps = {
  user?: { lat: number; lon: number } | null
  station?: Station | null
  nearby?: Station[]
  onSelectStation?: (station: Station) => void
  /** Trazado de la ruta (modo Ruta). */
  route?: RouteLineGeometry | null
  /**
   * true (modo Cercano): la cámara encuadra usuario y cargador.
   * false (modo Ruta): encuadra la ruta y centra el cargador elegido.
   */
  followNearest?: boolean
}

export function MapView(props: MapViewProps) {
  if (shouldUseGoogleMaps()) {
    return <GoogleMapView {...props} />
  }
  return <MapLibreMapView {...props} />
}

function MapLibreMapView({
  user,
  station,
  nearby = [],
  onSelectStation,
  route = null,
  followNearest = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<Marker | null>(null)
  const stationMarkerRef = useRef<Marker | null>(null)
  const nearbyMarkersRef = useRef<Marker[]>([])
  const [styleReady, setStyleReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let map: MapLibreMap
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center: [-3.7, 40.4],
        zoom: 5.5,
        attributionControl: { compact: true },
      })
    } catch (err) {
      // Sin WebGL2 maplibre lanza al crear el mapa: aviso en vez de dejar la app en blanco.
      console.error('No se pudo crear el mapa', err)
      setMapError('El dispositivo no puede mostrar el mapa (necesita WebGL2). Los resultados siguen en la lista.')
      return
    }
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => setStyleReady(true))
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setStyleReady(false)
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
      .slice(0, 50)
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

    if (!followNearest) {
      if (station) {
        map.easeTo({
          center: [station.location.lon, station.location.lat],
          zoom: Math.max(map.getZoom(), 12),
          duration: 500,
        })
      }
    } else if (user && station) {
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
  }, [user, station, nearby, onSelectStation, followNearest])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !styleReady) return
    const source = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!route || route.coordinates.length < 2) {
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER)
      if (map.getLayer(ROUTE_CASING_LAYER)) map.removeLayer(ROUTE_CASING_LAYER)
      if (source) map.removeSource(ROUTE_SOURCE)
      return
    }
    const data = { type: 'Feature' as const, properties: {}, geometry: route }
    if (source) {
      source.setData(data)
    } else {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data })
      map.addLayer({
        id: ROUTE_CASING_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 8 },
      })
      map.addLayer({
        id: ROUTE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 5 },
      })
    }
    const bounds = new maplibregl.LngLatBounds()
    for (const [lon, lat] of route.coordinates) bounds.extend([lon, lat])
    map.fitBounds(bounds, { padding: 48, duration: 600 })
  }, [route, styleReady])

  return (
    <div className="map-shell-wrap">
      <div ref={containerRef} className="map-shell" role="application" aria-label="Mapa de cargadores" />
      {mapError && (
        <p className="map-error" role="alert">
          {mapError}
        </p>
      )}
    </div>
  )
}
