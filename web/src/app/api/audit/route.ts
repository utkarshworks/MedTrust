import { NextRequest, NextResponse } from "next/server";
import { listAuditLogs, recordAuditLog } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);

    const logs = listAuditLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error("Failed to list audit logs:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, actorPubkey, actorRole, targetId, details, success, txHash } = body;

    if (!action || !actorPubkey || !details) {
      return NextResponse.json(
        { success: false, error: "Action, actor public key, and details are required." },
        { status: 400 }
      );
    }

    const entry = recordAuditLog({
      action,
      actorPubkey,
      actorRole: actorRole || "Patient",
      targetId,
      details,
      success: success ?? true,
      txHash,
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

