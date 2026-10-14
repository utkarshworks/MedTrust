import { NextRequest, NextResponse } from "next/server";
import {
  listProviders,
  registerProvider,
  recordAuditLog,
  HealthcareProvider,
} from "@/lib/storage";
import { PublicKey } from "@solana/web3.js";

export async function GET() {
  try {
    const providers = listProviders();
    return NextResponse.json({ success: true, providers });
  } catch (error) {
    console.error("Failed to list providers:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, facilityType, licenseNumber, specialty, pubkey, contactEmail, address } = body;

    if (!name || !licenseNumber || !pubkey) {
      return NextResponse.json(
        { success: false, error: "Name, license number, and Solana public key are required." },
        { status: 400 }
      );
    }

    try {
      new PublicKey(pubkey);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid Solana public key format." },
        { status: 400 }
      );
    }

    const newProvider: HealthcareProvider = {
      id: `prov-${Date.now()}`,
      name,
      facilityType: facilityType || "Clinic",
      licenseNumber,
      specialty: specialty || "General Practice",
      pubkey,
      verificationStatus: "Pending", // Requires Admin verification
      contactEmail: contactEmail || "",
      address: address || "",
    };

    registerProvider(newProvider);

    recordAuditLog({
      action: "PROVIDER_VERIFIED",
      actorPubkey: pubkey,
      actorRole: "Provider",
      targetId: newProvider.id,
      details: `Healthcare provider '${name}' submitted verification application (License: ${licenseNumber}).`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      provider: newProvider,
      message: "Provider registered successfully. Verification pending admin review.",
    });
  } catch (error) {
    console.error("Failed to register provider:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

