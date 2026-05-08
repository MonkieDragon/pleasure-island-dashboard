import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  console.log("Inserting test puzzle_chain...");

  const { data, error } = await supabase
    .from("puzzle_chains")
    .insert({
      title: "Test Chain",
      region_id: null, // important: we isolate FK complexity first
      latitude: 10.3,
      longitude: 123.9,
    })
    .select()
    .single();

  console.log("RESULT:");
  console.log("data:", data);
  console.log("error:", error);
}

run().catch(console.error);
