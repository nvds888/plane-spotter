"use client";
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type LatLngExpression, LatLngBounds, DivIcon } from "leaflet";
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

// Create custom plane icon
const createPlaneIcon = (direction: number = 0, isHighlighted: boolean = false) => {
  return new DivIcon({
    html: `
      <div style="transform: rotate(${direction}deg);">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" 
                fill="${isHighlighted ? '#ef4444' : '#3b82f6'}"
          />
        </svg>
      </div>
    `,
    className: 'plane-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

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

  // Add custom CSS for the plane icon
  useEffect(() => {
    // Add styles only if they don't exist
    if (!document.getElementById('plane-icon-styles')) {
      const style = document.createElement('style');
      style.id = 'plane-icon-styles';
      style.innerHTML = `
        .plane-icon {
          transition: transform 0.3s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

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
        const direction = spot.flight?.track || spot.flight?.geography?.direction || 0;

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
              icon={createPlaneIcon(direction, isHighlighted)}
              interactive={false}
              keyboard={false}
            />
          </div>
        );
      })}
    </MapContainer>
  );
}