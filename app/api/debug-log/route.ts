export async function POST(req: Request) {
  try {
    const body = await req.json();
    try {
      const { appendFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const line = JSON.stringify(body) + "\n";
      await appendFile(join(process.cwd(), "debug-790358.log"), line, "utf8");
    } catch {
      // ignore file write issues
    }
    await fetch("http://127.0.0.1:7442/ingest/f0352e41-ced3-412d-9b60-e73645ea4888", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "790358",
      },
      body: JSON.stringify(body),
    });
  } catch {
    // swallow
  }

  return new Response(null, { status: 204 });
}

