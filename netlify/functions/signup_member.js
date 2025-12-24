const { createClient } = require("@supabase/supabase-js");

function normalizeName(s){
  return String(s || "").trim().replace(/\s+/g, " ");
}

function makeBaseCode(name, year){
  const letters = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const first3 = (letters.slice(0,3) || "XXX").padEnd(3, "X");
  return `${first3}-${year}`;
}

exports.handler = async (event) => {
  try{
    if(event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const body = JSON.parse(event.body || "{}");
    const name = normalizeName(body.name);
    const year = Number(body.birth_year);

    if(!name || !Number.isInteger(year) || year < 1900 || year > 2100){
      return { statusCode: 400, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: "Inserisci nome e anno di nascita valido" }) };
    }

    // If already exists by same name+birth_year, return existing
    const { data: existing, error: exErr } = await supabase
      .from("members")
      .select("id,name,member_code,active,birth_year")
      .eq("name", name)
      .eq("birth_year", year)
      .maybeSingle();

    if(exErr) throw exErr;

    if(existing){
      if(existing.active !== true){
        return { statusCode: 403, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: "Account disattivato. Contatta l’admin." }) };
      }
      return {
        statusCode: 200,
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ ok: true, already: true, user: { id: existing.id, nome: existing.name, member_code: existing.member_code } })
      };
    }

    // Generate code: FIRST3-YEAR (basic)
    // Handle collisions by adding -2, -3 ...
    let code = makeBaseCode(name, year);
    for(let attempt = 1; attempt <= 20; attempt++){
      const { data: taken, error: tErr } = await supabase
        .from("members")
        .select("id")
        .eq("member_code", code)
        .maybeSingle();

      if(tErr) throw tErr;
      if(!taken) break;

      code = attempt === 1
        ? `${makeBaseCode(name, year)}-2`
        : `${makeBaseCode(name, year)}-${attempt + 1}`;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("members")
      .insert({ name, member_code: code, birth_year: year, active: true })
      .select("id,name,member_code")
      .single();

    if(insErr) throw insErr;

    // ensure stats row exists
    await supabase.from("member_stats").upsert({ member_id: inserted.id }, { onConflict: "member_id" });

    return {
      statusCode: 200,
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ ok: true, user: { id: inserted.id, nome: inserted.name, member_code: inserted.member_code } })
    };
  }catch(e){
    return { statusCode: 500, headers: {"Content-Type":"application/json"}, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
