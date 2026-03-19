import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeframe = searchParams.get("timeframe");
  const status = searchParams.get("status") ?? "open";

  let query = supabase
    .from("pools")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (timeframe && ["fast", "medium", "slow"].includes(timeframe)) {
    query = query.eq("timeframe", timeframe);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pools: data, count: data.length });
}
