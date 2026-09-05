export type TrailRouteEstimateMode = "walk" | "scooter";

export type TrailRouteEstimateResult = {
  distanceKm: number;
  durationMinutes: number;
};

export type TrailRoutePoint = { lat: number; lng: number };

/**
 * Calls the dashboard proxy to FOSSGIS OSM routing and returns rounded stats.
 */
export async function estimateTrailRoute(input: {
  mode: TrailRouteEstimateMode;
  points: TrailRoutePoint[];
}): Promise<TrailRouteEstimateResult> {
  if (input.points.length < 2) {
    throw new Error("Need at least 2 trail stops with map coordinates.");
  }

  const res = await fetch("/api/trail-route-estimate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: input.mode,
      points: input.points,
    }),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // ignore parse errors; handled below
  }

  if (!res.ok) {
    const message =
      typeof data === "object" &&
      data &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Route estimate failed.";
    throw new Error(message);
  }

  if (
    typeof data !== "object" ||
    !data ||
    typeof (data as { distanceMeters?: unknown }).distanceMeters !== "number" ||
    typeof (data as { durationSeconds?: unknown }).durationSeconds !== "number"
  ) {
    throw new Error("Route estimate returned an unexpected response.");
  }

  const { distanceMeters, durationSeconds } = data as {
    distanceMeters: number;
    durationSeconds: number;
  };

  return {
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
  };
}
