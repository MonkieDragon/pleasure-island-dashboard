"use client";

import { Puzzle, PuzzleChain } from "@/types/database";

type Props = {
  puzzles: Puzzle[];
  chains: PuzzleChain[];
  selectedId: string | null;
  onSelectPuzzle: (p: Puzzle) => void;
  onSelectChain: (chainId: string | null) => void;
};

export default function Sidebar({
  puzzles,
  chains,
  selectedId,
  onSelectPuzzle,
  onSelectChain,
}: Props) {
  return (
    <div
      style={{
        width: 250,
        borderRight: "1px solid #ccc",
        overflowY: "auto",
        padding: 8,
      }}
    >
      <h3>Chains</h3>

      {/* All puzzles option */}
      <div
        onClick={() => onSelectChain(null)}
        style={{
          padding: 6,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        All
      </div>

      {chains.map((c) => (
        <div key={c.id} style={{ marginTop: 10 }}>
          <div
            onClick={() => onSelectChain(c.id)}
            style={{ cursor: "pointer", fontWeight: 600 }}
          >
            {c.name || "Untitled Chain"}
          </div>

          {puzzles
            .filter((p) => p.chain_id === c.id)
            .map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectPuzzle(p)}
                style={{
                  paddingLeft: 12,
                  cursor: "pointer",
                  background: selectedId === p.id ? "#eee" : "transparent",
                }}
              >
                {p.title || "Untitled"}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
