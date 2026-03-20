// resolve-pools/index.ts v2 - schema matched
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getCurrentMC(tokenAddress: string): Promise<number | null> {
  try {
    // Try via pair_address first
    const { data: tokenReg } = await supabase
      .from("token_registry")
      .select("pair_address, current_mc")
      .eq("token_address", tokenAddress)
      .single();

    if (tokenReg?.pair_address) {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/pairs/base/${tokenReg.pair_address}`
      );
      const data = await res.json();
      const pair = data.pair ?? data.pairs?.[0];
      if (pair) return pair.marketCap ?? pair.fdv ?? null;
    }

    // Fallback: fetch by token address
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/base/${tokenAddress}`
    );
    const data = await res.json();
    const pair = data?.pairs?.[0];
    return pair?.marketCap ?? null;
  } catch {
    return null;
  }
}

async function resolvePool(pool: any, outcome: "yes" | "no", finalMC: number) {
  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("pool_id", pool.id);

  if (!bets || bets.length === 0) {
    await supabase.from("pools").update({
      status: "resolved",
      outcome,
      resolved_mc: finalMC,
      resolved_at: new Date().toISOString(),
    }).eq("id", pool.id);
    return;
  }

  const winners = bets.filter((b) => b.prediction === outcome);
  const totalPot = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalWinningSide = winners.reduce((sum, b) => sum + b.amount, 0);

  // Payout winners
  for (const winner of winners) {
    const share = totalWinningSide > 0
      ? Math.floor((winner.amount / totalWinningSide) * totalPot)
      : 0;

    await supabase.from("bets").update({
      is_correct: true,
      prediction_points_earned: share,
    }).eq("id", winner.id);

    const { data: agent } = await supabase
      .from("agents")
      .select("prediction_points, total_wins, current_streak")
      .eq("wallet", winner.wallet)
      .single();

    if (agent) {
      await supabase.from("agents").update({
        prediction_points: (agent.prediction_points ?? 0) + share,
        total_wins: (agent.total_wins ?? 0) + 1,
        current_streak: (agent.current_streak ?? 0) + 1,
        last_active: new Date().toISOString(),
      }).eq("wallet", winner.wallet);
    }
  }

  // Mark losers
  const losers = bets.filter((b) => b.prediction !== outcome);
  for (const loser of losers) {
    await supabase.from("bets").update({
      is_correct: false,
      prediction_points_earned: 0,
    }).eq("id", loser.id);

    await supabase.from("agents").update({
      current_streak: 0,
      last_active: new Date().toISOString(),
    }).eq("wallet", loser.wallet);
  }

  // Resolve pool
  await supabase.from("pools").update({
    status: "resolved",
    outcome,
    resolved_mc: finalMC,
    peak_mc: Math.max(finalMC, pool.peak_mc ?? 0),
    resolved_at: new Date().toISOString(),
  }).eq("id", pool.id);
}

serve(async (_req) => {
  try {
    const now = new Date();

    const { data: pools, error } = await supabase
      .from("pools")
      .select("*")
      .in("status", ["open", "locked"]);

    if (error) throw error;
    if (!pools || pools.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active pools", resolved: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let resolved = 0;

    for (const pool of pools) {
      const currentMC = await getCurrentMC(pool.token_address);

      // Update peak_mc if higher
      if (currentMC && currentMC > (pool.peak_mc ?? 0)) {
        await supabase.from("pools").update({ peak_mc: currentMC }).eq("id", pool.id);
        pool.peak_mc = currentMC;
      }

      const effectivePeak = Math.max(currentMC ?? 0, pool.peak_mc ?? 0);

      // Early resolve: target hit
      if (effectivePeak >= pool.target_mc) {
        await resolvePool(pool, "yes", effectivePeak);
        resolved++;
        continue;
      }

      // Deadline resolve
      if (new Date(pool.closes_at) <= now) {
        await resolvePool(pool, "no", effectivePeak);
        resolved++;
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        message: "resolve-pools complete",
        checked: pools.length,
        resolved,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("resolve-pools error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
