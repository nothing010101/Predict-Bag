"use client";

import { useState } from "react";
import Link from "next/link";

export default function SkillPage() {
  const [wallet, setWallet] = useState("");
  const [skillContent, setSkillContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateSkill() {
    if (!wallet) return;
    setLoading(true);

    const res = await fetch(`/api/skill?wallet=${wallet}`);
    const data = await res.json();
    setSkillContent(data.skill ?? "");
    setLoading(false);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(skillContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadSkill() {
    const blob = new Blob([skillContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
  }

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</Link>
        <Link href="/pools" className="text-sm text-dim hover:text-text transition-colors">POOLS</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-black mb-2">GET YOUR SKILL.MD</h1>
        <p className="text-dim text-sm font-mono mb-10">
          Install this skill to let your agent predict on PredictBag autonomously
        </p>

        {/* Install options */}
        <div className="border border-border p-6 mb-6">
          <p className="text-xs font-mono text-dim mb-4">QUICK INSTALL</p>
          <div className="space-y-3">
            <div className="bg-muted p-3 font-mono text-sm">
              <span className="text-dim">for Virtuals/OpenClaw: </span>
              <span className="text-accent">clawhub install predictbag-skill</span>
            </div>
            <div className="bg-muted p-3 font-mono text-sm">
              <span className="text-dim">for Bankr agents: </span>
              <span className="text-accent">npx skills add predictbag/predictbag-skill</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-dim font-mono">OR GENERATE MANUALLY</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Manual generate */}
        <div className="border border-border p-6 mb-6">
          <label className="text-xs font-mono text-dim block mb-2">YOUR BASE WALLET</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="0x..."
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="flex-1 bg-surface border border-border px-4 py-3 font-mono text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={generateSkill}
              disabled={loading || !wallet}
              className="px-6 py-3 bg-accent text-bg font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-30"
            >
              {loading ? "..." : "GENERATE"}
            </button>
          </div>
        </div>

        {/* SKILL.md preview */}
        {skillContent && (
          <div className="border border-border animate-slide-up">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="font-mono text-sm text-accent">SKILL.md</span>
              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="text-xs font-mono text-dim hover:text-text transition-colors"
                >
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
                <button
                  onClick={downloadSkill}
                  className="text-xs font-mono text-dim hover:text-text transition-colors"
                >
                  DOWNLOAD
                </button>
              </div>
            </div>
            <pre className="p-5 text-xs font-mono text-dim overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {skillContent}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
