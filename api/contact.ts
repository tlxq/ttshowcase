/**
 * The mail form (Questions): sends a visitor's message to Tom through Resend. Tom's address and the
 * key stay here, on the server (CONTACT_TO and RESEND_API_KEY in Vercel's settings), never in the
 * page. CONTACT_FROM is the sender; until ttdevs.com is set up at Resend it is Resend's test sender,
 * which can only write to the account's own address.
 */
const LONGEST = 4000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<Response> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!key || !to) return Response.json({ error: "not-set-up" }, { status: 503 });
  let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }
  // A field only robots fill in: they get a thank-you and nothing is sent.
  if (typeof body.website === "string" && body.website) return Response.json({ sent: true });
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!EMAIL.test(email) || email.length > 200) {
    return Response.json({ error: "email" }, { status: 400 });
  }
  if (!message || message.length > LONGEST) {
    return Response.json({ error: "message" }, { status: 400 });
  }
  try {
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || "tlxq <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `Message from ${name ? `${name} <${email}>` : email}`,
        text: message,
      }),
    });
    if (!sent.ok) return Response.json({ error: "mail-service" }, { status: 502 });
    return Response.json({ sent: true });
  } catch {
    return Response.json({ error: "mail-service" }, { status: 502 });
  }
}
