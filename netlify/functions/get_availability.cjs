// netlify/functions/get_availability.cjs
const { createClient } = require("@supabase/supabase-js");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { member_id, training_date } = JSON.parse(event.body || "{}");

    if (!member_id || !training_date) {
      return json(400, { error: "Missing member_id or training_date" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from("responses")
      .select("status")
      .eq("member_id", member_id)
      .eq("training_date", training_date)
      .maybeSingle();

    if (error) throw error;

    return json(200, { status: data?.status ?? null });
  } catch (e) {
    return json(500, { error: e?.message || String(e) });
  }
};
