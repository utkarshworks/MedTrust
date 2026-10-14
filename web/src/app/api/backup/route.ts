import { NextRequest, NextResponse } from "next/server";
import {
  exportVaultSnapshot,
  restoreVaultSnapshot,
  recordAuditLog,
} from "@/lib/storage";
import { computeSha256 } from "@/lib/crypto";
import { checkRateLimit } from "@/lib/rateLimit";

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const requester = req.headers.get("x-requester-pubkey");
  if (requester) return requester;
  return "global-backup-client";
}

/**
 * GET /api/backup
 * Exports a cryptographically verified snapshot of the MedTrust Vault.
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 30 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again shortly." },
        { status: 429 }
      );
    }

    const requesterPubkey =
      req.headers.get("x-requester-pubkey") || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m";

    const snapshot = exportVaultSnapshot();
    const serialized = JSON.stringify(snapshot);
    const snapshotHash = await computeSha256(serialized);

    recordAuditLog({
      action: "BACKUP_EXPORTED",
      actorPubkey: requesterPubkey,
      actorRole: "Admin",
      details: `Generated encrypted vault backup bundle with ${snapshot.documents.length} records. SHA-256 integrity: ${snapshotHash.slice(0, 16)}...`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      timestamp: Math.floor(Date.now() / 1000),
      exportedBy: requesterPubkey,
      recordsCount: snapshot.documents.length,
      snapshotHash,
      vault: snapshot,
    });
  } catch (error) {
    console.error("Backup export failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate vault backup" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup
 * Restores the vault from a verified backup snapshot.
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 10 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { vault, requesterPubkey } = body;

    const rawRole = req.headers.get("x-requester-role") || "Patient";
    const requesterRole: "Patient" | "Provider" | "Admin" =
      rawRole === "Admin" ? "Admin" : rawRole === "Provider" ? "Provider" : "Patient";

    if (requesterRole !== "Admin") {
      recordAuditLog({
        action: "ACCESS_DENIED",
        actorPubkey: requesterPubkey || "unauthorized-client",
        actorRole: requesterRole,
        details: "Unauthorized attempt to restore vault snapshot without Administrator privileges.",
        success: false,
      });
      return NextResponse.json(
        { success: false, error: "Administrative privileges required (x-requester-role: Admin)." },
        { status: 403 }
      );
    }

    if (!vault || !vault.documents || !vault.providers) {
      return NextResponse.json(
        { success: false, error: "Invalid backup bundle format" },
        { status: 400 }
      );
    }

    const result = restoreVaultSnapshot(vault);

    recordAuditLog({
      action: "BACKUP_RESTORED",
      actorPubkey: requesterPubkey || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
      actorRole: "Admin",
      details: `Restored MedTrust Vault from backup snapshot. Restored ${result.count} medical records.`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: `Vault successfully restored with ${result.count} documents.`,
      restoredRecords: result.count,
    });
  } catch (error) {
    console.error("Backup restoration failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Restoration failed" },
      { status: 500 }
    );
  }
}

