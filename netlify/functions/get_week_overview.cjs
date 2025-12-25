// netlify/functions/get_week_overview.cjs
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

// Monday-start week range for a given YYYY-MM-DD (UTC-safe)
function weekRange(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7; // 1..7 (Mon..Sun)
  const monday = new Date(dt);
  monday.setUTCDate(dt.getUTCDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (x) => {
    const yy = x.getUTCFullYear();
    const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(x.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  return { from: fmt(monday), to: fmt(sunday) };
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

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const { date } = JSON.parse(event.body || "{}");
    if (!date) return json(400, { error: "Missing date" });

    const { from, to } = weekRange(date);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Pull responses for the week + join members for names.
    // Adjust select fields if your members table has different columns.
    const { data, error } = await supabase
      .from("responses")
      .select("training_date,status,member_id,members(name)")
      .gte("training_date", from)
      .lte("training_date", to);

    if (error) throw error;

    // Normalize output
    const rows = (data || []).map((r) => ({
      training_date: r.training_date,
      status: r.status,
      member_id: r.member_id,
      name: r.members?.name || null,
    }));

    return json(200, { from, to, rows });
  } catch (e) {
    return json(500, { error: e?.message || String(e) });
  }
};
