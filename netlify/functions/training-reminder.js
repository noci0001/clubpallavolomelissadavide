import webpush from "web-push";
import { getStore } from "@netlify/blobs";

const VAPID_SUBJECT = "mailto:you@example.com";

export const config = {
  schedule: "30 15 * * 2,4,6" // 15:30 Tue(2), Thu(4), Sat(6) UTC
};

export default async () => {
  const store = getStore("push-subs");

  webpush.setVapidDetails(
    VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({
    title: "Allenamento di pallavolo 🏐",
    body: "Compila la presenza nell’app",
    url: "/"
  });

  const keys = await store.list();
  for (const k of keys) {
    const subRaw = await store.get(k.key);
    if (!subRaw) continue;
    const sub = JSON.parse(subRaw);

    try {
      await webpush.sendNotification(sub, payload);
    } catch (err) {
      const status = err?.statusCode;
      if (status === 410 || status === 404) await store.delete(k.key);
    }
  }

  return new Response("ok", { status: 200 });
};
