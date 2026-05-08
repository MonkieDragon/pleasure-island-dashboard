/**
 * Format Supabase PostgrestError (plain object) or other throws for UI/logging.
 */
export function formatSupabaseError(e: unknown): string {
  if (e == null) return "Unknown error";
  if (typeof e === "string") return e;
  const obj = e as {
    message?: string;
    code?: string;
    hint?: string;
    details?: string;
  };
  const parts = [
    obj.message,
    obj.code ? `(code ${obj.code})` : null,
    obj.hint ? `Hint: ${obj.hint}` : null,
    obj.details ? `Details: ${obj.details}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
