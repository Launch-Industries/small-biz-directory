'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Business } from '@/types/business';

// LIDS brand palette (literal hex — GL styles can't use Tailwind classes)
const LI_RED = '#f9465c';
const INK_1000 = '#0a0c10';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const SEATTLE_CENTER: [number, number] = [-122.3321, 47.6062];

// Greater Seattle bounding box guard. Excludes null coords and bad geocodes
// (e.g. the Atlantic Ocean point at lat 13.47, lng -29.11).
function hasValidSeattleCoords(b: Business): b is Business & { latitude: number; longitude: number } {
  const { latitude: lat, longitude: lng } = b;
  return (
    lat != null &&
    lng != null &&
    lat >= 47.0 &&
    lat <= 48.1 &&
    lng >= -122.7 &&
    lng <= -121.5
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function MapView({ businesses }: { businesses: Business[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: SEATTLE_CENTER,
      zoom: 10,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      map.addSource('businesses', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 14,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'businesses',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': LI_RED,
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'businesses',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 13,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Unclustered points
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'businesses',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': LI_RED,
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Click cluster -> zoom in
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource('businesses') as maplibregl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const geometry = features[0].geometry;
          if (geometry.type !== 'Point') return;
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          });
        });
      });

      // Click unclustered point -> popup
      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const props = feature.properties ?? {};
        const coordinates = (feature.geometry.coordinates as [number, number]).slice() as [number, number];

        const name = String(props.name ?? '');
        const slug = String(props.slug ?? '');
        const category = props.category ? String(props.category) : '';
        const locality = props.locality ? String(props.locality) : '';

        const html = `
          <div style="font-family: system-ui, sans-serif; min-width: 140px;">
            <a href="/businesses/${escapeHtml(slug)}" style="color: ${INK_1000}; font-weight: 600; text-decoration: none;">${escapeHtml(name)}</a>
            ${category ? `<div style="color: ${INK_1000}; opacity: 0.7; font-size: 12px; margin-top: 2px;">${escapeHtml(category)}</div>` : ''}
            ${locality ? `<div style="color: ${INK_1000}; opacity: 0.55; font-size: 12px;">${escapeHtml(locality)}</div>` : ''}
          </div>
        `;

        new maplibregl.Popup({ closeButton: true })
          .setLngLat(coordinates)
          .setHTML(html)
          .addTo(map);
      });

      const setPointer = (cursor: string) => () => {
        map.getCanvas().style.cursor = cursor;
      };
      map.on('mouseenter', 'clusters', setPointer('pointer'));
      map.on('mouseleave', 'clusters', setPointer(''));
      map.on('mouseenter', 'unclustered-point', setPointer('pointer'));
      map.on('mouseleave', 'unclustered-point', setPointer(''));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON data whenever businesses change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const features = businesses.filter(hasValidSeattleCoords).map((b) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [b.longitude, b.latitude] as [number, number],
      },
      properties: {
        name: b.name,
        slug: b.slug,
        category: b.category_name ?? '',
        locality: b.neighborhood ?? b.city ?? '',
      },
    }));

    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    const applyData = () => {
      const source = map.getSource('businesses') as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(data);
    };

    if (map.isStyleLoaded() && map.getSource('businesses')) {
      applyData();
    } else {
      map.once('load', applyData);
    }
  }, [businesses]);

  return <div ref={containerRef} className="h-full w-full" />;
}
