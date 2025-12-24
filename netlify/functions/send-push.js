import webpush from "web-push";
import { getStore } from "@netlify/blobs";

const VAPID_SUBJECT = "mailto:samuelnocita@gmail.com";

export default async (req) => {
  // you can restrict this endpoint with a secret token
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const store = getStore("push-subs");

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const body = await req.json().catch(() => ({}));
  const payload = JSON.stringify({
    title: body.title || "Allenamento di pallavolo 🏐",
    body: body.body || "Compila la presenza nell’app",
    url: body.url || "/"
  });

  const keys = await store.list(); // list all subscription keys
  const results = [];

  for (const k of keys) {
    const subRaw = await store.get(k.key);
    if (!subRaw) continue;

    const sub = JSON.parse(subRaw);

    try {
      await webpush.sendNotification(sub, payload);
      results.push({ key: k.key, ok: true });
    } catch (err) {
      // if subscription is gone (410/404), delete it
      const status = err?.statusCode;
      if (status === 410 || status === 404) await store.delete(k.key);
      results.push({ key: k.key, ok: false, status });
    }
  }

  return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
