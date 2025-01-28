"use client";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { useEffect } from "react";
import type { Spot } from "../types/types";

function AutoFitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

const AircraftIcon = L.icon({
  iconUrl: '/aircraft-marker.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapProps {
  center: L.LatLngExpression;
  spots: Spot[];
  highlightedSpot: Spot | null;
}

export default function Map({ center, spots, highlightedSpot }: MapProps) {
  const allPositions: L.LatLngExpression[] = [center];
  spots.forEach(spot => {
    if (spot.flight?.lat && spot.flight?.lon) {
      allPositions.push([spot.flight.lat, spot.flight.lon]);
    }
  });

  return (
    <MapContainer
      className="h-full w-full rounded-lg z-0"
      zoom={13}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <AutoFitBounds positions={allPositions} />

      {/* User position */}
      <CircleMarker
        center={center}
        radius={10}
        color="#ffffff"
        fillColor="#ffffff"
        fillOpacity={0.8}
        weight={1}
        interactive={false}
      />

      {/* Aircraft markers */}
      {spots.map((spot) => {
        const position: L.LatLngExpression = [
          spot.flight?.lat || 0,
          spot.flight?.lon || 0
        ];

        const isHighlighted = highlightedSpot?._id === spot._id;

        return (
          <div key={spot._id}>
            {isHighlighted && (
              <CircleMarker
                center={position}
                radius={25}
                color="#ffffff"
                fillColor="transparent"
                weight={2}
                interactive={false}
              />
            )}

            <Marker
              position={position}
              icon={AircraftIcon}
              interactive={false}
            >
              {isHighlighted && (
                <CircleMarker
                  center={position}
                  radius={12}
                  color="#ffffff"
                  fillColor="#000000"
                  fillOpacity={1}
                  weight={1}
                  interactive={false}
                />
              )}
            </Marker>
          </div>
        );
      })}
    </MapContainer>
  );
}