const { createClient } = require("@supabase/supabase-js");

function isoWeekId(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}

function bucketDelta(oldStatus, newStatus){
  const d = { present: 0, absent: 0, maybe: 0 };
  const dec = (s) => { if(s==="yes") d.present--; if(s==="no") d.absent--; if(s==="maybe") d.maybe--; };
  const inc = (s) => { if(s==="yes") d.present++; if(s==="no") d.absent++; if(s==="maybe") d.maybe++; };
  if(oldStatus) dec(oldStatus);
  inc(newStatus);
  return d;
}

exports.handler = async (event) => {
  try{
    if(event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(event.body || "{}");
    const memberCode = String(body.member_code || "").trim();
    const trainingDate = String(body.training_date || "").trim(); // YYYY-MM-DD
    const status = String(body.status || "").trim(); // yes|no|maybe

    if(!memberCode || !trainingDate || !["yes","no","maybe"].includes(status)){
      return { statusCode: 400, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: "Bad request" }) };
    }

    const { data: member, error: memErr } = await supabase
      .from("members")
      .select("id,active")
      .eq("member_code", memberCode)
      .maybeSingle();
    if(memErr) throw memErr;
    if(!member || !member.active){
      return { statusCode: 403, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: "Invalid member code" }) };
    }

    const d = new Date(trainingDate + "T00:00:00");
    if(Number.isNaN(d.getTime())){
      return { statusCode: 400, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: "Invalid date" }) };
    }
    const weekId = isoWeekId(d);

    const { data: existing, error: exErr } = await supabase
      .from("responses")
      .select("status")
      .eq("training_date", trainingDate)
      .eq("member_id", member.id)
      .maybeSingle();
    if(exErr) throw exErr;

    const oldStatus = existing ? existing.status : null;
    if(oldStatus === status){
      return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ ok: true, unchanged: true }) };
    }

    const { error: upErr } = await supabase
      .from("responses")
      .upsert(
        { week_id: weekId, training_date: trainingDate, member_id: member.id, status, updated_at: new Date().toISOString() },
        { onConflict: "training_date,member_id" }
      );
    if(upErr) throw upErr;

    // ensure stats row exists
    const { error: initErr } = await supabase
      .from("member_stats")
      .upsert({ member_id: member.id, updated_at: new Date().toISOString() }, { onConflict: "member_id" });
    if(initErr) throw initErr;

    const delta = bucketDelta(oldStatus, status);

    const { error: rpcErr } = await supabase.rpc("apply_member_stats_delta", {
      p_member_id: member.id,
      p_present_delta: delta.present,
      p_absent_delta: delta.absent,
      p_maybe_delta: delta.maybe
    });
    if(rpcErr) throw rpcErr;

    return { statusCode: 200, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ ok: true }) };
  }catch(e){
    return { statusCode: 500, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
