import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function test() {
  console.log("Testing Supabase connection...");

  // 1. READ test (most important)
  const { data, error } = await supabase.from("regions").select("*").limit(5);

  console.log("READ RESULT:");
  console.log("data:", data);
  console.log("error:", error);

  // 2. OPTIONAL WRITE test (uncomment if read works)
  /*
  const insert = await supabase
    .from("regions")
    .insert({
      name: "test-region",
      slug: "test-region"
    })
    .select();

  console.log("INSERT RESULT:", insert);
  */
}

test().catch(console.error);
