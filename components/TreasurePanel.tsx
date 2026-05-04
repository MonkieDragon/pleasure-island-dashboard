"use client";

import { supabase } from "@/lib/supabaseClient";
import { Treasure } from "@/types/database";

type Props = {
  treasure: Treasure | null;
  refresh: () => void;
};

export default function TreasurePanel({ treasure, refresh }: Props) {
  if (!treasure) return null;

  const replace = async () => {
    await supabase
      .from("treasures")
      .update({
        status: "active",
        last_found_at: null,
      })
      .eq("id", treasure.id);

    refresh();
  };

  return (
    <div style={{ padding: 10 }}>
      <h3>Treasure</h3>
      <p>Status: {treasure.status}</p>
      <button onClick={replace}>Mark Replaced</button>
    </div>
  );
}
