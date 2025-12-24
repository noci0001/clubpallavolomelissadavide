const { createClient } = require("@supabase/supabase-js");

function ymd(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function startOfWeekMonday(date){
  const d = new Date(date);
  const day = (d.getDay()+6)%7; // Mon=0
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-day);
  return d;
}
function isoWeekId(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2,"0")}`;
}

const TRAINING_WEEKDAYS = new Set([1,2,3,4,6]); // Mon-Thu + Sat

exports.handler = async () => {
  try{
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const weekId = isoWeekId(now);

    const trainingDates = [];
    for(let i=0;i<7;i++){
      const d = new Date(weekStart);
      d.setDate(d.getDate()+i);
      if(TRAINING_WEEKDAYS.has(d.getDay())) trainingDates.push(ymd(d));
    }

    const { data: members, error: mErr } = await supabase
      .from("members")
      .select("id,name,member_code,active")
      .eq("active", true)
      .order("name", { ascending: true });
    if(mErr) throw mErr;

    const { data: responses, error: rErr } = await supabase
      .from("responses")
      .select("training_date,member_id,status,updated_at")
      .eq("week_id", weekId);
    if(rErr) throw rErr;

    return {
      statusCode: 200,
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ weekId, weekStart: ymd(weekStart), trainingDates, members, responses })
    };
  }catch(e){
    return { statusCode: 500, headers: { "Content-Type":"application/json" }, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
