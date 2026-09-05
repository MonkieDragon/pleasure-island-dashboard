import { NextResponse } from "next/server";

type Body = {
  mode?: string;
  points?: Array<{ lat: number; lng: number }>;
};

const FOSSGIS_BASE: Record<"walk" | "scooter", string> = {
  walk: "https://routing.openstreetmap.de/routed-foot",
  scooter: "https://routing.openstreetmap.de/routed-bike",
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = body.mode === "scooter" ? "scooter" : body.mode === "walk" ? "walk" : null;
  if (!mode) {
    return NextResponse.json(
      { error: "mode must be \"walk\" or \"scooter\"." },
      { status: 400 },
    );
  }

  const points = Array.isArray(body.points) ? body.points : [];
  const valid = points.filter(
    (p) =>
      p &&
      typeof p.lat === "number" &&
      typeof p.lng === "number" &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng),
  );
  if (valid.length < 2) {
    return NextResponse.json(
      { error: "At least 2 coordinates are required." },
      { status: 400 },
    );
  }

  const coords = valid.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${FOSSGIS_BASE[mode]}/route/v1/driving/${coords}?overview=false`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { Accept: "application/json" },
      // FOSSGIS asks for polite usage; this is a manual editor action.
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the routing service." },
      { status: 502 },
    );
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "Routing service returned an invalid response." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const message =
      typeof data === "object" &&
      data &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Routing service request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const route =
    typeof data === "object" &&
    data &&
    "routes" in data &&
    Array.isArray((data as { routes: unknown }).routes)
      ? (data as { routes: Array<{ distance?: number; duration?: number }> }).routes[0]
      : null;

  if (
    !route ||
    typeof route.distance !== "number" ||
    typeof route.duration !== "number"
  ) {
    return NextResponse.json(
      { error: "No route found between the trail stops." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  });
}
