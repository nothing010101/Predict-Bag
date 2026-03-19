import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    const now = new Date().toISOString();

    // Lock all open pools that have passed their deadline
    const { data, error } = await supabase
      .from("pools")
      .update({ status: "locked" })
      .eq("status", "open")
      .lt("closes_at", now)
      .select("id, token_symbol");

    if (error) throw error;

    const locked = data?.length ?? 0;
    console.log(`Locked ${locked} expired pools`);

    return new Response(
      JSON.stringify({ message: `Locked ${locked} pools`, pools: data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
