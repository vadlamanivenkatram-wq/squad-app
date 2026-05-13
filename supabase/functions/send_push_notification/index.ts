import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import webpush from "https://esm.sh/web-push@3.4.5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@yourdomain.com";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("Missing required environment variables for send_push_notification:", {
    SUPABASE_URL: Boolean(SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
    VAPID_PUBLIC_KEY: Boolean(VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: Boolean(VAPID_PRIVATE_KEY),
  });
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const fetchSubscriptions = async (recipientId?: string, groupId?: string) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/push_subscriptions`);
  url.searchParams.set("select", "*");
  if (recipientId) url.searchParams.set("user_id", `eq.${recipientId}`);
  if (groupId) url.searchParams.set("group_id", `eq.${groupId}`);

  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const sendNotification = async (subscription: any, payload: unknown) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error("Push send failed", error, subscription);
    return { success: false, error: error?.message ?? String(error) };
  }
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    groupId,
    recipientId,
    title,
    body: messageBody,
    eventId,
    url = "/",
    type,
  } = body;

  const payload = {
    title: title ?? "Squad Notification",
    body: messageBody ?? "You have a new update.",
    url,
    eventId,
    type,
  };

  try {
    const subscriptions = await fetchSubscriptions(recipientId, groupId);
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return jsonResponse({ sent: 0, message: "No matching subscriptions found" });
    }

    const results = await Promise.all(subscriptions.map((sub) => sendNotification(sub.subscription, payload)));
    const sent = results.filter((result) => result.success).length;
    return jsonResponse({ sent, total: results.length, results });
  } catch (error) {
    console.error("send_push_notification error", error);
    return jsonResponse({ error: error?.message ?? String(error) }, 500);
  }
});
