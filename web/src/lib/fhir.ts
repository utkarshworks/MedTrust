/**
 * MedTrust HL7 FHIR R4 Diagnostic Schema Transformer
 * Converts MedTrust encrypted medical records into standard FHIR R4 Bundles
 * compliant with US Core Implementation Guide (US-Core) standards.
 */

import { MedicalDocumentRecord } from "./storage";

export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
    security?: Array<{ system: string; code: string; display: string }>;
  };
  extension?: Array<{
    url: string;
    valueString?: string;
    valueUri?: string;
  }>;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: "Bundle";
  id: string;
  type: "document" | "collection" | "transaction";
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FhirResource;
  }>;
}

/**
 * Transforms a MedTrust record into a standard FHIR R4 resource bundle.
 */
export function convertToFhirBundle(
  doc: MedicalDocumentRecord,
  patientName = "Alex Rivera"
): FhirBundle {
  const fhirDocId = `medtrust-rec-${doc.recordId}`;
  const nowIso = new Date(doc.createdAt * 1000).toISOString();
  const sha256 = doc.envelope?.sha256Hash || "";

  // 1. Patient Resource
  const patientResource: FhirResource = {
    resourceType: "Patient",
    id: `patient-${doc.patientPubkey.slice(0, 8)}`,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
    },
    identifier: [
      {
        system: "https://solana.com/address",
        value: doc.patientPubkey,
      },
    ],
    name: [
      {
        use: "official",
        text: patientName,
      },
    ],
  };

  // 2. Solana Provenance Extension
  const solanaExtension = [
    {
      url: "http://medtrust.health/fhir/StructureDefinition/solana-pda",
      valueString: doc.pda,
    },
    {
      url: "http://medtrust.health/fhir/StructureDefinition/solana-sha256-anchor",
      valueString: sha256,
    },
    {
      url: "http://medtrust.health/fhir/StructureDefinition/solana-cluster",
      valueString: "Devnet",
    },
  ];

  let clinicalResource: FhirResource;

  switch (doc.category) {
    case "Lab Report":
      clinicalResource = {
        resourceType: "DiagnosticReport",
        id: fhirDocId,
        meta: {
          profile: [
            "http://hl7.org/fhir/us/core/StructureDefinition/us-core-diagnosticreport-lab",
          ],
        },
        extension: solanaExtension,
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0074",
                code: "LAB",
                display: "Laboratory",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11502-2",
              display: "Laboratory report",
            },
          ],
          text: doc.title,
        },
        subject: {
          reference: `Patient/${patientResource.id}`,
          display: patientName,
        },
        effectiveDateTime: doc.date,
        conclusion: doc.plaintextPreview.slice(0, 500),
      };
      break;

    case "Prescription":
      clinicalResource = {
        resourceType: "MedicationRequest",
        id: fhirDocId,
        meta: {
          profile: [
            "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
          ],
        },
        extension: solanaExtension,
        status: "active",
        intent: "order",
        subject: {
          reference: `Patient/${patientResource.id}`,
          display: patientName,
        },
        authoredOn: doc.date,
        note: [
          {
            text: doc.plaintextPreview,
          },
        ],
        medicationCodeableConcept: {
          text: doc.title,
        },
      };
      break;

    case "Diagnostic Imaging":
      clinicalResource = {
        resourceType: "ImagingStudy",
        id: fhirDocId,
        extension: solanaExtension,
        status: "available",
        subject: {
          reference: `Patient/${patientResource.id}`,
          display: patientName,
        },
        started: doc.date,
        description: doc.title,
        note: [{ text: doc.plaintextPreview }],
      };
      break;

    case "Clinical Note":
    case "Discharge Summary":
    default:
      clinicalResource = {
        resourceType: "DocumentReference",
        id: fhirDocId,
        meta: {
          profile: [
            "http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference",
          ],
        },
        extension: solanaExtension,
        status: "current",
        docStatus: "final",
        type: {
          text: doc.category,
        },
        subject: {
          reference: `Patient/${patientResource.id}`,
          display: patientName,
        },
        date: nowIso,
        description: doc.title,
        content: [
          {
            attachment: {
              contentType: doc.mimeType || "text/plain",
              title: doc.title,
              data: Buffer.from(doc.plaintextPreview || "").toString("base64"),
            },
          },
        ],
      };
      break;
  }

  return {
    resourceType: "Bundle",
    id: `bundle-medtrust-${doc.id}`,
    type: "document",
    timestamp: nowIso,
    entry: [
      {
        fullUrl: `urn:uuid:${patientResource.id}`,
        resource: patientResource,
      },
      {
        fullUrl: `urn:uuid:${clinicalResource.id}`,
        resource: clinicalResource,
      },
    ],
  };
}

