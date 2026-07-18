const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function getAllowedOrigins() {
  const configured = [
    Deno.env.get("CLM_ASSO_APP_URL") ?? "",
    ...(Deno.env.get("CLM_ASSO_ALLOWED_ORIGINS") ?? "").split(","),
  ]
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);

  return new Set(configured);
}

export function buildCorsHeaders(request: Request) {
  const origin = request.headers.get("origin")?.trim() ?? "";
  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = normalizeOrigin(origin);
  const isAllowed =
    !origin ||
    (normalizedOrigin.length > 0 && allowedOrigins.has(normalizedOrigin));

  return {
    allowed: isAllowed,
    headers: {
      "Access-Control-Allow-Origin": isAllowed && origin ? origin : "null",
      "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    },
  };
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function requireEnvironment(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Secret serveur manquant : ${name}.`);
  }

  return value;
}

export function parseBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
