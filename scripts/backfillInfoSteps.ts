import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type ChainRow = {
  id: string;
  latitude: number;
  longitude: number;
};

type StepRow = {
  id: string;
  chain_id: string;
  type: string;
  order_index: number;
  latitude: number | null;
  longitude: number | null;
  content: string | null;
};

async function main() {
  const { data: chains, error: chainsError } = await supabase
    .from("puzzle_chains")
    .select("id,latitude,longitude");
  if (chainsError) throw chainsError;

  let createdInfo = 0;
  let shiftedOrders = 0;
  let syncedChainCoords = 0;
  let syncedInfoCoords = 0;

  for (const chain of (chains || []) as ChainRow[]) {
    const { data: steps, error: stepsError } = await supabase
      .from("puzzle_steps")
      .select("id,chain_id,type,order_index,latitude,longitude,content")
      .eq("chain_id", chain.id)
      .order("order_index", { ascending: true });
    if (stepsError) throw stepsError;

    const stepRows = (steps || []) as StepRow[];
    const pinned = stepRows.find((s) => s.type === "info" && s.order_index === 0) || null;

    if (!pinned) {
      // Shift all existing steps up by 1 so index 0 is free.
      // Do it descending to avoid unique/order issues if you later add constraints.
      const descending = stepRows.slice().sort((a, b) => b.order_index - a.order_index);
      for (const s of descending) {
        await supabase
          .from("puzzle_steps")
          .update({ order_index: s.order_index + 1 })
          .eq("id", s.id);
      }
      shiftedOrders += descending.length;

      const { error: insertError } = await supabase.from("puzzle_steps").insert({
        chain_id: chain.id,
        type: "info",
        order_index: 0,
        content: "",
        latitude: chain.latitude,
        longitude: chain.longitude,
      });
      if (insertError) throw insertError;
      createdInfo += 1;

      continue;
    }

    // Ensure info step has coords; if missing, copy from chain.
    if (pinned.latitude == null || pinned.longitude == null) {
      await supabase
        .from("puzzle_steps")
        .update({ latitude: chain.latitude, longitude: chain.longitude })
        .eq("id", pinned.id);
      syncedInfoCoords += 1;
    }

    // Ensure chain coords match pinned info coords.
    if (
      pinned.latitude != null &&
      pinned.longitude != null &&
      (chain.latitude !== pinned.latitude || chain.longitude !== pinned.longitude)
    ) {
      await supabase
        .from("puzzle_chains")
        .update({ latitude: pinned.latitude, longitude: pinned.longitude })
        .eq("id", chain.id);
      syncedChainCoords += 1;
    }
  }

  console.log("Backfill complete");
  console.log({
    createdInfo,
    shiftedOrders,
    syncedChainCoords,
    syncedInfoCoords,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

