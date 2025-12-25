// netlify/functions/get_availability.cjs
const { cors, json, parseJson, err } = require("./_supabase.cjs");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors();
  if (event.httpMethod !== "POST") return err(405, "Use POST");

  try {
    const body = parseJson(event.body);
    const member_id = body?.member_id;
    const training_date = body?.training_date; // "YYYY-MM-DD"

    if (!member_id || !training_date) {
      return err(400, "Missing member_id or training_date");
    }

    const { supabase } = require("./_supabase.cjs");

    const { data, error } = await supabase
      .from("training_availability")
      .select("status")
      .eq("member_id", member_id)
      .eq("training_date", training_date)
      .maybeSingle();

    if (error) return err(500, error.message);

    // if no row, return null
    return json(200, { status: data?.status ?? null });
  } catch (e) {
    return err(500, e?.message || "Server error");
  }
};
