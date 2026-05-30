'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { Business } from '@/types/business';

// Fix default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClusterLayer({ businesses }: { businesses: Business[] }) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }
    const cluster = L.markerClusterGroup();
    businesses.forEach((b) => {
      if (b.latitude && b.longitude) {
        const marker = L.marker([b.latitude, b.longitude]);
        marker.bindPopup(`<a href="/businesses/${b.slug}">${b.name}</a>`);
        cluster.addLayer(marker);
      }
    });
    map.addLayer(cluster);
    clusterRef.current = cluster;
    return () => { map.removeLayer(cluster); };
  }, [map, businesses]);

  return null;
}

export default function MapView({ businesses }: { businesses: Business[] }) {
  return (
    <MapContainer center={[47.6062, -122.3321]} zoom={12} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClusterLayer businesses={businesses} />
    </MapContainer>
  );
}
