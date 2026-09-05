// Mock service layer.
//
// Every exported function here simulates a network call: it resolves after a
// realistic delay and can be made to reject to exercise error states in the
// UI. When a real backend exists, swap the bodies of these functions for
// actual `fetch`/API client calls — callers (hooks/pages) should not need to
// change, since the return shapes already match the domain types in
// `src/types`.

function delay<T>(value: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface MockRequestOptions {
  /** Force the request to reject, to demonstrate error states. */
  simulateError?: boolean;
  /** Force an empty/insufficient-data result, where supported. */
  simulateEmpty?: boolean;
  delayMs?: number;
}

export async function mockFetch<T>(data: T, options: MockRequestOptions = {}): Promise<T> {
  const { simulateError, delayMs = 600 } = options;
  if (simulateError) {
    await delay(null, delayMs);
    throw new Error("We couldn't reach the server. Check your connection and try again.");
  }
  return delay(data, delayMs);
}

// Future integration: authentication
// export async function signIn(email: string, password: string): Promise<Session> { ... }

// Future integration: patient profile API
// export async function getPatient(id: string): Promise<Patient> { ... }
// export async function updatePatient(id: string, patch: Partial<Patient>): Promise<Patient> { ... }

// Future integration: assessment submission
// export async function submitAssessmentResult(result: AssessmentResult): Promise<void> { ... }


// Future integration: RAG assistant + citation retrieval
// export async function askResearchAssistant(question: string, patientContext: PatientContext): Promise<ResearchAnswer> { ... }

// Future integration: report generation + PDF export
// export async function generateReport(config: ReportConfig): Promise<ClinicianReport> { ... }
// export async function exportReportPdf(reportId: string): Promise<Blob> { ... }

// Future integration: notification service
// export async function updateNotificationPreferences(prefs: NotificationPreferences): Promise<void> { ... }
