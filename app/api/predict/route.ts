import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallet, pool_id, prediction, amount } = body;

  // Basic validation
  if (!wallet || !pool_id || !prediction || !amount) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  if (!["yes", "no"].includes(prediction)) {
    return NextResponse.json({ message: "Invalid prediction value" }, { status: 400 });
  }

  if (amount < 1 || amount > 1000) {
    return NextResponse.json({ message: "Amount must be between 1 and 1000" }, { status: 400 });
  }

  // Check pool exists and is open
  const { data: pool, error: poolError } = await supabaseAdmin
    .from("pools")
    .select("*")
    .eq("id", pool_id)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ message: "Pool not found" }, { status: 404 });
  }

  if (pool.status !== "open") {
    return NextResponse.json({ message: "Pool is no longer open" }, { status: 400 });
  }

  if (new Date(pool.closes_at) < new Date()) {
    return NextResponse.json({ message: "Pool has expired" }, { status: 400 });
  }

  // Get or create agent
  let { data: agent } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("wallet", wallet)
    .single();

  if (!agent) {
    // Auto-register new agent with welcome bonus
    const { data: newAgent, error: createError } = await supabaseAdmin
      .from("agents")
      .insert({ wallet, mining_points: 500, prediction_points: 0 })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ message: "Failed to create agent" }, { status: 500 });
    }
    agent = newAgent;
  }

  // Check mining points balance
  if (agent.mining_points < amount) {
    return NextResponse.json({
      message: `Insufficient mining points. You have ${agent.mining_points}, need ${amount}`,
    }, { status: 400 });
  }

  // Check duplicate bet
  const { data: existingBet } = await supabaseAdmin
    .from("bets")
    .select("id")
    .eq("pool_id", pool_id)
    .eq("wallet", wallet)
    .single();

  if (existingBet) {
    return NextResponse.json({ message: "You already placed a bet on this pool" }, { status: 400 });
  }

  // Check if early bet (< 30 min after pool opened)
  const poolOpenedAt = new Date(pool.opened_at ?? pool.created_at);
  const isEarly = (Date.now() - poolOpenedAt.getTime()) < 30 * 60 * 1000;

  // Place bet
  const { error: betError } = await supabaseAdmin
    .from("bets")
    .insert({
      pool_id,
      wallet,
      prediction,
      amount,
      is_early: isEarly,
    });

  if (betError) {
    return NextResponse.json({ message: "Failed to place bet" }, { status: 500 });
  }

  // Deduct mining points + update stats
  await supabaseAdmin
    .from("agents")
    .update({
      mining_points: agent.mining_points - amount,
      total_bets: agent.total_bets + 1,
      last_active: new Date().toISOString(),
    })
    .eq("wallet", wallet);

  // Update pool total pot
  await supabaseAdmin
    .from("pools")
    .update({ total_pot: pool.total_pot + amount })
    .eq("id", pool_id);

  return NextResponse.json({
    message: "Bet placed successfully",
    bet: { pool_id, prediction, amount, is_early: isEarly },
    remaining_mining_points: agent.mining_points - amount,
  });
}
