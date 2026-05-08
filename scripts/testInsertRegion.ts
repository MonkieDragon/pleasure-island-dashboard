import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function run() {
  console.log("Inserting test region...");

  const testSlug = `test-${Date.now()}`;

  const { data, error } = await supabase
    .from("regions")
    .insert({
      name: "Test Region",
      slug: testSlug,
    })
    .select()
    .single();

  console.log("RESULT:");
  console.log("data:", data);
  console.log("error:", error);
}

run().catch(console.error);
