import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET - fetch all payout requests
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("payout_requests")
    .select("*")
    .order("requested_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payouts: data ?? [] });
}

// PATCH - mark as sent or rejected
export async function PATCH(req: NextRequest) {
  const { id, tx_hash, status, rejection_reason } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ message: "id and status required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (tx_hash) update.tx_hash = tx_hash;
  if (rejection_reason) update.rejection_reason = rejection_reason;

  // If rejected, refund prediction points to agent
  if (status === "rejected") {
    const { data: payout } = await supabaseAdmin
      .from("payout_requests")
      .select("wallet, prediction_points_spent")
      .eq("id", id)
      .single();

    if (payout) {
      const { data: agent } = await supabaseAdmin
        .from("agents")
        .select("prediction_points")
        .eq("wallet", payout.wallet)
        .single();

      if (agent) {
        await supabaseAdmin
          .from("agents")
          .update({
            prediction_points: agent.prediction_points + payout.prediction_points_spent,
          })
          .eq("wallet", payout.wallet);
      }
    }
  }

  const { error } = await supabaseAdmin
    .from("payout_requests")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: "Updated successfully" });
}
