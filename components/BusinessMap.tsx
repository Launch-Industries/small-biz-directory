'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Single-location detail-page map: one marker on the business, MapLibre GL
// (WebGL vector tiles) via the free, keyless OpenFreeMap "liberty" style —
// matching the directory MapView. No API key required.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

export default function BusinessMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number
  longitude: number
  name: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [longitude, latitude],
      zoom: 15,
      scrollZoom: false,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    new maplibregl.Marker({ color: '#f9465c' })
      .setLngLat([longitude, latitude])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setText(name))
      .addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [latitude, longitude, name])

  return <div ref={containerRef} className="h-full w-full" />
}
