import { NextRequest, NextResponse } from "next/server";
import { updateProviderStatus, recordAuditLog } from "@/lib/storage";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requesterRole = req.headers.get("x-requester-role") || "Patient";

    if (requesterRole !== "Admin") {
      recordAuditLog({
        action: "ACCESS_DENIED",
        actorPubkey: req.headers.get("x-requester-pubkey") || "unauthorized-actor",
        actorRole: requesterRole as "Patient" | "Provider" | "Admin",
        targetId: id,
        details: "Unauthorized attempt to modify provider licensing credentials without Administrator credentials.",
        success: false,
      });

      return NextResponse.json(
        { success: false, error: "Access Denied (RBAC 403): Platform Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status, adminPubkey } = body;

    if (!status || !["Verified", "Pending", "Suspended"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value. Must be 'Verified', 'Pending', or 'Suspended'." },
        { status: 400 }
      );
    }

    const updated = updateProviderStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Provider not found" },
        { status: 404 }
      );
    }

    recordAuditLog({
      action: status === "Verified" ? "PROVIDER_VERIFIED" : "PROVIDER_SUSPENDED",
      actorPubkey: adminPubkey || "admin",
      actorRole: "Admin",
      targetId: updated.id,
      details: `Administrator updated provider '${updated.name}' credentials status to ${status}.`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      provider: updated,
      message: `Provider status updated to ${status}.`,
    });
  } catch (error) {
    console.error("Failed to update provider status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

