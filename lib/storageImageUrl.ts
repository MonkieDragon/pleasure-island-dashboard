/** Append a cache-bust query param so replaced Supabase storage objects refresh in the browser. */
export function withImageCacheBust(url: string, version?: number): string {
  if (!version) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${version}`;
}
