import { NextRequest, NextResponse } from "next/server";
import { getDocumentById, getRecordLineage, recordAuditLog, listProviders } from "@/lib/storage";
import { getConsent, getConsentPda } from "@/lib/consent";
import { checkRateLimit } from "@/lib/rateLimit";
import { PublicKey } from "@solana/web3.js";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getClientIdentifier(req: NextRequest, requesterPubkey?: string | null): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (requesterPubkey) return requesterPubkey;
  return "global-client";
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requesterPubkey = req.headers.get("x-requester-pubkey");
    const requesterRole = req.headers.get("x-requester-role") || "Patient";

    const rateLimit = checkRateLimit(getClientIdentifier(req, requesterPubkey), { maxRequests: 120 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const doc = getDocumentById(id);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Medical record not found" },
        { status: 404 }
      );
    }

    const lineage = getRecordLineage(doc.recordId);

    // 1. Patient Owner access check
    if (requesterPubkey && requesterPubkey === doc.patientPubkey) {
      recordAuditLog({
        action: "DOCUMENT_ACCESSED",
        actorPubkey: requesterPubkey,
        actorRole: "Patient",
        targetId: doc.id,
        details: `Patient owner accessed medical document #${doc.recordId} (${doc.title}).`,
        success: true,
      });

      return NextResponse.json({
        success: true,
        document: doc,
        lineage,
        accessGranted: true,
        authorizationReason: "Owner",
      });
    }

    // 2. Emergency "Break-Glass" Access Protocol (HIPAA § 164.312(a)(2)(ii))
    const isBreakGlass = req.headers.get("x-emergency-break-glass") === "true";
    const breakGlassReason =
      req.headers.get("x-break-glass-reason") || "Acute emergency medical evaluation";

    if (isBreakGlass && requesterPubkey) {
      const providers = listProviders();
      const verifiedProvider = providers.find(
        (p) => p.pubkey === requesterPubkey && p.verificationStatus === "Verified"
      );

      if (!verifiedProvider) {
        recordAuditLog({
          action: "ACCESS_DENIED",
          actorPubkey: requesterPubkey,
          actorRole: "Provider",
          targetId: doc.id,
          details: `Emergency Break-Glass REJECTED: Provider is not verified. Reason: ${breakGlassReason}.`,
          success: false,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Emergency Break-Glass Denied: Only verified healthcare providers may invoke emergency access protocols.",
            accessGranted: false,
          },
          { status: 403 }
        );
      }

      // Valid emergency break-glass!
      recordAuditLog({
        action: "EMERGENCY_BREAK_GLASS",
        actorPubkey: requesterPubkey,
        actorRole: "Provider",
        targetId: doc.id,
        details: `[EMERGENCY BREAK-GLASS] ${verifiedProvider.name} (License #${verifiedProvider.licenseNumber}) accessed record #${doc.recordId} (${doc.title}) under acute emergency protocol. Justification: ${breakGlassReason}.`,
        success: true,
      });

      return NextResponse.json({
        success: true,
        document: doc,
        lineage,
        accessGranted: true,
        authorizationReason: "EmergencyBreakGlass",
        breakGlassDetails: {
          invokedBy: verifiedProvider.name,
          license: verifiedProvider.licenseNumber,
          reason: breakGlassReason,
          timestamp: Math.floor(Date.now() / 1000),
        },
      });
    }

    // 3. Healthcare Provider Access Boundary Check (On-Chain Consent)
    if (requesterPubkey) {
      try {
        const patientPk = new PublicKey(doc.patientPubkey);
        const providerPk = new PublicKey(requesterPubkey);
        const consentPda = getConsentPda(patientPk, providerPk, doc.recordId);

        // Query on-chain consent status
        const consent = await getConsent(consentPda);
        const now = Math.floor(Date.now() / 1000);

        const isActive = consent && consent.active && consent.expiresAt > now;

        if (!isActive) {
          const reason = !consent
            ? "No on-chain consent granted for this provider"
            : !consent.active
              ? "Consent was revoked by the patient"
              : "Consent has expired";

          recordAuditLog({
            action: "ACCESS_DENIED",
            actorPubkey: requesterPubkey,
            actorRole: "Provider",
            targetId: doc.id,
            details: `Unauthorized retrieval attempt for record #${doc.recordId}. Reason: ${reason}.`,
            success: false,
          });

          return NextResponse.json(
            {
              success: false,
              error: `Access Denied: ${reason}. An active, non-expired Solana consent account is required.`,
              accessGranted: false,
              consentStatus: !consent ? "NotFound" : !consent.active ? "Revoked" : "Expired",
              consentPda: consentPda.toBase58(),
            },
            { status: 403 }
          );
        }

        // Active consent verified on-chain!
        recordAuditLog({
          action: "DOCUMENT_ACCESSED",
          actorPubkey: requesterPubkey,
          actorRole: "Provider",
          targetId: doc.id,
          details: `Authorized provider (${requesterPubkey.slice(0, 4)}...${requesterPubkey.slice(-4)}) retrieved record #${doc.recordId} with valid Solana consent.`,
          success: true,
        });

        return NextResponse.json({
          success: true,
          document: doc,
          lineage,
          accessGranted: true,
          authorizationReason: "ActiveConsentOnChain",
          consentExpiry: consent.expiresAt,
        });
      } catch (err) {
        console.error("Error validating on-chain consent:", err);
      }
    }

    // Default fallback: If no valid credentials provided
    recordAuditLog({
      action: "ACCESS_DENIED",
      actorPubkey: requesterPubkey || "anonymous",
      actorRole: requesterRole as "Patient" | "Provider" | "Admin",
      targetId: doc.id,
      details: `Unauthenticated access attempt for medical record #${doc.recordId}.`,
      success: false,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Access Denied: Active on-chain consent permission is required.",
        accessGranted: false,
      },
      { status: 403 }
    );
  } catch (error) {
    console.error("Error retrieving document:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

