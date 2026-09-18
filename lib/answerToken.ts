/**
 * Matches pleasure-island `sanitizeTokenInput`: letters and digits only.
 * Used for text answers (not number / QR / multiple choice).
 */
export function sanitizeAnswerToken(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "");
}

export function isAnswerToken(value: string): boolean {
  return value.length > 0 && /^[a-zA-Z0-9]+$/.test(value);
}
