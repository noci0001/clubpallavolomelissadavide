import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.json();
  const subscription = body?.subscription;
  if (!subscription?.endpoint) {
    return new Response("Bad Request", { status: 400 });
  }

  const store = getStore("push-subs");
  const key = Buffer.from(subscription.endpoint).toString("base64url");

  await store.set(key, JSON.stringify(subscription));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
