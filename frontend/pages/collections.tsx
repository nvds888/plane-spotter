"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

type Spot = {
  _id: string;
  userId: string;
  lat: number;
  lon: number;
  timestamp: string;
  flight?: {
    hex: string;
    flight: string;
    type: string;
    alt: number;
    speed: number;
    operator: string;
    lat: number;
    lon: number;
  };
};

type GroupedSpot = {
  _id: string;
  count: number;
  spots: Spot[];
};

export default function Collection() {
  const { data: session } = useSession();
  const [groupedSpots, setGroupedSpots] = useState<GroupedSpot[]>([]); // Initialize as empty array
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGroupedSpots = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(
          `http://localhost:5000/api/spot/grouped?userId=${session.user.id}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch spots: ${response.statusText}`);
        }

        const data = await response.json();

        // Ensure data is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from the server');
        }

        setGroupedSpots(data);
      } catch (error) {
        console.error('Failed to fetch spots:', error);
        alert('Failed to load collection. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroupedSpots();
  }, [session]);

  if (!session) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <p className="mb-4">Please sign in to view your collection</p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signin" className="btn-primary">Sign In</Link>
          <Link href="/auth/signup" className="btn-secondary">Sign Up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">✈️ My Collection</h1>
        <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Back to Spotting
        </Link>
      </div>

      {isLoading ? (
        <p className="text-center">Loading collection...</p>
      ) : groupedSpots.length === 0 ? (
        <p className="text-gray-500 text-center">No planes in your collection yet!</p>
      ) : (
        <div className="space-y-4">
          {groupedSpots.map((group) => (
            <div key={group._id} className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-xl font-semibold mb-3">
                {group._id || 'Unknown Type'} ({group.count})
              </h2>
              <div className="space-y-3">
                {group.spots.map((spot) => (
                  <div key={spot._id} className="border-b pb-3 last:border-b-0">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>Flight: {spot.flight?.flight || 'N/A'}</p>
                      <p>Operator: {spot.flight?.operator || 'N/A'}</p>
                      <p>Altitude: {spot.flight?.alt ? `${spot.flight.alt}ft` : 'N/A'}</p>
                      <p>Speed: {spot.flight?.speed ? `${spot.flight.speed}kt` : 'N/A'}</p>
                      <p>Spotted: {new Date(spot.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}