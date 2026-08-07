import { supabase } from "../../utils/supabase/client";

export interface PolicyRecord {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  department: string;
  documentType: string;
  category: string;
  edition: number;
  effectiveDate: string;
  lastUpdated: string;
  status: "active" | "draft" | "under_review" | "approved" | "published" | "archived";
  pages: number;
  requiresReading: boolean;
  views: number;
  documentKey?: string;
  documentName?: string;
  content?: string;
  contentAr?: string;
  keywords?: string[];
  keywordsAr?: string[];
  references?: Array<{ groupId: string; title: string; titleAr: string; page: number | string; recordIds: string[] }>;
  generatedBy?: "ai-assisted" | "text" | "pdf";
}

export const FALLBACK_POLICIES: PolicyRecord[] = [];

const LOCAL_POLICIES_KEY = "saudia-one-policies";
const LOCAL_SUBMISSIONS_KEY = "saudia-one-policy-submissions";
const LOCAL_NOTIFICATIONS_KEY = "saudia-one-policy-notifications";

function readLocalStore<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStore<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function normalizePolicy(policy: PolicyRecord): PolicyRecord {
  return {
    ...policy,
    keywords: policy.keywords ?? [],
    keywordsAr: policy.keywordsAr ?? [],
    references: policy.references ?? [],
    generatedBy: policy.generatedBy ?? "text",
  };
}

function mapDbRowToPolicy(row: Record<string, unknown>): PolicyRecord {
  return normalizePolicy({
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    titleAr: String(row.title_ar ?? row.title ?? ""),
    description: String(row.description ?? ""),
    descriptionAr: String(row.description_ar ?? row.description ?? ""),
    department: String(row.department ?? ""),
    documentType: String(row.document_type ?? ""),
    category: String(row.category ?? ""),
    edition: Number(row.edition ?? 0),
    effectiveDate: String(row.effective_date ?? ""),
    lastUpdated: String(row.last_updated ?? ""),
    status: (row.status as PolicyRecord["status"]) ?? "draft",
    pages: Number(row.pages ?? 0),
    requiresReading: Boolean(row.requires_reading),
    views: Number(row.views ?? 0),
    documentKey: row.document_key ? String(row.document_key) : undefined,
    documentName: row.document_name ? String(row.document_name) : undefined,
    content: row.content ? String(row.content) : undefined,
    contentAr: row.content_ar ? String(row.content_ar) : undefined,
    keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
    keywordsAr: Array.isArray(row.keywords_ar) ? (row.keywords_ar as string[]) : [],
    references: Array.isArray(row.policy_references) ? (row.policy_references as Array<{ groupId: string; title: string; titleAr: string; page: number; recordIds: string[] }>) : [],
    generatedBy: (row.generated_by as PolicyRecord["generatedBy"]) ?? "text",
  });
}

function toDbRow(policy: PolicyRecord): Record<string, unknown> {
  return {
    id: policy.id,
    title: policy.title,
    title_ar: policy.titleAr,
    description: policy.description,
    description_ar: policy.descriptionAr,
    department: policy.department,
    document_type: policy.documentType,
    category: policy.category,
    edition: policy.edition,
    effective_date: policy.effectiveDate,
    last_updated: policy.lastUpdated,
    status: policy.status,
    pages: policy.pages,
    requires_reading: policy.requiresReading,
    views: policy.views,
    document_key: policy.documentKey ?? null,
    document_name: policy.documentName ?? null,
    content: policy.content ?? null,
    content_ar: policy.contentAr ?? null,
    keywords: policy.keywords ?? [],
    keywords_ar: policy.keywordsAr ?? [],
    policy_references: policy.references ?? [],
    generated_by: policy.generatedBy ?? "text",
  };
}

export async function loadPoliciesFromStore(): Promise<PolicyRecord[]> {
  if (!supabase) {
    return readLocalStore<PolicyRecord>(LOCAL_POLICIES_KEY, FALLBACK_POLICIES);
  }

  try {
    const { data, error } = await supabase.from("policies").select("*").order("last_updated", { ascending: false });
    if (error) {
      console.warn("Unable to load policies from Supabase; falling back to local data.", error.message);
      return readLocalStore<PolicyRecord>(LOCAL_POLICIES_KEY, FALLBACK_POLICIES);
    }

    if (!data?.length) {
      return readLocalStore<PolicyRecord>(LOCAL_POLICIES_KEY, FALLBACK_POLICIES);
    }

    const policies = data.map(row => mapDbRowToPolicy(row as Record<string, unknown>));
    writeLocalStore(LOCAL_POLICIES_KEY, policies);
    return policies;
  } catch (error) {
    console.warn("Unable to load policies from Supabase; falling back to local data.", error);
    return readLocalStore<PolicyRecord>(LOCAL_POLICIES_KEY, FALLBACK_POLICIES);
  }
}

