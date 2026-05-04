"use client";

import { Puzzle, PuzzleChain, Treasure } from "@/types/database";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "./Sidebar";
import PuzzleEditor from "./PuzzleEditor";
import TreasurePanel from "./TreasurePanel";
import MapView from "./MapVIew";

export default function Dashboard() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [chains, setChains] = useState<PuzzleChain[]>([]);
  const [treasures, setTreasures] = useState<Treasure[]>([]);

  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);
  const [selectedTreasure, setSelectedTreasure] = useState<Treasure | null>(
    null,
  );
  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  const loadAll = async () => {
    const [
      { data: puzzles, error: puzzlesError },
      { data: chains, error: chainsError },
      { data: treasures, error: treasuresError },
    ] = await Promise.all([
      supabase.from("puzzles").select("*"),
      supabase.from("puzzle_chains").select("*"),
      supabase.from("treasures").select("*"),
    ]);

    if (puzzlesError) console.error("puzzles error", puzzlesError);
    if (chainsError) console.error("chains error", chainsError);
    if (treasuresError) console.error("treasures error", treasuresError);

    setPuzzles((puzzles ?? []) as Puzzle[]);
    setChains((chains ?? []) as PuzzleChain[]);
    setTreasures((treasures ?? []) as Treasure[]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredPuzzles = selectedChain
    ? puzzles.filter((p) => p.chain_id === selectedChain)
    : puzzles;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        puzzles={puzzles}
        chains={chains}
        selectedId={selectedPuzzle?.id ?? null}
        onSelectPuzzle={setSelectedPuzzle}
        onSelectChain={setSelectedChain}
      />

      <MapView
        puzzles={puzzles}
        treasures={treasures}
        selectedPuzzle={selectedPuzzle}
        selectedChain={selectedChain}
        onSelectPuzzle={setSelectedPuzzle}
        onSelectTreasure={setSelectedTreasure}
        refresh={loadAll}
      />

      <div style={{ width: 300, borderLeft: "1px solid #ccc" }}>
        <PuzzleEditor puzzle={selectedPuzzle} refresh={loadAll} />
        <TreasurePanel treasure={selectedTreasure} refresh={loadAll} />
      </div>
    </div>
  );
}
