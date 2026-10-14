import { NextRequest, NextResponse } from "next/server";
import {
  listConsents,
  saveConsent,
  revokeConsentRecord,
  recordAuditLog,
  ConsentRecord,
} from "@/lib/storage";
import { checkRateLimit } from "@/lib/rateLimit";

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const requester = req.headers.get("x-requester-pubkey");
  if (requester) return requester;
  return "global-client";
}

export async function GET(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 120 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const patient = searchParams.get("patient") || undefined;
    const provider = searchParams.get("provider") || undefined;

    const consents = listConsents(patient, provider);

    return NextResponse.json({
      success: true,
      consents,
      count: consents.length,
    });
  } catch (error) {
    console.error("Failed to list consents:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve consent records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      pda,
      patientPubkey,
      providerPubkey,
      recordId,
      recordTitle,
      grantedAt,
      expiresAt,
      active,
      txHash,
    } = body;

    if (!pda || !patientPubkey || !providerPubkey || !recordId || !expiresAt) {
      return NextResponse.json(
        { success: false, error: "Missing required consent fields" },
        { status: 400 }
      );
    }

    const consentRecord: ConsentRecord = {
      pda,
      patientPubkey,
      providerPubkey,
      recordId: Number(recordId),
      recordTitle: recordTitle || `Record #${recordId}`,
      grantedAt: grantedAt || Math.floor(Date.now() / 1000),
      expiresAt: Number(expiresAt),
      active: active ?? true,
      txHash,
    };

    saveConsent(consentRecord);

    recordAuditLog({
      action: "CONSENT_GRANTED",
      actorPubkey: patientPubkey,
      actorRole: "Patient",
      targetId: providerPubkey,
      details: `Granted record access permission to provider (${providerPubkey.slice(0, 4)}...${providerPubkey.slice(-4)}) for Record #${recordId}.`,
      success: true,
      txHash,
    });

    return NextResponse.json({
      success: true,
      consent: consentRecord,
      message: "Consent record saved successfully",
    });
  } catch (error) {
    console.error("Failed to save consent:", error);
    return NextResponse.json(
      { success: false, error: "Failed to register consent record" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { pda, patientPubkey, providerPubkey, recordId, txHash } = body;

    const identifier = pda || `${providerPubkey}-${recordId}` || recordId?.toString();
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Identifier (pda or providerPubkey + recordId) is required." },
        { status: 400 }
      );
    }

    const revoked = revokeConsentRecord(identifier);

    recordAuditLog({
      action: "CONSENT_REVOKED",
      actorPubkey: patientPubkey || "patient",
      actorRole: "Patient",
      targetId: providerPubkey || identifier,
      details: `Revoked access permission from provider for Record #${recordId || identifier}.`,
      success: true,
      txHash,
    });

    return NextResponse.json({
      success: true,
      revoked,
      message: "Consent record marked as revoked",
    });
  } catch (error) {
    console.error("Failed to revoke consent:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke consent record" },
      { status: 500 }
    );
  }
}

