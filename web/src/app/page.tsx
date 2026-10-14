"use client";

import { useEffect, useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Header from "@/components/Header";
import Sidebar, { NavTab, UserRole } from "@/components/Sidebar";
import OverviewTab from "@/components/overview/OverviewTab";
import MedicalRecordsTab from "@/components/records/MedicalRecordsTab";
import AccessControlTab from "@/components/access/AccessControlTab";
import ActivityTab from "@/components/activity/ActivityTab";
import ProviderPortalTab from "@/components/provider/ProviderPortalTab";
import AdminPortalTab from "@/components/admin/AdminPortalTab";
import RecordInspectorModal from "@/components/records/RecordInspectorModal";
import CreateRecordModal from "@/components/records/CreateRecordModal";
import RecordDownloadModal from "@/components/records/RecordDownloadModal";
import PatientProfileModal from "@/components/profile/PatientProfileModal";
import AccountRecoveryModal from "@/components/profile/AccountRecoveryModal";

import { getRecord, RecordData } from "@/lib/record";
import { getConsent, ConsentData, getConsentActivity, ConsentActivity } from "@/lib/consent";
import {
  MedicalDocumentRecord,
  HealthcareProvider,
  AuditLogEntry,
  PatientProfile,
  ConsentRecord,
} from "@/lib/storage";

const ROLE_ALLOWED_TABS: Record<UserRole, NavTab[]> = {
  Patient: ["Overview", "Medical Records", "Access Control", "Activity"],
  Provider: ["Provider Portal", "Activity"],
  Admin: ["Platform Admin", "Activity"],
};

const ROLE_DEFAULT_TABS: Record<UserRole, NavTab> = {
  Patient: "Overview",
  Provider: "Provider Portal",
  Admin: "Platform Admin",
};

export default function Home() {
  const [currentRole, setCurrentRole] = useState<UserRole>("Patient");
  const [activeTab, setActiveTab] = useState<NavTab>("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleRoleChange(newRole: UserRole) {
    setCurrentRole(newRole);
    if (!ROLE_ALLOWED_TABS[newRole].includes(activeTab)) {
      setActiveTab(ROLE_DEFAULT_TABS[newRole]);
    }
  }

  // Modals state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [createRecordOpen, setCreateRecordOpen] = useState(false);
  const [downloadModalDoc, setDownloadModalDoc] = useState<MedicalDocumentRecord | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [activeInspectorDoc, setActiveInspectorDoc] = useState<MedicalDocumentRecord | null>(null);
  const [amendingRecord, setAmendingRecord] = useState<MedicalDocumentRecord | null>(null);

  // Core Data States
  const [documents, setDocuments] = useState<MedicalDocumentRecord[]>([]);
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [chainRecord, setChainRecord] = useState<RecordData | null>(null);
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [chainActivities, setChainActivities] = useState<ConsentActivity[]>([]);

  // Loading States
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const { publicKey } = useWallet();

  const activePatientPubkey = publicKey
    ? publicKey.toBase58()
    : "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m";

  // Data Fetching Functions
  const loadVaultDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.warn("Could not load documents from API:", err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (data.success && data.providers) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.warn("Could not load providers:", err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      if (data.success && data.logs) {
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.warn("Could not load audit logs:", err);
    }
  }, []);

  const loadPatientProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients?pubkey=${activePatientPubkey}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setPatientProfile(data.profile);
      } else {
        setPatientProfile(null);
      }
    } catch (err) {
      console.warn("Could not load profile:", err);
    }
  }, [activePatientPubkey]);

  const loadConsents = useCallback(async () => {
    try {
      const res = await fetch("/api/consents");
      const data = await res.json();
      if (data.success && data.consents) {
        setConsents(data.consents);
      }
    } catch (err) {
      console.warn("Could not load consents:", err);
    }
  }, []);

  const loadSolanaData = useCallback(async () => {
    try {
      const [rec, con] = await Promise.all([getRecord(), getConsent()]);
      setChainRecord(rec);
      setConsent(con);
    } catch (err) {
      console.warn("Could not load Solana on-chain data:", err);
    } finally {
      setLoadingConsent(false);
    }
  }, []);

  const loadActivityData = useCallback(async () => {
    try {
      const acts = await getConsentActivity();
      setChainActivities(acts);
    } catch (err) {
      console.warn("Could not load consent activities:", err);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // Initial load once on mount
  useEffect(() => {
    let ignore = false;

    async function initialize() {
      const [docsRes, provRes, consRes, auditRes, profRes, rec, con, acts] =
        await Promise.allSettled([
          fetch("/api/documents").then((r) => r.json()),
          fetch("/api/providers").then((r) => r.json()),
          fetch("/api/consents").then((r) => r.json()),
          fetch("/api/audit").then((r) => r.json()),
          fetch(`/api/patients?pubkey=${activePatientPubkey}`).then((r) =>
            r.json()
          ),
          getRecord(),
          getConsent(),
          getConsentActivity(),
        ]);

      if (ignore) return;

      if (docsRes.status === "fulfilled" && docsRes.value?.success) {
        setDocuments(docsRes.value.documents);
      }
      setLoadingDocs(false);

      if (provRes.status === "fulfilled" && provRes.value?.success) {
        setProviders(provRes.value.providers);
      }

      if (consRes.status === "fulfilled" && consRes.value?.success) {
        setConsents(consRes.value.consents);
      }

      if (auditRes.status === "fulfilled" && auditRes.value?.success) {
        setAuditLogs(auditRes.value.logs);
      }

      if (profRes.status === "fulfilled" && profRes.value?.success) {
        setPatientProfile(profRes.value.profile);
      }

      if (rec.status === "fulfilled") {
        setChainRecord(rec.value);
      }

      if (con.status === "fulfilled") {
        setConsent(con.value);
      }
      setLoadingConsent(false);

      if (acts.status === "fulfilled") {
        setChainActivities(acts.value);
      }
      setLoadingActivity(false);
    }

    initialize();

    return () => {
      ignore = true;
    };
  }, [activePatientPubkey]);

  const defaultProvider = providers[0] || {
    id: "prov-001",
    name: "MedTrust Demo Clinic",
    facilityType: "Clinic",
    licenseNumber: "MED-CL-2024-8891",
    specialty: "Primary Care & Family Medicine",
    pubkey: "25aLhKJJkp2LSBgcbpo9deDrixPz78mhSVghR9Fi8L2m",
    verificationStatus: "Verified",
    contactEmail: "care@medtrustclinic.org",
    address: "450 Medical Sciences Blvd",
  };

  function handleInspect(doc: MedicalDocumentRecord) {
    setActiveInspectorDoc(doc);
    setInspectorOpen(true);
  }

  function handleOpenCreateRecord() {
    setAmendingRecord(null);
    setCreateRecordOpen(true);
  }

  function handleOpenAmendment(doc: MedicalDocumentRecord) {
    setAmendingRecord(doc);
    setCreateRecordOpen(true);
  }

  return (
    <main className="min-h-screen w-full bg-slate-50/50 text-slate-900">
      <div className="flex min-h-screen w-full">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          onRoleChange={handleRoleChange}
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpenProfile={() => setProfileModalOpen(true)}
          patientName={patientProfile?.name || "Alex Rivera"}
          providerName={defaultProvider.name}
        />

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            activeTabTitle={activeTab}
            patientName={patientProfile?.name || "Alex Rivera"}
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
            onOpenCreateRecord={handleOpenCreateRecord}
            onOpenProfile={() => setProfileModalOpen(true)}
            onToggleMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Active Viewport Screen */}
          <div className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-8 sm:py-8">
            {/* RBAC Access Restricted Barrier (403) */}
            {!ROLE_ALLOWED_TABS[currentRole].includes(activeTab) ? (
              <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200/90 bg-white p-8 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  RBAC 403: Access Restricted
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">
                  Unauthorized Portal Workspace
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  The active workspace (<strong className="text-slate-900 font-semibold">{activeTab}</strong>) is restricted and cannot be accessed under the active <strong className="text-slate-900 font-semibold">{currentRole}</strong> persona.
                  Role-Based Access Control (RBAC) enforces strict workspace separation between Patients, Healthcare Providers, and Administrators.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab(ROLE_DEFAULT_TABS[currentRole])}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    <span>Return to {ROLE_DEFAULT_TABS[currentRole]}</span>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                  {activeTab === "Platform Admin" && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange("Admin")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <span>Switch Persona to Administrator</span>
                    </button>
                  )}
                  {activeTab === "Provider Portal" && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange("Provider")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <span>Switch Persona to Healthcare Provider</span>
                    </button>
                  )}
                  {["Overview", "Medical Records", "Access Control"].includes(activeTab) && (
                    <button
                      type="button"
                      onClick={() => handleRoleChange("Patient")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                    >
                      <span>Switch Persona to Patient</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* New Connected Patient Onboarding Banner */}
                {publicKey && !patientProfile && currentRole === "Patient" && (
                  <div className="mb-6 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Patient Identity Onboarding
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                          Wallet connected ({publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}). Create your verified identity profile to link personal health parameters with on-chain records.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileModalOpen(true)}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                    >
                      Complete Patient Profile
                    </button>
                  </div>
                )}

                {activeTab === "Overview" && (
                  <OverviewTab
                    documents={documents}
                    consent={consent}
                    chainRecord={chainRecord}
                    onNavigate={setActiveTab}
                    onInspectDocument={handleInspect}
                    onOpenCreateRecord={handleOpenCreateRecord}
                  />
                )}

                {activeTab === "Medical Records" && (
                  <MedicalRecordsTab
                    documents={documents}
                    onOpenCreateRecord={handleOpenCreateRecord}
                    onOpenAmendment={handleOpenAmendment}
                    onInspectDocument={handleInspect}
                    onDownloadDocument={(doc) => setDownloadModalDoc(doc)}
                    onRefreshData={loadVaultDocuments}
                    isLoading={loadingDocs}
                  />
                )}

                {activeTab === "Access Control" && (
                  <AccessControlTab
                    consent={consent}
                    consents={consents}
                    documents={documents}
                    providers={providers}
                    onRefreshConsent={async () => {
                      await loadSolanaData();
                      await loadConsents();
                    }}
                    isLoading={loadingConsent}
                  />
                )}

                {activeTab === "Activity" && (
                  <ActivityTab
                    activities={chainActivities}
                    isLoading={loadingActivity}
                    error={null}
                    onRefresh={loadActivityData}
                  />
                )}

                {activeTab === "Provider Portal" && (
                  <ProviderPortalTab
                    currentProvider={defaultProvider}
                    providers={providers}
                    documents={documents}
                    consent={consent}
                    onOpenCreateRecord={handleOpenCreateRecord}
                    onRefreshData={async () => {
                      await loadVaultDocuments();
                      await loadProviders();
                      await loadSolanaData();
                      await loadConsents();
                    }}
                  />
                )}

                {activeTab === "Platform Admin" && (
                  <AdminPortalTab
                    providers={providers}
                    auditLogs={auditLogs}
                    onRefreshData={async () => {
                      await loadProviders();
                      await loadAuditLogs();
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <RecordInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        document={activeInspectorDoc}
        chainRecord={chainRecord}
        defaultContent={activeInspectorDoc?.plaintextPreview || "TEST MEDICAL RECORD\nPatient ID: DEMO-001\nRecord Type: Routine Checkup\nDate: 2026-10-08\nStatus: Test Data Only\n"}
        onRecordAnchored={async () => {
          await loadVaultDocuments();
          await loadSolanaData();
          await loadConsents();
        }}
      />

      <CreateRecordModal
        isOpen={createRecordOpen}
        onClose={() => {
          setCreateRecordOpen(false);
          setAmendingRecord(null);
        }}
        onRecordCreated={async () => {
          await loadVaultDocuments();
          await loadSolanaData();
          await loadAuditLogs();
        }}
        providers={providers}
        parentRecord={amendingRecord}
      />

      <RecordDownloadModal
        isOpen={Boolean(downloadModalDoc)}
        onClose={() => setDownloadModalDoc(null)}
        document={downloadModalDoc}
        onOpenAmendment={handleOpenAmendment}
      />

      <PatientProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        walletPubkey={activePatientPubkey}
        onProfileUpdated={loadPatientProfile}
        onOpenRecovery={() => setRecoveryModalOpen(true)}
      />

      <AccountRecoveryModal
        isOpen={recoveryModalOpen}
        onClose={() => setRecoveryModalOpen(false)}
        walletPubkey={activePatientPubkey}
        onRecoverySuccess={async () => {
          await loadVaultDocuments();
          await loadPatientProfile();
          await loadAuditLogs();
        }}
      />
    </main>
  );
}
