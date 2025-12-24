const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  try{
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from("member_stats")
      .select("present_count,absent_count,maybe_count, member_id, members(name)")
      .order("present_count", { ascending: false });

    if(error) throw error;

    const out = (data || []).map(r => ({
      name: r.members?.name || "Unknown",
      present: r.present_count,
      absent: r.absent_count,
      maybe: r.maybe_count
    }));

    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify(out) };
  }catch(e){
    return { statusCode: 500, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
