import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateMining } from "../../lib/mining.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  try {
    const epochEnd = new Date();
    const epochStart = new Date(epochEnd.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Get all bets placed in this epoch
    const { data: epochBets } = await supabase
      .from("bets")
      .select("wallet, pool_id, is_correct, is_early, placed_at")
      .gte("placed_at", epochStart.toISOString())
      .lt("placed_at", epochEnd.toISOString());

    if (!epochBets || epochBets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bets this epoch" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Group by wallet
    const walletMap: Record<string, {
      betsPlaced: number;
      betsWon: number;
      earlyBets: number;
      pools: Set<string>;
    }> = {};

    for (const bet of epochBets) {
      if (!walletMap[bet.wallet]) {
        walletMap[bet.wallet] = { betsPlaced: 0, betsWon: 0, earlyBets: 0, pools: new Set() };
      }
      walletMap[bet.wallet].betsPlaced++;
      if (bet.is_correct) walletMap[bet.wallet].betsWon++;
      if (bet.is_early) walletMap[bet.wallet].earlyBets++;
      walletMap[bet.wallet].pools.add(bet.pool_id);
    }

    let processed = 0;

    for (const [wallet, contrib] of Object.entries(walletMap)) {
      const mining = calculateMining({
        betsPlaced: contrib.betsPlaced,
        betsWon: contrib.betsWon,
        earlyBets: contrib.earlyBets,
        poolDiversity: contrib.pools.size,
      });

      if (mining.total === 0) continue;

      // Record epoch
      await supabase.from("mining_epochs").upsert({
        wallet,
        epoch_start: epochStart.toISOString(),
        epoch_end: epochEnd.toISOString(),
        bets_placed: contrib.betsPlaced,
        bets_won: contrib.betsWon,
        early_bets: contrib.earlyBets,
        pool_diversity: contrib.pools.size,
        base_points: mining.basePoints,
        accuracy_bonus: mining.accuracyBonus,
        early_bonus: mining.earlyBonus,
        diversity_bonus: mining.diversityBonus,
        total_mined: mining.total,
      });

      // Add mining points to agent
      const { data: agent } = await supabase
        .from("agents")
        .select("mining_points")
        .eq("wallet", wallet)
        .single();

      if (agent) {
        await supabase
          .from("agents")
          .update({ mining_points: agent.mining_points + mining.total })
          .eq("wallet", wallet);
      }

      processed++;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processed} agents for epoch`,
        epoch_start: epochStart.toISOString(),
        epoch_end: epochEnd.toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