export async function savePoliciesToStore(policies: PolicyRecord[]): Promise<void> {
  const normalized = policies.map(policy => normalizePolicy(policy));
  writeLocalStore(LOCAL_POLICIES_KEY, normalized);

  if (!supabase) {
    return;
  }

  try {
    const rows = normalized.map(policy => toDbRow(policy));
    const { error } = await supabase.from("policies").upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.warn("Unable to save policies to Supabase; kept local copy.", error);
  }
}

export interface SubmissionHistoryEntry {
  status: "pending" | "approved" | "under_review" | "rejected";
  date: string;
  note?: string;
}

export interface PolicySubmissionRecord {
  id: string;
  policy: PolicyRecord;
  submittedBy: string;
  submittedByEmail: string;
  submittedByRole: "employee" | "academic" | "admin";
  submittedAt: string;
  generationMethod: "ai" | "text" | "pdf";
  aiPrompt?: string;
  textContent?: string;
  textContentAr?: string;
  pdfName?: string;
  status: "pending" | "approved" | "under_review" | "rejected";
  adminNote?: string;
  statusHistory?: SubmissionHistoryEntry[];
}

export interface NotificationRecord {
  id: string;
  userEmail?: string;
  type: "info" | "warning" | "success";
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  date: string;
  read: boolean;
  policyId?: string;
}

function mapSubmissionRowToRecord(row: Record<string, unknown>): PolicySubmissionRecord {
  return {
    id: String(row.id ?? ""),
    policy: normalizePolicy({
      id: String(row.policy_id ?? `p-${Date.now()}`),
      title: String(row.policy_title ?? ""),
      titleAr: String(row.policy_title_ar ?? row.policy_title ?? ""),
      description: String(row.policy_description ?? ""),
      descriptionAr: String(row.policy_description_ar ?? row.policy_description ?? ""),
      department: String(row.department ?? ""),
      documentType: String(row.document_type ?? ""),
      category: String(row.category ?? ""),
      edition: Number(row.edition ?? 1),
      effectiveDate: String(row.effective_date ?? ""),
      lastUpdated: String(row.last_updated ?? ""),
      status: (row.status as PolicyRecord["status"]) ?? "draft",
      pages: Number(row.pages ?? 0),
      requiresReading: Boolean(row.requires_reading),
      views: Number(row.views ?? 0),
      documentKey: row.document_key ? String(row.document_key) : undefined,
      documentName: row.document_name ? String(row.document_name) : undefined,
      content: row.content ? String(row.content) : undefined,
      contentAr: row.content_ar ? String(row.content_ar) : undefined,
      keywords: Array.isArray(row.keywords) ? (row.keywords as string[]) : [],
      keywordsAr: Array.isArray(row.keywords_ar) ? (row.keywords_ar as string[]) : [],
      references: Array.isArray(row.policy_references) ? (row.policy_references as Array<{ groupId: string; title: string; titleAr: string; page: number | string; recordIds: string[] }>) : [],
      generatedBy: (row.generated_by as PolicyRecord["generatedBy"]) ?? "text",
    }),
    submittedBy: String(row.submitted_by ?? ""),
    submittedByEmail: String(row.submitted_by_email ?? ""),
    submittedByRole: (row.submitted_by_role as PolicySubmissionRecord["submittedByRole"]) ?? "employee",
    submittedAt: String(row.submitted_at ?? ""),
    generationMethod: (row.generation_method as PolicySubmissionRecord["generationMethod"]) ?? "text",
    aiPrompt: row.ai_prompt ? String(row.ai_prompt) : undefined,
    textContent: row.text_content ? String(row.text_content) : undefined,
    textContentAr: row.text_content_ar ? String(row.text_content_ar) : undefined,
    pdfName: row.pdf_name ? String(row.pdf_name) : undefined,
    status: (row.status as PolicySubmissionRecord["status"]) ?? "pending",
    adminNote: row.admin_note ? String(row.admin_note) : undefined,
    statusHistory: Array.isArray(row.status_history) ? (row.status_history as SubmissionHistoryEntry[]) : [],
  };
}

