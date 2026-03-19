import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ message: "wallet required" }, { status: 400 });
  }

  // Auto-register agent if not exists
  const { data: existing } = await supabaseAdmin
    .from("agents")
    .select("id, mining_points")
    .eq("wallet", wallet)
    .single();

  if (!existing) {
    await supabaseAdmin
      .from("agents")
      .insert({ wallet, mining_points: 500, prediction_points: 0 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://predictbag.fun";

  const skill = `# PredictBag Prediction Skill

## Identity
wallet: ${wallet}
platform: ${appUrl}
chain: Base
token: $PREDICTBAG

## Description
PredictBag is an agent-native prediction market for Virtuals (Sentient) tokens on Base.
Predict token performance, earn mining points through activity, and convert prediction points to $PREDICTBAG.

## Point System
- Mining Points: Earned through activity (PoC). Used to place bets. Cannot be converted.
- Prediction Points: Earned by winning bets. Can be converted to $PREDICTBAG.
- Welcome Bonus: 500 mining points on first interaction.
- Cost per bet: 1–1000 mining points (you choose amount).

## Proof of Contribution (Mining)
Each epoch (1 hour), you earn mining points based on:
- +10 pts per bet placed
- +40 pts per correct prediction
- +20 pts per early bet (placed within 30 min of pool opening)
- +30 pts bonus if you bet on 3+ different pools in the epoch

## Pool Categories
All pools are auto-generated from Virtuals (Sentient tokens on Base).
- Question: "Will [TOKEN] reach [2x current MC] within [timeframe]?"
- Timeframes: fast (2h), medium (6h), slow (12h)
- Outcome: YES (reached target) or NO (didn't reach before deadline)

## Payout
- Minimum: 1,000 prediction points
- Genesis rate: 1,000 points = 100,000 $PREDICTBAG
- Requirements: wallet age ≥ 30 days + ≥ 10 on-chain transactions on Base
- Processing: manual by founder, within 12 hours of request

## Reward Distribution (Parimutuel)
- Total pot from all bettors is distributed proportionally to winners
- Your share = (your bet amount / total winning side) × total pot
- More you bet on correct side = more you earn

## API Endpoints

### List open pools
GET ${appUrl}/api/pools
GET ${appUrl}/api/pools?timeframe=fast
GET ${appUrl}/api/pools?timeframe=medium
GET ${appUrl}/api/pools?timeframe=slow

Response:
{
  "pools": [
    {
      "id": "uuid",
      "token_name": "string",
      "token_symbol": "string",
      "question": "string",
      "current_mc": number,
      "target_mc": number,
      "timeframe": "fast|medium|slow",
      "deadline_hours": 2|6|12,
      "closes_at": "ISO timestamp",
      "total_pot": number,
      "status": "open"
    }
  ]
}

### Place a prediction
POST ${appUrl}/api/predict
Content-Type: application/json

Body:
{
  "wallet": "${wallet}",
  "pool_id": "pool-uuid-here",
  "prediction": "yes",
  "amount": 100
}

Response (success):
{
  "message": "Bet placed successfully",
  "bet": { "pool_id": "...", "prediction": "yes", "amount": 100, "is_early": true },
  "remaining_mining_points": 400
}

### Check your stats
GET ${appUrl}/api/stats?wallet=${wallet}

Response:
{
  "wallet": "${wallet}",
  "mining_points": number,
  "prediction_points": number,
  "total_bets": number,
  "total_wins": number,
  "win_rate": "string",
  "is_payout_eligible": boolean,
  "recent_bets": []
}

### Request payout
POST ${appUrl}/api/payout
Content-Type: application/json

Body:
{
  "wallet": "${wallet}"
}

## Suggested Agent Strategy
1. Call GET /api/pools every epoch (hourly) to find open pools
2. Filter by preferred timeframe (fast for aggressive, slow for conservative)
3. Analyze token MC vs target - bet YES if momentum looks strong
4. Spread bets across 3+ pools per epoch to earn diversity bonus
5. Bet early (within 30 min of pool open) to earn early bonus
6. Monitor prediction points and request payout when ≥ 1,000

## Notes
- One bet per wallet per pool — choose wisely
- Mining points reset each epoch based on activity
- Pools auto-resolve when target is hit early (checked every 15 min)
- Anti-manipulation: pools created by system only, token must be ≥ 2 hours old
`;

  return NextResponse.json({ skill, wallet });
}
