import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
console.log("RUNNING IMPORT V4");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function getOrCreateRegion(name: string) {
  const slug = name.toLowerCase().replace(".json", "");

  const { data: existing } = await supabase
    .from("regions")
    .select("*")
    .eq("slug", slug)
    .single();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("regions")
    .insert({
      name: slug,
      slug,
    })
    .select()
    .single();

  if (error) throw error;

  return created;
}

async function importFile(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const regionRow = await getOrCreateRegion(fileName);

  console.log("Importing file:", fileName);
  console.log("Chains found:", data.length);

  for (const chain of data) {
    // 1. create chain (location)
    const { data: chainRow, error: chainError } = await supabase
      .from("puzzle_chains")
      .insert({
        title: chain.title,
        region_id: regionRow.id,
        latitude: chain.location.lat,
        longitude: chain.location.lng,
      })
      .select()
      .single();

    if (chainError) {
      console.error(chainError);
      continue;
    }

    // 2. insert steps (you are currently calling them puzzles)
    const steps = (chain.steps as Array<{
      type: string;
      content?: string;
      location?: { lat?: number; lng?: number };
      qrCode?: string;
      answerValidation?: unknown;
      multipleChoiceOptions?: unknown;
      hints?: unknown;
    }>).map((step, index: number) => ({
      chain_id: chainRow.id,
      order_index: index,

      // preserve structure (IMPORTANT)
      type: step.type,
      content: step.content,

      latitude: step.location?.lat ?? null,
      longitude: step.location?.lng ?? null,

      // New contract:
      // - QR payload is stored in `answer`
      // - all answers are stored as TEXT
      // - multiple choice options are stored as TEXT[]
      answer:
        step.type === "qr"
          ? step.qrCode ?? null
          : step.answerValidation == null
            ? null
            : typeof step.answerValidation === "string"
              ? step.answerValidation
              : typeof step.answerValidation === "number" ||
                  typeof step.answerValidation === "boolean"
                ? String(step.answerValidation)
                : Array.isArray(step.answerValidation)
                  ? step.answerValidation.length
                    ? String(step.answerValidation[0])
                    : null
                  : (() => {
                      const v = step.answerValidation as Record<string, unknown>;
                      const keys = v && typeof v === "object" ? Object.keys(v) : [];
                      if (keys.length > 0) {
                        const first = v[keys[0]];
                        return first == null ? null : String(first);
                      }
                      return String(step.answerValidation);
                    })(),
      multiple_choice_options: Array.isArray(step.multipleChoiceOptions)
        ? step.multipleChoiceOptions.map((x) => String(x))
        : null,
      hints: step.hints ?? null,
    }));

    const { error: stepError } = await supabase
      .from("puzzle_steps")
      .insert(steps);

    if (stepError) {
      console.error(stepError);
    }
  }
}

async function run() {
  await importFile("cebu.json");
  await importFile("siquijor.json");

  console.log("Import complete");
}

run().catch((err) => {
  console.error("IMPORT FAILED:", err);
});
