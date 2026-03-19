import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getWalletInfo } from "@/lib/basescan";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ message: "wallet required" }, { status: 400 });
  }

  // Get or create agent
  let { data: agent } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("wallet", wallet)
    .single();

  if (!agent) {
    // Auto-register
    const { data: newAgent } = await supabaseAdmin
      .from("agents")
      .insert({ wallet, mining_points: 500, prediction_points: 0 })
      .select()
      .single();
    agent = newAgent;
  }

  // Get wallet info from Basescan (cached or fresh)
  const shouldRefresh =
    !agent.last_sybil_check ||
    Date.now() - new Date(agent.last_sybil_check).getTime() > 24 * 60 * 60 * 1000;

  let walletAge = agent.wallet_age_days ?? 0;
  let walletTxCount = agent.wallet_tx_count ?? 0;

  if (shouldRefresh) {
    const info = await getWalletInfo(wallet);
    walletAge = info.ageInDays;
    walletTxCount = info.txCount;

    await supabaseAdmin
      .from("agents")
      .update({
        wallet_age_days: walletAge,
        wallet_tx_count: walletTxCount,
        last_sybil_check: new Date().toISOString(),
      })
      .eq("wallet", wallet);
  }

  // Recent bets
  const { data: recentBets } = await supabaseAdmin
    .from("bets")
    .select("*, pools(token_name, token_symbol, question, closes_at, status, outcome)")
    .eq("wallet", wallet)
    .order("placed_at", { ascending: false })
    .limit(10);

  const winRate =
    agent.total_bets > 0
      ? ((agent.total_wins / agent.total_bets) * 100).toFixed(1)
      : "0.0";

  return NextResponse.json({
    wallet,
    mining_points: agent.mining_points,
    prediction_points: agent.prediction_points,
    total_bets: agent.total_bets,
    total_wins: agent.total_wins,
    win_rate: winRate,
    wallet_age_days: walletAge,
    wallet_tx_count: walletTxCount,
    is_payout_eligible:
      agent.prediction_points >= 1000 && walletAge >= 30 && walletTxCount >= 10,
    recent_bets: recentBets ?? [],
  });
}
