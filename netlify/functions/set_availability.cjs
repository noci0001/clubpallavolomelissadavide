// netlify/functions/set_availability.cjs
const { cors, json, parseJson, err, supabase } = require("./_supabase.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors();
  if (event.httpMethod !== "POST") return err(405, "Use POST");

  try {
    const body = parseJson(event.body);
    const member_id = body?.member_id;
    const training_date = body?.training_date; // "YYYY-MM-DD"
    const status = body?.status; // yes | no | maybe

    if (!member_id || !training_date || !status) {
      return err(400, "Missing member_id, training_date, or status");
    }
    if (!["yes", "no", "maybe"].includes(status)) {
      return err(400, "Invalid status");
    }

    const { data, error } = await supabase
      .from("training_availability")
      .upsert(
        { member_id, training_date, status, updated_at: new Date().toISOString() },
        { onConflict: "member_id,training_date" }
      )
      .select("status")
      .single();

    if (error) return err(500, error.message);

    return json(200, { ok: true, status: data.status });
  } catch (e) {
    return err(500, e?.message || "Server error");
  }
};
