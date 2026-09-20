import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import type { ShopWithOffer } from '@/lib/types';
import { CATEGORIES } from '@/lib/constants';

interface MapViewProps {
  shops: ShopWithOffer[];
  userLat: number;
  userLng: number;
  onMarkerClick: (shop: ShopWithOffer) => void;
  selectedShopId?: string;
}

export default function MapView({
  shops,
  userLat,
  userLng,
  onMarkerClick,
  selectedShopId,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [userLat, userLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const userIcon = L.divIcon({
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.4)"></div>',
      className: 'custom-marker',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    L.marker([userLat, userLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('You are here');

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;

    // Leaflet caches the container's pixel size at the moment L.map() runs.
    // If the container's final layout size isn't settled yet (e.g. right
    // after this component swaps in for a loading spinner inside a flex
    // layout), Leaflet renders at a stale size and the page appears clipped.
    // A ResizeObserver keeps it correct any time the container's real size
    // changes (tab switches, viewport resize, address-bar show/hide, etc.).
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    const raf = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      clusterGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;
    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();
    markersRef.current = {};

    shops.forEach((shop) => {
      const cat = CATEGORIES[shop.category] || CATEGORIES.other;
      const colorMap: Record<string, string> = {
        grocery: '#059669',
        bakery: '#d97706',
        pharmacy: '#0d9488',
        cafe: '#ea580c',
        books: '#e11d48',
        electronics: '#2563eb',
        restaurant: '#dc2626',
        clothing: '#db2777',
        stationery: '#4f46e5',
        other: '#475569',
      };
      const color = colorMap[shop.category] || '#475569';

      const icon = L.divIcon({
        html: `<div class="marker-pin" style="background:${color}"><span style="color:white;font-size:14px;font-weight:700">${cat.label.charAt(0)}</span></div>`,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([shop.latitude, shop.longitude], { icon }).on('click', () =>
        onMarkerClick(shop)
      );

      clusterGroup.addLayer(marker);
      markersRef.current[shop.id] = marker;
    });
  }, [shops, onMarkerClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedShopId) return;
    const marker = markersRef.current[selectedShopId];
    if (marker) {
      map.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
    }
  }, [selectedShopId]);

  return <div ref={containerRef} className="h-full w-full" />;
}
