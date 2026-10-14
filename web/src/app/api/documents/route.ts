import { NextRequest, NextResponse } from "next/server";
import {
  listDocuments,
  saveDocument,
  recordAuditLog,
  getDocumentById,
  MedicalDocumentRecord,
} from "@/lib/storage";
import { getRecordPda } from "@/lib/record";
import { checkRateLimit } from "@/lib/rateLimit";
import { PublicKey } from "@solana/web3.js";

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

    let docs = listDocuments();

    if (patient) {
      docs = docs.filter((d) => d.patientPubkey === patient);
    }
    if (provider) {
      docs = docs.filter((d) => d.providerPubkey === provider);
    }

    // Strip full plaintext from listing for security while preserving encrypted envelope
    const sanitized = docs.map((d) => ({
      id: d.id,
      recordId: d.recordId,
      parentRecordId: d.parentRecordId,
      parentHash: d.parentHash,
      amendmentReason: d.amendmentReason,
      patientPubkey: d.patientPubkey,
      providerPubkey: d.providerPubkey,
      title: d.title,
      category: d.category,
      date: d.date,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      envelope: d.envelope || {
        algorithm: "AES-256-GCM",
        iv: "",
        ciphertext: "",
        sha256Hash: "",
      },
      sha256Hash: d.envelope?.sha256Hash || "",
      pda: d.pda,
      version: d.version,
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ success: true, documents: sanitized });
  } catch (error) {
    console.error("Failed to list documents:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientIdentifier(req), { maxRequests: 60 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again shortly." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      patientPubkey,
      providerPubkey,
      title,
      category,
      content,
      envelope,
      recordId,
      signatureTx,
      parentRecordId,
      amendmentReason,
    } = body;

    if (!patientPubkey || !title || !content || !envelope) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const patientPk = new PublicKey(patientPubkey);
    const assignedRecordId = recordId ?? (Date.now() % 100000);
    const pda = getRecordPda(patientPk, assignedRecordId).toBase58();

    let version = 1;
    let parentHash: string | undefined = undefined;
    if (parentRecordId) {
      const parentDoc = getDocumentById(String(parentRecordId));
      if (parentDoc) {
        version = (parentDoc.version || 1) + 1;
        parentHash = parentDoc.envelope.sha256Hash;
      }
    }

    const newDoc: MedicalDocumentRecord = {
      id: `doc-${Date.now()}`,
      recordId: assignedRecordId,
      parentRecordId: parentRecordId ? Number(parentRecordId) : undefined,
      parentHash,
      amendmentReason,
      patientPubkey,
      providerPubkey: providerPubkey || patientPubkey,
      title,
      category: category || "Clinical Note",
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      mimeType: "text/plain",
      sizeBytes: new TextEncoder().encode(content).length,
      envelope,
      plaintextPreview: content,
      pda,
      version,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
      signatureTx,
    };

    saveDocument(newDoc);

    if (parentRecordId) {
      recordAuditLog({
        action: "RECORD_AMENDED",
        actorPubkey: patientPubkey,
        actorRole: "Patient",
        targetId: newDoc.id,
        details: `Created amendment v${newDoc.version} for parent record #${parentRecordId} (${newDoc.title}). Reason: ${amendmentReason || "Clinical update"}. Anchored on Solana PDA ${newDoc.pda}.`,
        success: true,
        txHash: signatureTx,
      });
    } else {
      recordAuditLog({
        action: "DOCUMENT_CREATED",
        actorPubkey: patientPubkey,
        actorRole: "Patient",
        targetId: newDoc.id,
        details: `Created medical record #${newDoc.recordId} (${newDoc.title}) anchored on Solana PDA ${newDoc.pda}.`,
        success: true,
        txHash: signatureTx,
      });
    }

    return NextResponse.json({
      success: true,
      document: newDoc,
      pda,
      recordId: assignedRecordId,
      version: newDoc.version,
    });
  } catch (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

