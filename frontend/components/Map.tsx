"use client";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression, LatLngBounds } from "leaflet";
import { useEffect } from "react";
import type { Spot } from "../types/types";

// Auto-fit component
function AutoFitBounds({ positions }: { positions: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = new LatLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
}

// Default marker icon configuration
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  center: LatLngExpression;
  spots: Spot[];
  highlightedSpot: Spot | null;
}

export default function Map({ center, spots, highlightedSpot }: MapProps) {
  // Collect all positions for bounds calculation
  const allPositions: LatLngExpression[] = [center];
  spots.forEach(spot => {
    if (spot.flight?.lat && spot.flight?.lon) {
      allPositions.push([spot.flight.lat, spot.flight.lon]);
    }
  });

  return (
    <MapContainer
      className="h-64 w-full rounded-lg z-0"
      style={{ minHeight: "256px" }}
      zoom={13}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      <AutoFitBounds positions={allPositions} />

      {/* User's position */}
      <CircleMarker
        center={center}
        radius={8}
        color="#3b82f6"
        fillColor="#3b82f6"
        fillOpacity={0.8}
        interactive={false}
      />

      {/* Aircraft markers */}
      {spots.map((spot) => {
        const position: LatLngExpression = [
          spot.flight?.lat || 0,
          spot.flight?.lon || 0
        ];

        const isHighlighted = highlightedSpot?._id === spot._id;

        return (
          <div key={spot._id}>
            {/* Highlight ring */}
            {isHighlighted && (
              <CircleMarker
                center={position}
                radius={20}
                color="#ef4444"
                fillColor="#ef4444"
                fillOpacity={0.2}
                stroke={true}
                weight={3}
                interactive={false}
              />
            )}

            {/* Aircraft marker */}
            <Marker
              position={position}
              icon={DefaultIcon}
              interactive={false}
              keyboard={false}
            >
              {isHighlighted && (
                <CircleMarker
                  center={position}
                  radius={12}
                  color="#ef4444"
                  fillColor="#ef4444"
                  fillOpacity={0.4}
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