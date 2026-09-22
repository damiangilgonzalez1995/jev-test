import { NextRequest, NextResponse } from "next/server";
import { PROVIDERS } from "@/lib/providers";
import type { ProxyResult } from "@/lib/types";

// Neither TypeSafe nor AI Gateway allow cross-origin browser calls, so this
// route forwards the request server-side. The API key is passed per request
// from the browser and is never stored on the server.
export async function POST(req: NextRequest) {
  // Solo Vercel AI Gateway, con la clave del servidor (AI_GATEWAY_API_KEY en .env).
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta AI_GATEWAY_API_KEY en .env" }, { status: 500 });
  }
  const provider = PROVIDERS.vercel;

  const payload = await req.json();
  const started = performance.now();

  let upstream: Response;
  try {
    upstream = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    const result: ProxyResult = {
      ok: false,
      status: 0,
      latencyMs: Math.round(performance.now() - started),
      requestId: null,
      body: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
    return NextResponse.json(result);
  }

  const latencyMs = Math.round(performance.now() - started);
  const text = await upstream.text();
  let body: ProxyResult["body"];
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  const result: ProxyResult = {
    ok: upstream.ok,
    status: upstream.status,
    latencyMs,
    requestId: upstream.headers.get("x-typesafe-request-id") ?? upstream.headers.get("x-vercel-id"),
    body,
  };
  return NextResponse.json(result);
}
