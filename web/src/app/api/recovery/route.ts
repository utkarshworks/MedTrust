import { NextRequest, NextResponse } from "next/server";
import {
  getPatientProfile,
  savePatientProfile,
  hashRecoveryPhrase,
  rebindPatientVault,
  recordAuditLog,
} from "@/lib/storage";
import { checkRateLimit } from "@/lib/rateLimit";

const RECOVERY_WORDLIST = [
  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot",
  "golf", "hotel", "india", "juliet", "kilo", "lima",
  "mike", "november", "oscar", "papa", "quebec", "romeo",
  "sierra", "tango", "uniform", "victor", "whiskey", "xray",
  "yankee", "zulu", "anchor", "beacon", "crypto", "cipher",
  "digest", "genesis", "ledger", "matrix", "nexus", "orbit",
  "pulse", "quantum", "solana", "trust", "vault", "zenith"
];

function generate12WordPhrase(seed: string): string {
  // Deterministic 12-word generation using seed hash
  const hash = hashRecoveryPhrase(seed + "-medtrust-recovery-salt-2026");
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    const chunk = hash.substring(i * 4, i * 4 + 4);
    const index = parseInt(chunk, 16) % RECOVERY_WORDLIST.length;
    words.push(RECOVERY_WORDLIST[index]);
  }
  return words.join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(req.headers.get("x-forwarded-for") || "recovery-client", {
      maxRequests: 30,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many recovery attempts. Rate limit exceeded." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { action } = body;

    // 1. Generate 12-word recovery phrase
    if (action === "generate_phrase") {
      const { pubkey } = body;
      if (!pubkey) {
        return NextResponse.json({ success: false, error: "Missing patient wallet pubkey" }, { status: 400 });
      }

      let profile = getPatientProfile(pubkey);
      if (!profile) {
        profile = {
          pubkey,
          name: "Patient",
          dob: "1994-01-01",
          bloodGroup: "O+",
          allergies: [],
          emergencyContact: "None specified",
          createdAt: Math.floor(Date.now() / 1000),
        };
      }

      const phrase = generate12WordPhrase(pubkey);
      profile.recoveryHash = hashRecoveryPhrase(phrase);
      savePatientProfile(profile);

      recordAuditLog({
        action: "ACCOUNT_RECOVERY_KEY_GENERATED",
        actorPubkey: pubkey,
        actorRole: "Patient",
        details: `Cryptographic 12-word emergency account recovery keyphrase generated for ${pubkey}.`,
        success: true,
      });

      return NextResponse.json({
        success: true,
        phrase,
        message: "Recovery keyphrase generated successfully. Keep this phrase strictly confidential.",
      });
    }

    // 2. Set Guardian Wallet Address
    if (action === "set_guardian") {
      const { pubkey, guardianPubkey } = body;
      if (!pubkey || !guardianPubkey) {
        return NextResponse.json({ success: false, error: "Missing pubkey or guardianPubkey" }, { status: 400 });
      }

      const profile = getPatientProfile(pubkey);
      if (!profile) {
        return NextResponse.json({ success: false, error: "Patient profile not found" }, { status: 404 });
      }

      profile.guardianPubkey = guardianPubkey;
      savePatientProfile(profile);

      recordAuditLog({
        action: "ACCOUNT_RECOVERY_KEY_GENERATED",
        actorPubkey: pubkey,
        actorRole: "Patient",
        details: `Designated trusted guardian wallet (${guardianPubkey}) for emergency wallet recovery.`,
        success: true,
      });

      return NextResponse.json({ success: true, guardianPubkey });
    }

    // 3. Recover Account via 12-word Recovery Phrase
    if (action === "recover_account") {
      const { oldPubkey, newPubkey, recoveryPhrase } = body;
      if (!oldPubkey || !newPubkey || !recoveryPhrase) {
        return NextResponse.json(
          { success: false, error: "Missing required fields (oldPubkey, newPubkey, recoveryPhrase)" },
          { status: 400 }
        );
      }

      const profile = getPatientProfile(oldPubkey);
      if (!profile || !profile.recoveryHash) {
        return NextResponse.json(
          { success: false, error: "No recovery keyphrase on file for this account." },
          { status: 404 }
        );
      }

      const incomingHash = hashRecoveryPhrase(recoveryPhrase);
      if (incomingHash !== profile.recoveryHash) {
        recordAuditLog({
          action: "ACCESS_DENIED",
          actorPubkey: newPubkey,
          actorRole: "Patient",
          details: `Account recovery attempt for ${oldPubkey} FAILED: Invalid recovery phrase.`,
          success: false,
        });

        return NextResponse.json(
          { success: false, error: "Invalid recovery phrase. Verification failed." },
          { status: 403 }
        );
      }

      // Re-bind vault to new pubkey!
      const result = rebindPatientVault(oldPubkey, newPubkey, "RecoveryPhrase", newPubkey);
      return NextResponse.json({
        success: true,
        message: `Account successfully recovered! Re-anchored ${result.reboundCount} records to your new wallet.`,
        reboundCount: result.reboundCount,
      });
    }

    // 4. Recover Account via Designated Guardian Key
    if (action === "guardian_recover") {
      const { oldPubkey, newPubkey, guardianPubkey } = body;
      if (!oldPubkey || !newPubkey || !guardianPubkey) {
        return NextResponse.json(
          { success: false, error: "Missing required fields for guardian recovery" },
          { status: 400 }
        );
      }

      const profile = getPatientProfile(oldPubkey);
      if (!profile || !profile.guardianPubkey) {
        return NextResponse.json(
          { success: false, error: "No guardian authorized for this account." },
          { status: 404 }
        );
      }

      if (profile.guardianPubkey !== guardianPubkey) {
        recordAuditLog({
          action: "ACCESS_DENIED",
          actorPubkey: guardianPubkey,
          actorRole: "Patient",
          details: `Guardian recovery attempt for ${oldPubkey} FAILED: Unauthorized guardian address.`,
          success: false,
        });

        return NextResponse.json(
          { success: false, error: "Unauthorized: Provided address does not match designated guardian." },
          { status: 403 }
        );
      }

      // Re-bind vault to new pubkey!
      const result = rebindPatientVault(oldPubkey, newPubkey, "GuardianKey", guardianPubkey);
      return NextResponse.json({
        success: true,
        message: `Guardian authorization verified! Re-anchored ${result.reboundCount} records to ${newPubkey}.`,
        reboundCount: result.reboundCount,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported recovery action" }, { status: 400 });
  } catch (error) {
    console.error("Recovery handler error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

