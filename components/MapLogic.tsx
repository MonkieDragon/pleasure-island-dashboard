import { Puzzle } from "@/types/database";
import { useEffect } from "react";
import { Polyline, useMap } from "react-leaflet";

export default function MapLogic({
  puzzles,
  selectedChain,
}: {
  puzzles: Puzzle[];
  selectedChain: string | null;
}) {
  const map = useMap();

  const visiblePuzzles = selectedChain
    ? puzzles.filter((p) => p.chain_id === selectedChain)
    : puzzles;

  const chainPoints =
    selectedChain && visiblePuzzles.length > 0
      ? [...visiblePuzzles]
          .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((p) => [p.latitude, p.longitude] as [number, number])
      : [];

  useEffect(() => {
    if (!selectedChain || visiblePuzzles.length === 0) return;

    const bounds = visiblePuzzles.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [selectedChain, puzzles, map]);

  return (
    <>
      {selectedChain && chainPoints.length > 1 && (
        <Polyline positions={chainPoints} />
      )}
    </>
  );
}
