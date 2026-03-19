const API_KEY = process.env.BASESCAN_API_KEY!;
const BASE_URL = "https://api.etherscan.io/v2/api?chainid=8453";

export interface WalletInfo {
  ageInDays: number;
  txCount: number;
  isEligible: boolean; // age >= 30 days AND tx >= 10
  reason?: string;
}

export async function getWalletInfo(address: string): Promise<WalletInfo> {
  try {
    // Get first transaction (to determine wallet age)
    const txRes = await fetch(
      `${BASE_URL}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${API_KEY}`
    );
    const txData = await txRes.json();
    const txList = txData?.result ?? [];

    if (!Array.isArray(txList) || txList.length === 0) {
      return {
        ageInDays: 0,
        txCount: 0,
        isEligible: false,
        reason: "No transactions found on Base",
      };
    }

    // Wallet age dari tx pertama
    const firstTxTimestamp = parseInt(txList[0].timeStamp) * 1000;
    const ageInDays = Math.floor(
      (Date.now() - firstTxTimestamp) / (1000 * 60 * 60 * 24)
    );

    // Total tx count
    const countRes = await fetch(
      `${BASE_URL}&module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest&apikey=${API_KEY}`
    );
    const countData = await countRes.json();
    const txCount = parseInt(countData?.result ?? "0x0", 16);

    const isEligible = ageInDays >= 30 && txCount >= 10;
    let reason: string | undefined;

    if (!isEligible) {
      if (ageInDays < 30) reason = `Wallet too new (${ageInDays} days, need 30)`;
      else if (txCount < 10) reason = `Not enough activity (${txCount} tx, need 10)`;
    }

    return { ageInDays, txCount, isEligible, reason };
  } catch {
    return {
      ageInDays: 0,
      txCount: 0,
      isEligible: false,
      reason: "Failed to check wallet",
    };
  }
}
