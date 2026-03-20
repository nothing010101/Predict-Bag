import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


async function fetchVirtualsSentientTokens() {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/token-profiles/latest/v1"
    );
    if (!res.ok) return [];
    const data = await res.json();

    
    return (data ?? [])
      .filter((t: Record<string, unknown>) => t.chainId === "base")
      .slice(0, 30);
  } catch {
    return [];
  }
}

async function getTokenMC(address: string): Promise<{ mc: number; liquidity: number; name: string; symbol: string } | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;
    return {
      mc: pair.marketCap ?? 0,
      liquidity: pair.liquidity?.usd ?? 0,
      name: pair.baseToken?.name ?? "",
      symbol: pair.baseToken?.symbol ?? "",
    };
  } catch {
    return null;
  }
}

function generateQuestion(tokenName: string, targetMc: number, hours: number): string {
  const formatted =
    targetMc >= 1_000_000
      ? `$${(targetMc / 1_000_000).toFixed(1)}M`
      : `$${(targetMc / 1_000).toFixed(0)}K`;
  return `Will ${tokenName} reach ${formatted} MC within ${hours} hours?`;
}

Deno.serve(async () => {
  console.log("fetch-tokens: starting");

  const tokens = await fetchVirtualsSentientTokens();
  let created = 0;

  for (const token of tokens) {
    const address = token.tokenAddress ?? token.address;
    if (!address) continue;

    
    const { data: existing } = await supabase
      .from("token_registry")
      .select("id, first_seen, has_active_pool")
      .eq("token_address", address)
      .single();

    const now = Date.now();

    if (existing) {
      
      const tokenAgeHours = (now - new Date(existing.first_seen).getTime()) / 3_600_000;
      if (tokenAgeHours < 2 || existing.has_active_pool) continue;
    } else {
      
      await supabase.from("token_registry").insert({
        token_address: address,
        virtuals_status: "sentient",
        first_seen: new Date().toISOString(),
      });
      continue; 
    }

  
    const tokenData = await getTokenMC(address);
    if (!tokenData || tokenData.mc < 40_000) continue; 

   
    await supabase
      .from("token_registry")
      .update({
        current_mc: tokenData.mc,
        token_name: tokenData.name,
        token_symbol: tokenData.symbol,
        last_price_check: new Date().toISOString(),
        has_active_pool: true,
      })
      .eq("token_address", address);

  
    const timeframes: Array<{ key: string; hours: number }> = [
      { key: "fast", hours: 2 },
      { key: "medium", hours: 6 },
      { key: "slow", hours: 12 },
    ];

    for (const tf of timeframes) {
      const targetMc = tokenData.mc * 2;
      const closesAt = new Date(now + tf.hours * 3_600_000).toISOString();
      const question = generateQuestion(tokenData.name, targetMc, tf.hours);

      const { error } = await supabase.from("pools").insert({
        token_address: address,
        token_name: tokenData.name,
        token_symbol: tokenData.symbol,
        category: "sentient",
        question,
        current_mc: tokenData.mc,
        target_mc: targetMc,
        timeframe: tf.key,
        deadline_hours: tf.hours,
        opened_at: new Date().toISOString(),
        closes_at: closesAt,
        status: "open",
        peak_mc: tokenData.mc,
      });

      if (!error) created++;
    }
  }

  console.log(`fetch-tokens: created ${created} pools`);
  return new Response(JSON.stringify({ created }), {
    headers: { "Content-Type": "application/json" },
  });
});
