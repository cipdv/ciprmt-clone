"use server";

export async function verifyTurnstileToken(token, clientIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Turnstile is not configured");
    }
    return { success: true, skipped: true };
  }

  if (!token) {
    throw new Error("Turnstile validation failed");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (clientIp) {
    body.append("remoteip", clientIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body,
    }
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error("Turnstile validation failed");
  }

  return data;
}
