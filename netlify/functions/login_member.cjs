const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try{
    if(event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase();

    if(!name || !code){
      return { statusCode: 400, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: "Missing name or code" }) };
    }

    const { data: member, error } = await supabase
      .from("members")
      .select("id,name,member_code,active,birth_year")
      .eq("member_code", code)
      .maybeSingle();

    if(error) throw error;
    if(!member || member.active !== true){
      return { statusCode: 401, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: "Codice non valido" }) };
    }

    // name match (case-insensitive, trimmed)
    if(member.name.trim().toLowerCase() !== name.toLowerCase()){
      return { statusCode: 401, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: "Nome e codice non corrispondono" }) };
    }

    return {
      statusCode: 200,
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ok: true, user: { id: member.id, nome: member.name, member_code: member.member_code } })
    };
  }catch(e){
    return { statusCode: 500, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
