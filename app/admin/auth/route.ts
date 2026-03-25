import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();

  const adminSecret = process.env.ADMIN_SECRET;

  console.log("Received:", JSON.stringify(secret));
  console.log("Expected:", JSON.stringify(adminSecret));
  console.log("Match:", secret === adminSecret);

  if (!adminSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (secret !== adminSecret) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });

  res.cookies.set("admin_session", adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return res;
}

export async function DELETE(_req: NextRequest) {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("admin_session");
  return res;
}
