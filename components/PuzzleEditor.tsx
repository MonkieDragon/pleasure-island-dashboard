"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Puzzle } from "@/types/database";

type Props = {
  puzzle: Puzzle | null;
  refresh: () => void;
};

export default function PuzzleEditor({ puzzle, refresh }: Props) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (puzzle) setTitle(puzzle.title || "");
  }, [puzzle]);

  if (!puzzle) return <div>Select a puzzle</div>;

  const save = async () => {
    await supabase.from("puzzles").update({ title }).eq("id", puzzle.id);

    refresh();
  };

  return (
    <div style={{ padding: 10 }}>
      <h3>Puzzle</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={save}>Save</button>
    </div>
  );
}
