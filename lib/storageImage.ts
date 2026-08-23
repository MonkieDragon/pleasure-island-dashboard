import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSupabaseError } from "@/lib/supabaseError";

const DEFAULT_BUCKET = "images";

export function fileExtensionFromName(fileName: string, fallback: string): string {
  if (fileName && fileName.includes(".")) {
    return fileName.split(".").pop() || fallback;
  }
  return fallback;
}

export async function uploadStorageImage(
  supabase: SupabaseClient,
  input: {
    bucket?: string;
    file: File;
    objectPath: string;
    previousPath?: string | null;
  },
): Promise<string> {
  const bucket = input.bucket ?? DEFAULT_BUCKET;
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(input.objectPath, input.file, { upsert: true });
  if (uploadError) throw new Error(formatSupabaseError(uploadError));

  if (input.previousPath && input.previousPath !== input.objectPath) {
    await removeStorageImage(supabase, input.previousPath, bucket);
  }

  return input.objectPath;
}

export async function removeStorageImage(
  supabase: SupabaseClient,
  path: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(formatSupabaseError(error));
}
