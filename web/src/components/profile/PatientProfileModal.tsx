"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import CopyButton from "@/components/ui/CopyButton";
import { PatientProfile } from "@/lib/storage";

interface PatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletPubkey: string;
  onProfileUpdated: () => Promise<void>;
  onOpenRecovery?: () => void;
}

export default function PatientProfileModal({
  isOpen,
  onClose,
  walletPubkey,
  onProfileUpdated,
  onOpenRecovery,
}: PatientProfileModalProps) {
  const [name, setName] = useState("Alex Rivera");
  const [dob, setDob] = useState("1994-06-18");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [allergies, setAllergies] = useState("Penicillin (Mild rash), Shellfish");
  const [emergencyContact, setEmergencyContact] = useState("Elena Rivera (+1-555-019-2834)");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!walletPubkey) return;
      try {
        const res = await fetch(`/api/patients?pubkey=${walletPubkey}`);
        const data = await res.json();
        if (data.success && data.profile) {
          const p: PatientProfile = data.profile;
          setName(p.name);
          setDob(p.dob);
          setBloodGroup(p.bloodGroup);
          setAllergies(p.allergies.join(", "));
          setEmergencyContact(p.emergencyContact);
        }
      } catch (err) {
        console.warn("Could not fetch profile:", err);
      }
    }
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, walletPubkey]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSaving(true);
      setSavedSuccess(false);

      const allergyList = allergies.split(",").map((a) => a.trim()).filter(Boolean);

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pubkey: walletPubkey || "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
          name,
          dob,
          bloodGroup,
          allergies: allergyList,
          emergencyContact,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSavedSuccess(true);
      await onProfileUpdated();
      setTimeout(() => {
        onClose();
        setSavedSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Patient Identity & Profile"
      description="Manage your clinical profile, verified patient identity, and emergency health parameters."
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {savedSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            ✓ Patient profile updated successfully!
          </div>
        )}

        {/* Wallet Address Chip */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Anchored Patient Wallet
            </span>
            <CopyButton text={walletPubkey} label="Copy" />
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-slate-700 break-all">
            {walletPubkey}
          </p>
        </div>

        <div>
          <label htmlFor="patient-name" className="block text-xs font-bold text-slate-700">
            Full Legal Name
          </label>
          <input
            id="patient-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="patient-dob" className="block text-xs font-bold text-slate-700">
              Date of Birth
            </label>
            <input
              id="patient-dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label htmlFor="patient-blood" className="block text-xs font-bold text-slate-700">
              Blood Group
            </label>
            <select
              id="patient-blood"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="O+">O Positive (O+)</option>
              <option value="O-">O Negative (O-)</option>
              <option value="A+">A Positive (A+)</option>
              <option value="A-">A Negative (A-)</option>
              <option value="B+">B Positive (B+)</option>
              <option value="B-">B Negative (B-)</option>
              <option value="AB+">AB Positive (AB+)</option>
              <option value="AB-">AB Negative (AB-)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="patient-allergies" className="block text-xs font-bold text-slate-700">
            Known Drug / Environmental Allergies
          </label>
          <input
            id="patient-allergies"
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder="e.g. Penicillin, Sulfa, Peanuts (comma separated)"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label htmlFor="emergency-contact" className="block text-xs font-bold text-slate-700">
            Emergency Contact Name & Phone
          </label>
          <input
            id="emergency-contact"
            type="text"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {onOpenRecovery && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRecovery();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Account Recovery Keys</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Identity Profile"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

