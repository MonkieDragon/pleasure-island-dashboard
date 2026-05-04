"use client";

import { Puzzle, Treasure } from "@/types/database";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";
import MapLogic from "./MapLogic";

type Props = {
  puzzles: Puzzle[];
  treasures: Treasure[];
  selectedPuzzle: Puzzle | null;
  selectedChain: string | null;
  onSelectPuzzle: (p: Puzzle) => void;
  onSelectTreasure: (t: Treasure) => void;
  refresh: () => void;
};

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const selectedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconSize: [30, 50],
  iconAnchor: [15, 50],
});

const treasureIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png",
  iconSize: [30, 30],
});

export default function MapView({
  puzzles,
  treasures,
  selectedPuzzle,
  selectedChain,
  onSelectPuzzle,
  onSelectTreasure,
  refresh,
}: Props) {
  return (
    <MapContainer center={[10.3157, 123.8854]} zoom={13} style={{ flex: 1 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <MapLogic puzzles={puzzles} selectedChain={selectedChain} />

      {puzzles.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={selectedPuzzle?.id === p.id ? selectedIcon : defaultIcon}
          draggable
          eventHandlers={{
            click: () => onSelectPuzzle(p),
            dragend: async (e) => {
              const pos = e.target.getLatLng();

              await supabase
                .from("puzzles")
                .update({
                  latitude: pos.lat,
                  longitude: pos.lng,
                })
                .eq("id", p.id);

              refresh();
            },
          }}
        />
      ))}

      {treasures.map((t) => (
        <Marker
          key={t.id}
          icon={treasureIcon}
          position={[t.latitude, t.longitude]}
          eventHandlers={{
            click: () => onSelectTreasure(t),
          }}
        />
      ))}
    </MapContainer>
  );
}
