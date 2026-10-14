import { NextRequest, NextResponse } from "next/server";
import { getPatientProfile, savePatientProfile, PatientProfile } from "@/lib/storage";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pubkey = searchParams.get("pubkey");

    if (!pubkey) {
      return NextResponse.json(
        { success: false, error: "Wallet public key is required" },
        { status: 400 }
      );
    }

    const profile = getPatientProfile(pubkey);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to get patient profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pubkey, name, dob, bloodGroup, allergies, emergencyContact } = body;

    if (!pubkey || !name) {
      return NextResponse.json(
        { success: false, error: "Public key and patient name are required." },
        { status: 400 }
      );
    }

    const profile: PatientProfile = {
      pubkey,
      name,
      dob: dob || "1994-06-18",
      bloodGroup: bloodGroup || "O+",
      allergies: Array.isArray(allergies) ? allergies : ["Penicillin"],
      emergencyContact: emergencyContact || "Not provided",
      createdAt: Math.floor(Date.now() / 1000),
    };

    savePatientProfile(profile);

    return NextResponse.json({
      success: true,
      profile,
      message: "Patient profile saved successfully.",
    });
  } catch (error) {
    console.error("Failed to save patient profile:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