function submissionToDbRow(submission: PolicySubmissionRecord): Record<string, unknown> {
  return {
    id: submission.id,
    policy_id: submission.policy.id,
    policy_title: submission.policy.title,
    policy_title_ar: submission.policy.titleAr,
    policy_description: submission.policy.description,
    policy_description_ar: submission.policy.descriptionAr,
    department: submission.policy.department,
    document_type: submission.policy.documentType,
    category: submission.policy.category,
    edition: submission.policy.edition,
    effective_date: submission.policy.effectiveDate,
    content: submission.policy.content ?? null,
    content_ar: submission.policy.contentAr ?? null,
    keywords: submission.policy.keywords ?? [],
    keywords_ar: submission.policy.keywordsAr ?? [],
    policy_references: submission.policy.references ?? [],
    generated_by: submission.policy.generatedBy ?? "text",
    submitted_by: submission.submittedBy,
    submitted_by_email: submission.submittedByEmail,
    submitted_by_role: submission.submittedByRole,
    submitted_at: submission.submittedAt,
    generation_method: submission.generationMethod,
    ai_prompt: submission.aiPrompt ?? null,
    text_content: submission.textContent ?? null,
    text_content_ar: submission.textContentAr ?? null,
    pdf_name: submission.pdfName ?? null,
    status: submission.status,
    admin_note: submission.adminNote ?? null,
    status_history: submission.statusHistory ?? [],
  };
}

function mapNotificationRowToRecord(row: Record<string, unknown>): NotificationRecord {
  return {
    id: String(row.id ?? ""),
    userEmail: row.user_email ? String(row.user_email) : undefined,
    type: (row.type as NotificationRecord["type"]) ?? "info",
    title: String(row.title ?? ""),
    titleAr: String(row.title_ar ?? row.title ?? ""),
    message: String(row.message ?? ""),
    messageAr: String(row.message_ar ?? row.message ?? ""),
    date: String(row.date ?? ""),
    read: Boolean(row.read),
    policyId: row.policy_id ? String(row.policy_id) : undefined,
  };
}

function notificationToDbRow(notification: NotificationRecord): Record<string, unknown> {
  return {
    id: notification.id,
    user_email: notification.userEmail ?? null,
    type: notification.type,
    title: notification.title,
    title_ar: notification.titleAr,
    message: notification.message,
    message_ar: notification.messageAr,
    date: notification.date,
    read: notification.read,
    policy_id: notification.policyId ?? null,
  };
}

export async function loadSubmissionsFromStore(): Promise<PolicySubmissionRecord[]> {
  if (!supabase) {
    return readLocalStore<PolicySubmissionRecord>(LOCAL_SUBMISSIONS_KEY, []);
  }

  try {
    const { data, error } = await supabase.from("policy_submissions").select("*").order("submitted_at", { ascending: false });
    if (error) {
      console.warn("Unable to load submissions from Supabase; falling back to local data.", error.message);
      return readLocalStore<PolicySubmissionRecord>(LOCAL_SUBMISSIONS_KEY, []);
    }

    const submissions = (data ?? []).map(row => mapSubmissionRowToRecord(row as Record<string, unknown>));
    writeLocalStore(LOCAL_SUBMISSIONS_KEY, submissions);
    return submissions;
  } catch (error) {
    console.warn("Unable to load submissions from Supabase; falling back to local data.", error);
    return readLocalStore<PolicySubmissionRecord>(LOCAL_SUBMISSIONS_KEY, []);
  }
}

export async function saveSubmissionsToStore(submissions: PolicySubmissionRecord[]): Promise<void> {
  writeLocalStore(LOCAL_SUBMISSIONS_KEY, submissions);

  if (!supabase) return;

  try {
    const rows = submissions.map(submissionToDbRow);
    const { error } = await supabase.from("policy_submissions").upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.warn("Unable to save submissions to Supabase; kept local copy.", error);
  }
}

export async function loadNotificationsFromStore(): Promise<NotificationRecord[]> {
  if (!supabase) {
    return readLocalStore<NotificationRecord>(LOCAL_NOTIFICATIONS_KEY, []);
  }

  try {
    const { data, error } = await supabase.from("policy_notifications").select("*").order("created_at", { ascending: false });
    if (error) {
      console.warn("Unable to load notifications from Supabase; falling back to local data.", error.message);
      return readLocalStore<NotificationRecord>(LOCAL_NOTIFICATIONS_KEY, []);
    }

    const notifications = (data ?? []).map(row => mapNotificationRowToRecord(row as Record<string, unknown>));
    writeLocalStore(LOCAL_NOTIFICATIONS_KEY, notifications);
    return notifications;
  } catch (error) {
    console.warn("Unable to load notifications from Supabase; falling back to local data.", error);
    return readLocalStore<NotificationRecord>(LOCAL_NOTIFICATIONS_KEY, []);
  }
}

export async function saveNotificationsToStore(notifications: NotificationRecord[]): Promise<void> {
  writeLocalStore(LOCAL_NOTIFICATIONS_KEY, notifications);

  if (!supabase) return;

  try {
    const rows = notifications.map(notificationToDbRow);
    const { error } = await supabase.from("policy_notifications").upsert(rows, { onConflict: "id" });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.warn("Unable to save notifications to Supabase; kept local copy.", error);
  }
}
