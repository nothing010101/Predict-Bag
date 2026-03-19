import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getTokenMC(address: string): Promise<number> {
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/base/${address}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.pairs?.[0]?.marketCap ?? 0;
  } catch {
    return 0;
  }
}

async function resolvePool(
  poolId: string,
  outcome: "yes" | "no",
  resolvedMc: number
) {
  // Get all bets on this pool
  const { data: bets } = await supabase
    .from("bets")
    .select("*")
    .eq("pool_id", poolId);

  if (!bets || bets.length === 0) {
    await supabase
      .from("pools")
      .update({ status: "resolved", outcome, resolved_at: new Date().toISOString(), resolved_mc: resolvedMc })
      .eq("id", poolId);
    return;
  }

  // Parimutuel: winners split total pot proportionally
  const totalPot = bets.reduce((sum: number, b: Record<string, unknown>) => sum + (b.amount as number), 0);
  const winners = bets.filter((b: Record<string, unknown>) => b.prediction === outcome);
  const totalWinnerBets = winners.reduce((sum: number, b: Record<string, unknown>) => sum + (b.amount as number), 0);

  // Update each bet + agent points
  for (const bet of bets) {
    const isCorrect = bet.prediction === outcome;
    let predictionPointsEarned = 0;
    let miningPointsEarned = 0;

    if (isCorrect && totalWinnerBets > 0) {
      // Proportional share of total pot
      predictionPointsEarned = Math.floor((bet.amount / totalWinnerBets) * totalPot);
      miningPointsEarned = 40; // accuracy PoC bonus
    }

    // Update bet result
    await supabase
      .from("bets")
      .update({
        is_correct: isCorrect,
        prediction_points_earned: predictionPointsEarned,
        mining_points_earned: miningPointsEarned,
      })
      .eq("id", bet.id);

    // Update agent points + stats
    const { data: agent } = await supabase
      .from("agents")
      .select("prediction_points, mining_points, total_wins")
      .eq("wallet", bet.wallet)
      .single();

    if (agent) {
      await supabase
        .from("agents")
        .update({
          prediction_points: agent.prediction_points + predictionPointsEarned,
          mining_points: agent.mining_points + miningPointsEarned,
          total_wins: isCorrect ? agent.total_wins + 1 : agent.total_wins,
        })
        .eq("wallet", bet.wallet);
    }
  }

  // Mark pool as resolved
  await supabase
    .from("pools")
    .update({
      status: "resolved",
      outcome,
      resolved_at: new Date().toISOString(),
      resolved_mc: resolvedMc,
    })
    .eq("id", poolId);

  console.log(`Pool ${poolId} resolved: ${outcome} | pot: ${totalPot} | winners: ${winners.length}`);
}

Deno.serve(async () => {
  try {
    const now = new Date().toISOString();

    // Get all open pools
    const { data: pools } = await supabase
      .from("pools")
      .select("*")
      .eq("status", "open");

    if (!pools || pools.length === 0) {
      return new Response(JSON.stringify({ message: "No open pools" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let resolved = 0;

    for (const pool of pools) {
      const currentMc = await getTokenMC(pool.token_address);

      // Update peak_mc if higher
      if (currentMc > (pool.peak_mc ?? 0)) {
        await supabase
          .from("pools")
          .update({ peak_mc: currentMc })
          .eq("id", pool.id);
      }

      const peakMc = Math.max(currentMc, pool.peak_mc ?? 0);

      // Check deadline passed → resolve NO
      if (new Date(pool.closes_at) < new Date(now)) {
        const outcome = peakMc >= pool.target_mc ? "yes" : "no";
        await resolvePool(pool.id, outcome, currentMc);
        resolved++;
        continue;
      }

      // Early resolve: peak MC reached target → resolve YES
      if (peakMc >= pool.target_mc) {
        await resolvePool(pool.id, "yes", currentMc);
        resolved++;
      }
    }

    return new Response(
      JSON.stringify({ message: `Resolved ${resolved} pools`, checked: pools.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
