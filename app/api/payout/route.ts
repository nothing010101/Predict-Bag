import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getWalletInfo } from "@/lib/basescan";
import { calculatePayout } from "@/lib/mining";

// GET — dipanggil saat CHECK button diklik di payout page
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("prediction_points")
    .eq("wallet", wallet)
    .single();

  const walletInfo = await getWalletInfo(wallet);

  return NextResponse.json({
    prediction_points: agent?.prediction_points ?? 0,
    wallet_age_days: walletInfo.ageInDays,
    wallet_tx_count: walletInfo.txCount,
  });
}

// POST — request payout
export async function POST(req: NextRequest) {
  const { wallet } = await req.json();

  if (!wallet) {
    return NextResponse.json({ message: "wallet required" }, { status: 400 });
  }

  // Get agent
  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("*")
    .eq("wallet", wallet)
    .single();

  if (!agent) {
    return NextResponse.json({ message: "Agent not found. Place a bet first." }, { status: 404 });
  }

  // Check minimum points
  if (agent.prediction_points < 1000) {
    return NextResponse.json({
      message: `Insufficient prediction points. You have ${agent.prediction_points}, need 1,000.`,
    }, { status: 400 });
  }

  // Anti-sybil check (fresh)
  const walletInfo = await getWalletInfo(wallet);

  if (!walletInfo.isEligible) {
    return NextResponse.json({
      message: walletInfo.reason ?? "Wallet not eligible for payout",
    }, { status: 400 });
  }

  // Check no pending request already exists
  const { data: existing } = await supabaseAdmin
    .from("payout_requests")
    .select("id")
    .eq("wallet", wallet)
    .eq("status", "pending")
    .single();

  if (existing) {
    return NextResponse.json({
      message: "You already have a pending payout request. Wait for it to be processed.",
    }, { status: 400 });
  }

  const pointsToConvert = agent.prediction_points;
  const predictbagAmount = calculatePayout(pointsToConvert);

  // Create payout request
  const { error } = await supabaseAdmin
    .from("payout_requests")
    .insert({
      wallet,
      prediction_points_spent: pointsToConvert,
      predictbag_amount: predictbagAmount.toString(),
      wallet_age_days: walletInfo.ageInDays,
      wallet_tx_count: walletInfo.txCount,
      status: "pending",
    });

  if (error) {
    return NextResponse.json({ message: "Failed to create payout request" }, { status: 500 });
  }

  // Deduct prediction points
  await supabaseAdmin
    .from("agents")
    .update({ prediction_points: 0 })
    .eq("wallet", wallet);

  return NextResponse.json({
    message: "Payout request submitted successfully",
    prediction_points_spent: pointsToConvert,
    predictbag_amount: predictbagAmount.toString(),
    estimated_processing: "Within 12 hours",
  });
}
