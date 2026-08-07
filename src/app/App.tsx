import { useState, useRef, useEffect } from "react";
import { supabase } from "../../utils/supabase/client";
import { askITKnowledgeBase, getSuggestedQuestions, IT_KNOWLEDGE_STATS, type RagAnswer, type RagConversationContext } from "../data/itRagService";
import { generatePolicyDraft, POLICY_GENERATOR_EXAMPLES, type GeneratedPolicyDraft, type PolicyReference } from "../data/policyGeneratorService";
import { loadLocalPdfUrl, saveLocalPdf } from "../data/localPdfStore";
import { loadPoliciesFromStore, savePoliciesToStore, loadSubmissionsFromStore, saveSubmissionsToStore, loadNotificationsFromStore, saveNotificationsToStore, type PolicyRecord } from "../data/policyRepository";
import pdf1Url from "../imports/IT_OPM__Ed._6.pdf?url";
import saudiaLogoSrc from "../imports/photo_5960918718973939146_y.png";

import {
  Search, Bell, BookOpen, FileText, GitCompare, Settings, LogOut, Home,
  Shield, ChevronRight, ChevronLeft, Download, Eye, MessageSquare,
  CheckCircle, Clock, AlertCircle, Users, Upload, X, Send, Bot,
  GraduationCap, Info, Bookmark, AlertTriangle,
  Building, Plus, ArrowLeft, Menu, EyeOff, Monitor, Folder, Share2, Pencil, Layers,
  ExternalLink, Mail, LayoutGrid, List, BookmarkCheck, BarChart2,
  Mic, MicOff, Volume2, VolumeX, RotateCcw,
  Sparkles, Wand2, ThumbsUp, ThumbsDown, Inbox, Edit3, CircleDot
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
// Screens in the app
type Screen =
  | "login" | "dashboard" | "it-department" | "dept-placeholder"
  | "policy-library" | "policy-details" | "notifications"
  | "recently-viewed" | "required-reading" | "saved-policies"
  | "ai-assistant" | "voice-assistant" | "version-comparison"
  | "admin" | "generate-policy";

type Lang = "en" | "ar";

function ApprovedResourceLinks({ response, lang, dark = false }: { response: RagAnswer; lang: Lang; dark?: boolean }) {
  const links = (response.links ?? []).filter(link =>
    link.url.startsWith("https://") || link.url.startsWith("mailto:")
  );
  if (!links.length) return null;

  const isRtl = lang === "ar";
  return (
    <div className={`${dark ? "border-white/10" : "border-[#EAF6F2]"} border-t pt-3 mt-3 ${isRtl ? "text-right" : "text-left"}`}>
      <p className={`text-xs font-semibold mb-2 ${dark ? "text-[#82CDB8]" : "text-[#638078]"}`}>
        {isRtl ? "روابط ووسائل تواصل معتمدة" : "Approved links and contacts"}
      </p>
      <div className={`flex flex-wrap gap-2 ${isRtl ? "justify-end" : "justify-start"}`}>
        {links.map(link => {
          const isWebsite = link.type === "website";
          const Icon = isWebsite ? ExternalLink : Mail;
          return (
            <a
              key={link.id}
              href={link.url}
              target={isWebsite ? "_blank" : undefined}
              rel={isWebsite ? "noreferrer noopener" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                dark
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-[#EAF6F2] text-[#007D68] hover:bg-[#007D68] hover:text-white"
              } ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <Icon size={13} />
              <span>{isRtl ? link.labelAr : link.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage can be unavailable */ }
  }, [key, value]);

  return [value, setValue];
}

interface Policy extends PolicyRecord {
  references?: Array<PolicyReference & { page: number | string }>;
}

interface Notification {
  id: string; type: "info" | "warning" | "success";
  title: string; titleAr: string; message: string; messageAr: string;
  date: string; read: boolean; policyId?: string;
}

interface SubmissionHistoryEntry {
  status: "pending" | "approved" | "under_review" | "rejected";
  date: string;
  note?: string;
}

interface PolicySubmission {
  id: string;
  policy: Policy;
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

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { id: "it", name: "Information Technology", nameAr: "تقنية المعلومات", description: "IT infrastructure, systems, support, and digital services policies.", descriptionAr: "سياسات البنية التحتية لتقنية المعلومات والأنظمة والدعم.", icon: "monitor", available: true, policyCount: 12 },
  { id: "hr", name: "Human Resources", nameAr: "الموارد البشرية", description: "Employee relations, hiring, payroll and wellbeing policies.", descriptionAr: "سياسات العلاقات الوظيفية والتوظيف والرواتب.", icon: "users", available: false, policyCount: 0 },
  { id: "training", name: "Training & Development", nameAr: "التدريب والتطوير", description: "Training programs, simulator usage, and instructor policies.", descriptionAr: "برامج التدريب واستخدام المحاكيات وسياسات المدربين.", icon: "graduation", available: false, policyCount: 0 },
  { id: "safety", name: "Safety & Compliance", nameAr: "السلامة والامتثال", description: "Safety procedures, emergency protocols, and regulatory compliance.", descriptionAr: "إجراءات السلامة والبروتوكولات الطارئة.", icon: "shield", available: false, policyCount: 0 },
  { id: "academic", name: "Academic Affairs", nameAr: "الشؤون الأكاديمية", description: "Examination standards, attendance, and academic integrity policies.", descriptionAr: "معايير الاختبارات والحضور وسياسات النزاهة الأكاديمية.", icon: "book", available: false, policyCount: 0 },
  { id: "qa", name: "Quality Assurance", nameAr: "ضمان الجودة", description: "Auditing, continuous improvement and quality management frameworks.", descriptionAr: "التدقيق والتحسين المستمر وأطر إدارة الجودة.", icon: "check-circle", available: false, policyCount: 0 },
  { id: "finance", name: "Finance", nameAr: "المالية", description: "Budgeting, procurement, expense reporting and financial controls.", descriptionAr: "سياسات الميزانية والمشتريات والتحكم المالي.", icon: "folder", available: false, policyCount: 0 },
  { id: "operations", name: "Operations", nameAr: "العمليات", description: "Facility management, fleet, and operational procedures.", descriptionAr: "إدارة المرافق والأسطول والإجراءات التشغيلية.", icon: "layers", available: false, policyCount: 0 },
];

const IT_CATEGORIES = [
  { id: "opm", name: "Office Procedures", nameAr: "إجراءات المكتب", description: "Step-by-step office operation manuals for IT staff.", icon: "document", documentCount: 8 },
  { id: "support", name: "Helpdesk & Support", nameAr: "الدعم الفني", description: "Ticket handling, SLAs, and escalation procedures.", icon: "message", documentCount: 5 },
  { id: "infra", name: "Infrastructure", nameAr: "البنية التحتية", description: "Network, servers, and data centre management policies.", icon: "layers", documentCount: 4 },
  { id: "security", name: "Cybersecurity", nameAr: "الأمن الإلكتروني", description: "Data protection, access control, and incident response.", icon: "shield", documentCount: 6 },
  { id: "edrak", name: "EDRAK System", nameAr: "نظام إدراك", description: "Daily and monthly routines for the EDRAK learning platform.", icon: "monitor", documentCount: 3 },
  { id: "continuity", name: "Business Continuity", nameAr: "استمرارية الأعمال", description: "Disaster recovery and business continuity activation procedures.", icon: "check-circle", documentCount: 4 },
];

const NOTIFICATIONS: Notification[] = [];

type AIResponse = RagAnswer;

const aiService = {
  getSuggestedQuestions: () => getSuggestedQuestions("en"),
  getSuggestedQuestionsAr: () => getSuggestedQuestions("ar"),
  ask: async (q: string, lang: Lang = "en", context?: RagConversationContext): Promise<AIResponse> => {
    await new Promise(resolve => window.setTimeout(resolve, 180));
    return askITKnowledgeBase(q, lang, context);
  },
};

// ─── Translations ─────────────────────────────────────────────────────────────

const T: Record<string, Record<Lang, string>> = {
  welcomeBack: { en: "Welcome back", ar: "أهلاً بعودتك" },
  searchPolicies: { en: "Search policies by name or keyword…", ar: "ابحث في السياسات بالاسم أو الكلمة المفتاحية…" },
  search: { en: "Search", ar: "بحث" },
  selectDepartment: { en: "Select a Department", ar: "اختر القسم" },
  available: { en: "Available", ar: "متاح" },
  comingSoon: { en: "Coming Soon", ar: "قريباً" },
  viewPolicies: { en: "View policies", ar: "عرض السياسات" },
  recentlyViewedPolicies: { en: "Recently Viewed", ar: "المشاهدة مؤخراً" },
  importantUpdates: { en: "Important Updates", ar: "التحديثات المهمة" },
  policyLibrary: { en: "Policy Library", ar: "مكتبة السياسات" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  markAllRead: { en: "Mark all as read", ar: "تحديد الكل كمقروء" },
  markRead: { en: "Mark as read", ar: "تحديد كمقروء" },
  noNotifications: { en: "No notifications yet", ar: "لا توجد إشعارات بعد" },
  openPolicy: { en: "Open policy", ar: "فتح السياسة" },
  active: { en: "Active", ar: "نشط" },
  draft: { en: "Draft", ar: "مسودة" },
  under_review: { en: "Under Review", ar: "قيد المراجعة" },
  approved: { en: "Approved", ar: "معتمد" },
  published: { en: "Published", ar: "منشور" },
  archived: { en: "Archived", ar: "مؤرشف" },
  allDepartments: { en: "All Departments", ar: "جميع الأقسام" },
  noResults: { en: "No results found", ar: "لا توجد نتائج" },
  policyTitle: { en: "Policy Title", ar: "عنوان السياسة" },
  category: { en: "Category", ar: "الفئة" },
  status: { en: "Status", ar: "الحالة" },
  edition: { en: "Edition", ar: "الإصدار" },
  department: { en: "Department", ar: "القسم" },
  documentType: { en: "Document Type", ar: "نوع الوثيقة" },
  effectiveDate: { en: "Effective Date", ar: "تاريخ النفاذ" },
  pages: { en: "Pages", ar: "الصفحات" },
  lastUpdated: { en: "Last Updated", ar: "آخر تحديث" },
  save: { en: "Save", ar: "حفظ" },
  saved: { en: "Saved", ar: "محفوظ" },
  share: { en: "Share", ar: "مشاركة" },
  openDocument: { en: "Open Document", ar: "فتح الوثيقة" },
  viewDocument: { en: "View Document", ar: "عرض الوثيقة" },
  view: { en: "View", ar: "عرض" },
  document: { en: "Document", ar: "وثيقة" },
  summary: { en: "Summary", ar: "الملخص" },
  keyProcedures: { en: "Key Procedures", ar: "الإجراءات الرئيسية" },
  relatedSections: { en: "Related Sections", ar: "الأقسام ذات الصلة" },
  versionHistory: { en: "Version History", ar: "تاريخ الإصدارات" },
  askAI: { en: "Ask AI", ar: "اسأل الذكاء الاصطناعي" },
  confirmReading: { en: "Confirm I Have Read This", ar: "تأكيد القراءة" },
  readingConfirmed: { en: "Reading Confirmed", ar: "تم تأكيد القراءة" },
  confirmedOn: { en: "Confirmed on", ar: "تم التأكيد في" },
  noData: { en: "Policy not found.", ar: "السياسة غير موجودة." },
  goBack: { en: "Go Back", ar: "العودة" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  recentlyViewed: { en: "Recently Viewed", ar: "المشاهدة مؤخراً" },
  requiredReading: { en: "Required Reading", ar: "القراءة الإلزامية" },
  savedPolicies: { en: "Saved Policies", ar: "السياسات المحفوظة" },
  managePolicies: { en: "Manage Policies", ar: "إدارة السياسات" },
  policy: { en: "policy", ar: "سياسة" },
  policies: { en: "policies", ar: "سياسات" },
  signIn: { en: "Sign in", ar: "تسجيل الدخول" },
  continueAsGuest: { en: "Continue as Guest", ar: "المتابعة كضيف" },
  guestDisclaimer: { en: "Guest access lets you browse the academy workspace without signing in.", ar: "يتيح لك الوصول كضيف تصفح مساحة الأكاديمية دون تسجيل دخول." },
  email: { en: "Email", ar: "البريد الإلكتروني" },
  password: { en: "Password", ar: "كلمة المرور" },
  rememberMe: { en: "Remember me", ar: "تذكرني" },
  invalidCredentials: { en: "Invalid email or password.", ar: "بريد إلكتروني أو كلمة مرور غير صحيحة." },
  departmentComingSoon: { en: "This department's policies are being digitized and will be available soon.", ar: "يتم حالياً رقمنة سياسات هذا القسم وستكون متاحة قريباً." },
  voiceAssistant: { en: "Voice Assistant", ar: "المساعد الصوتي" },
  voiceTitle: { en: "Bilingual Voice Assistant", ar: "المساعد الصوتي ثنائي اللغة" },
  voiceSubtitle: { en: "Speak in Arabic or English — answers come only from the approved IT OPM", ar: "تحدّث بالعربية أو الإنجليزية — الإجابات من دليل IT OPM المعتمد فقط" },
  voiceIdle: { en: "Tap the microphone to speak", ar: "اضغط على الميكروفون للتحدث" },
  voiceListening: { en: "Listening…", ar: "جارٍ الاستماع…" },
  voiceProcessing: { en: "Processing your question…", ar: "جارٍ معالجة سؤالك…" },
  voiceSpeaking: { en: "Speaking…", ar: "جارٍ التحدث…" },
  voiceError: { en: "Couldn't hear you — please try again", ar: "لم أتمكن من سماعك — حاول مرة أخرى" },
  voiceNotSupported: { en: "Voice input is not supported in this browser. Please use Chrome or Edge.", ar: "الإدخال الصوتي غير مدعوم في هذا المتصفح. الرجاء استخدام Chrome أو Edge." },
  voicePermissionDenied: { en: "Microphone access was denied. Please allow it in your browser settings.", ar: "تم رفض الوصول إلى الميكروفون. يرجى السماح به في إعدادات المتصفح." },
  voiceTranscript: { en: "What I heard", ar: "ما سمعته" },
  voiceResponse: { en: "Response", ar: "الإجابة" },
  voiceSource: { en: "Source", ar: "المصدر" },
  voiceTryAsk: { en: "Or try asking:", ar: "أو جرّب أن تسأل:" },
  voiceStop: { en: "Stop", ar: "إيقاف" },
  voiceRepeat: { en: "Repeat", ar: "إعادة" },
  voiceNewQuestion: { en: "New question", ar: "سؤال جديد" },
  voiceDetected: { en: "Detected language:", ar: "اللغة المكتشفة:" },
  aiTitle: { en: "IT Knowledge Assistant", ar: "مساعد معرفة تقنية المعلومات" },
  aiSubtitle: { en: "Ask about approved Information Technology procedures only.", ar: "اسأل عن إجراءات تقنية المعلومات المعتمدة فقط." },
  aiNotice: { en: "Closed knowledge base: answers use only the active IT OPM (6th Edition, effective 21 NOV 2024). When no approved evidence matches, the assistant refuses to guess.", ar: "قاعدة معرفة مغلقة: تستخدم الإجابات دليل IT OPM الفعّال فقط (الإصدار السادس، نافذ من 21 نوفمبر 2024). عند عدم وجود دليل معتمد يرفض المساعد التخمين." },
  demoMode: { en: "IT OPM Only", ar: "دليل IT OPM فقط" },
  suggestedQuestions: { en: "Suggested Questions", ar: "أسئلة مقترحة" },
  typeQuestion: { en: "Ask about an approved IT procedure…", ar: "اسأل عن إجراء معتمد في تقنية المعلومات…" },
  send: { en: "Send", ar: "إرسال" },
  openSource: { en: "Open Source", ar: "فتح المصدر" },
  sourceDocument: { en: "Source Document", ar: "الوثيقة المصدر" },
};

function makeT(lang: Lang) {
  return (key: string) => T[key]?.[lang] ?? key;
}

// ─── Icon Component ────────────────────────────────────────────────────────────

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const props = { className };
  const map: Record<string, React.ReactNode> = {
    search: <Search {...props} />, clock: <Clock {...props} />,
    "chevron-right": <ChevronRight {...props} />, "chevron-left": <ChevronLeft {...props} />,
    document: <FileText {...props} />, bookmark: <Bookmark {...props} />,
    "check-circle": <CheckCircle {...props} />, building: <Building {...props} />,
    folder: <Folder {...props} />, bell: <Bell {...props} />,
    warning: <AlertTriangle {...props} />, info: <Info {...props} />,
    pdf: <FileText {...props} />, share: <Share2 {...props} />,
    eye: <Eye {...props} />, "eye-off": <EyeOff {...props} />,
    pencil: <Pencil {...props} />, external: <ExternalLink {...props} />,
    grid: <LayoutGrid {...props} />, list: <List {...props} />,
    monitor: <Monitor {...props} />, x: <X {...props} />,
    users: <Users {...props} />, shield: <Shield {...props} />,
    book: <BookOpen {...props} />, graduation: <GraduationCap {...props} />,
    layers: <Layers {...props} />, message: <MessageSquare {...props} />,
    home: <Home {...props} />, bot: <Bot {...props} />,
    "bookmark-check": <BookmarkCheck {...props} />,
  };
  return <>{map[name] ?? <FileText {...props} />}</>;
}

// ─── Saudia Logo ──────────────────────────────────────────────────────────────

function SaudiaLogo({ white = false, size = "md" }: { white?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = size === "lg" ? 96 : size === "md" ? 64 : 40;
  return (
    <img
      src={saudiaLogoSrc}
      alt="Saudia One"
      style={{ height: h, width: "auto", filter: white ? "brightness(0) invert(1)" : "none" }}
      className="object-contain shrink-0 rounded-[0px]"
    />
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-teal-100 text-teal-700",
  published: "bg-violet-100 text-violet-700",
  archived: "bg-gray-100 text-gray-600",
};

// ─── Login Page ───────────────────────────────────────────────────────────────

interface AuthUser { name: string; role: "employee" | "academic" | "admin" | "guest"; email: string }

const AUTH_STORAGE_KEY = "saudia-one-auth-user";

function saveAuthUser(user: AuthUser, remember: boolean): void {
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;
  otherStorage.removeItem(AUTH_STORAGE_KEY);
  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

function loadAuthUser(): AuthUser | null {
  for (const storage of [window.sessionStorage, window.localStorage]) {
    try {
      const value = storage.getItem(AUTH_STORAGE_KEY);
      if (value) return JSON.parse(value) as AuthUser;
    } catch { /* ignore invalid browser storage */ }
  }
  return null;
}

function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [lang, setLang] = useState<Lang>("en");
  const [intro, setIntro] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isRtl = lang === "ar";
  const t = makeT(lang);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 2300);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPwd = password.trim();
    if (!trimmedEmail || !trimmedPwd) { setError(t("invalidCredentials")); return; }
    setLoading(true);

    if (!supabase) {
      const localName = trimmedEmail
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || trimmedEmail;
      const localUser: AuthUser = { name: localName, role: "employee", email: trimmedEmail };
      saveAuthUser(localUser, remember);
      setLoading(false);
      onLogin(localUser);
      return;
    }
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPwd });
    setLoading(false);
    if (authErr) {
      setError(isRtl ? "بريد إلكتروني أو كلمة مرور غير صحيحة." : "Invalid email or password.");
      return;
    }
    const meta = data.user?.user_metadata ?? {};
    const cloudUser: AuthUser = { name: meta.name ?? trimmedEmail, role: meta.role ?? "employee", email: trimmedEmail };
    saveAuthUser(cloudUser, remember);
    onLogin(cloudUser);
  }

  if (intro) {
    return (
      <main className="min-h-screen grid place-items-center overflow-hidden bg-[#063F36] p-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="absolute h-[38rem] w-[38rem] rounded-full border border-white/10" />
        <div className="absolute h-[24rem] w-[24rem] rounded-full border border-white/10" />
        <div className="absolute h-[12rem] w-[12rem] rounded-full border border-white/10" />
        <div className="relative text-center">
          <SaudiaLogo white size="lg" />
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[.28em] text-[#B8E2D5]">One place for academy knowledge</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F8F6] grid lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,.88fr)]" dir={isRtl ? "rtl" : "ltr"}>
      {/* Left panel */}
      <section className="relative hidden overflow-hidden bg-[#063F36] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute bottom-[-8rem] left-12 h-96 w-96 rounded-full bg-[#0A5649]" />
        <div className="flex justify-start">
          <SaudiaLogo white size="md" />
        </div>
        <div className="relative max-w-lg">
          <div className="mb-6 h-px w-16 bg-[#C59C4C]" />
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.055em] text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
            Policies that move<br />learning forward.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#C7E3DB]">
            A trusted space for the guidance, procedures, and knowledge that keep Saudia Academy in motion.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-5 border-t border-white/15 pt-6 text-sm text-[#C7E3DB]">
            <span>Clear guidance</span><span>Arabic &amp; English</span><span>Built for action</span>
          </div>
        </div>
        <p className="relative text-xs text-white/45">© {new Date().getFullYear()} Saudia One</p>
      </section>

      {/* Right form */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center justify-between">
            <SaudiaLogo size="md" />
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="rounded-full border border-[#CEE1DB] px-3 py-1.5 text-xs font-semibold text-[#007D68] hover:bg-[#EAF6F2] transition-colors"
            >
              {lang === "en" ? "العربية" : "English"}
            </button>
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>
            {t("signIn")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#638078]">
            {isRtl ? "سجّل الدخول للوصول إلى مساحة العمل الخاصة بك." : "Sign in to access your Saudia One workspace."}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-[#174C42]">
              {t("email")}
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                type="email" autoComplete="email"
                className="mt-2 h-12 w-full rounded-xl border border-[#CEE1DB] bg-white px-4 text-sm outline-none transition focus:border-[#007D68] focus:ring-4 focus:ring-[#007D68]/10"
              />
            </label>
            <label className="block text-sm font-medium text-[#174C42]">
              {t("password")}
              <span className="relative mt-2 block">
                <input
                  value={password} onChange={e => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"} autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-[#CEE1DB] bg-white px-4 pe-12 text-sm outline-none transition focus:border-[#007D68] focus:ring-4 focus:ring-[#007D68]/10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 end-0 px-4 text-[#638078]">
                  <Icon name={showPassword ? "eye-off" : "eye"} className="h-5 w-5" />
                </button>
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#638078] cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: "#007D68" }} />
              {t("rememberMe")}
            </label>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#007D68] text-sm font-semibold text-white shadow-lg shadow-[#007D68]/20 transition hover:bg-[#056655] disabled:opacity-60"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {loading ? (isRtl ? "جارٍ تسجيل الدخول…" : "Signing in…") : t("signIn")}
            </button>
          </form>
          <button
            onClick={() => {
              const guestUser: AuthUser = { name: isRtl ? "ضيف" : "Guest", role: "guest", email: "guest@saudia.one" };
              saveAuthUser(guestUser, false);
              onLogin(guestUser);
            }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#CEE1DB] bg-white text-sm font-semibold text-[#174C42] transition hover:bg-[#F3F8F6]"
          >
            <Users size={16} />
            {t("continueAsGuest")}
          </button>
          <p className="mt-3 text-xs text-[#638078]">{t("guestDisclaimer")}</p>

        </div>
      </main>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  screen, navigate, isAdmin, canAccessGeneratePolicy, onLogout, collapsed, setCollapsed, authUser, mobileOpen, setMobileOpen, lang
}: {
  screen: Screen; navigate: (s: Screen) => void; isAdmin: boolean; canAccessGeneratePolicy: boolean;
  onLogout: () => void; collapsed: boolean; setCollapsed: (v: boolean) => void;
  authUser: AuthUser; mobileOpen: boolean; setMobileOpen: (v: boolean) => void; lang: Lang;
}) {
  const isRtl = lang === "ar";
  // const isGuest = authUser.email === "guest@saudia.one";
  const isGuest = authUser.role === "guest";
  const nav = isGuest
  ? [
      {
        key: "policy-library" as Screen,
        icon: "book",
        label: "Policy Library",
        labelAr: "مكتبة السياسات",
      },
      { key: "ai-assistant" as Screen, icon: "bot", label: "AI Assistant", labelAr: "المساعد الذكي" },
      { key: "voice-assistant" as Screen, icon: "mic", label: "Voice Assistant", labelAr: "المساعد الصوتي", badge: true },
      { key: "recently-viewed" as Screen, icon: "clock", label: "Recently Viewed", labelAr: "المشاهدة مؤخرًا" },



    ]
  : [
      { key: "dashboard" as Screen, icon: "home", label: "Dashboard", labelAr: "لوحة التحكم" },
      { key: "policy-library" as Screen, icon: "book", label: "Policy Library", labelAr: "مكتبة السياسات" },
      ...(canAccessGeneratePolicy ? [{ key: "generate-policy" as Screen, icon: "sparkles", label: "Generate Policy", labelAr: "إصدار السياسات" }] : []),
      { key: "ai-assistant" as Screen, icon: "bot", label: "AI Assistant", labelAr: "المساعد الذكي" },
      { key: "voice-assistant" as Screen, icon: "mic", label: "Voice Assistant", labelAr: "المساعد الصوتي", badge: true },
      { key: "version-comparison" as Screen, icon: "compare", label: "Version Comparison", labelAr: "مقارنة الإصدارات" },
      { key: "notifications" as Screen, icon: "bell", label: "Notifications", labelAr: "الإشعارات" },
      { key: "required-reading" as Screen, icon: "bookmark-check", label: "Required Reading", labelAr: "القراءة الإلزامية" },
      { key: "saved-policies" as Screen, icon: "bookmark", label: "Saved Policies", labelAr: "السياسات المحفوظة" },
      { key: "recently-viewed" as Screen, icon: "clock", label: "Recently Viewed", labelAr: "المشاهدة مؤخرًا" },
      ...(isAdmin ? [{ key: "admin" as Screen, icon: "settings", label: "Admin Panel", labelAr: "لوحة الإدارة" }] : []),
    ];
  // const nav = [
  //   { key: "dashboard" as Screen, icon: "home", label: "Dashboard", labelAr: "لوحة التحكم" },
  //   { key: "policy-library" as Screen, icon: "book", label: "Policy Library", labelAr: "مكتبة السياسات" },
  //   ...(canAccessGeneratePolicy ? [{ key: "generate-policy" as Screen, icon: "sparkles", label: "Generate Policy", labelAr: "إصدار السياسات" }] : []),
  //   { key: "ai-assistant" as Screen, icon: "bot", label: "AI Assistant", labelAr: "المساعد الذكي" },
  //   { key: "voice-assistant" as Screen, icon: "mic", label: "Voice Assistant", labelAr: "المساعد الصوتي", badge: true },
  //   { key: "version-comparison" as Screen, icon: "compare", label: "Edition Information", labelAr: "مقارنة الإصدارات" },
  //   { key: "notifications" as Screen, icon: "bell", label: "Notifications", labelAr: "الإشعارات" },
  //   { key: "required-reading" as Screen, icon: "bookmark-check", label: "Required Reading", labelAr: "القراءة الإلزامية" },
  //   { key: "saved-policies" as Screen, icon: "bookmark", label: "Saved Policies", labelAr: "السياسات المحفوظة" },
  //   { key: "recently-viewed" as Screen, icon: "clock", label: "Recently Viewed", labelAr: "المشاهدة مؤخرًا" },
  //   ...(isAdmin ? [
  //     { key: "admin" as Screen, icon: "settings", label: "Admin Panel", labelAr: "لوحة الإدارة" },
  //   ] : []),
  // ];

  const iconMap: Record<string, React.ReactNode> = {
    home: <Home size={18} />, book: <BookOpen size={18} />, bot: <Bot size={18} />,
    compare: <GitCompare size={18} />, bell: <Bell size={18} />,
    "bookmark-check": <BookmarkCheck size={18} />, bookmark: <Bookmark size={18} />,
    clock: <Clock size={18} />, settings: <Settings size={18} />,
    mic: <Mic size={18} />,
    upload: <Upload size={18} />, manage: <Layers size={18} />,
    sparkles: <Sparkles size={18} />,
  };

  const isActive = (key: Screen) => {
    if (key === "dashboard") return screen === "dashboard" || screen === "it-department" || screen === "dept-placeholder";
    return screen === key;
  };

  function handleNav(key: Screen) {
    navigate(key);
    setMobileOpen(false);
  }

  return (
    <>
      <aside className={`hidden md:flex flex-col h-screen sticky top-0 bg-[#063F36] border-r border-white/5 transition-all duration-300 shrink-0 ${collapsed ? "w-16" : "w-60"}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-white/10">
          <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36 }}>
            <img src={saudiaLogoSrc} alt="Saudia One" style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }} className="object-contain" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <div className="text-white font-bold text-sm truncate" style={{ fontFamily: "'Barlow', sans-serif" }}>Saudia One</div>
              <div className="text-white/35 text-[9px] tracking-widest uppercase truncate">Policy &amp; Knowledge</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-white/40 hover:text-white/70 cursor-pointer shrink-0">
            <Menu size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.key);
            const itemLabel = isRtl ? item.labelAr : item.label;
            return (
              <button
                key={item.key}
                onClick={() => handleNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group relative ${
                  active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <span className="shrink-0">{iconMap[item.icon]}</span>
                {!collapsed && <span className="truncate flex-1">{itemLabel}</span>}
                {!collapsed && (item as { badge?: boolean }).badge && !active && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#007D68] text-white uppercase tracking-wide">{isRtl ? "جديد" : "New"}</span>
                )}
                {active && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#82CDB8]" />}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#0A5649] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {itemLabel}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer mb-1">
              <div className="w-8 h-8 rounded-full bg-[#007D68]/30 flex items-center justify-center shrink-0">
                <span className="text-[#82CDB8] text-xs font-bold">{authUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{authUser.name}</div>
                <div className="text-white/40 text-xs capitalize">{authUser.role}</div>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-900/20 transition-colors text-sm cursor-pointer ${collapsed ? "justify-center" : ""}`}
          >
            <LogOut size={16} />
            {!collapsed && <span>{isRtl ? "تسجيل الخروج" : "Sign Out"}</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside dir={isRtl ? "rtl" : "ltr"} className={`absolute ${isRtl ? "right-0" : "left-0"} top-0 h-full w-72 bg-[#063F36] flex flex-col shadow-2xl overflow-y-auto`}>
            <div className="flex items-center gap-2 px-3 py-4 border-b border-white/10">
              <img src={saudiaLogoSrc} alt="Saudia One" style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }} className="object-contain shrink-0" />
              <div className="overflow-hidden flex-1">
                <div className="text-white font-bold text-sm truncate" style={{ fontFamily: "'Barlow', sans-serif" }}>Saudia One</div>
                <div className="text-white/35 text-[9px] tracking-widest uppercase truncate">Policy & Knowledge</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="ml-auto text-white/40 hover:text-white/70 cursor-pointer shrink-0"><X size={16} /></button>
            </div>
            <nav className="flex-1 py-4 px-2 space-y-0.5">
              {nav.map((item) => {
                const active = isActive(item.key);
                const itemLabel = isRtl ? item.labelAr : item.label;
                return (
                  <button key={item.key} onClick={() => handleNav(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/80"}`}>
                    <span className="shrink-0">{iconMap[item.icon]}</span>
                    <span className="truncate flex-1">{itemLabel}</span>
                    {(item as { badge?: boolean }).badge && !active && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#007D68] text-white uppercase">{isRtl ? "جديد" : "New"}</span>}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#82CDB8]" />}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center gap-3 px-2 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#007D68]/30 flex items-center justify-center shrink-0">
                  <span className="text-[#82CDB8] text-xs font-bold">{authUser.name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-xs font-semibold truncate">{authUser.name}</div>
                  <div className="text-white/40 text-xs capitalize">{authUser.role}</div>
                </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-900/20 transition-colors text-sm cursor-pointer">
                <LogOut size={16} /><span>{isRtl ? "تسجيل الخروج" : "Sign Out"}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ title, subtitle, unreadCount, navigate, authUser, onMenuClick, lang, setLang }: {
  title: string; subtitle?: string; unreadCount: number; navigate: (s: Screen) => void; authUser: AuthUser; onMenuClick: () => void;
  lang: Lang; setLang: (lang: Lang) => void;
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-[#CEE1DB]">
      <button onClick={onMenuClick} className="p-2 rounded-lg md:hidden hover:bg-[#F3F8F6] text-[#638078] cursor-pointer shrink-0"><Menu size={20} /></button>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{title}</h1>
        {subtitle && <p className="text-xs text-[#638078] mt-0.5">{subtitle}</p>}
      </div>
      <button
        onClick={() => setLang(lang === "en" ? "ar" : "en")}
        className="px-3 py-1.5 rounded-lg border border-[#CEE1DB] text-xs font-semibold text-[#007D68] hover:bg-[#EAF6F2] transition-colors"
        title={lang === "en" ? "العربية" : "English"}
      >
        {lang === "en" ? "العربية" : "English"}
      </button>
      <button
        onClick={() => navigate("notifications")}
        className="relative p-2 rounded-lg hover:bg-[#F3F8F6] transition-colors text-[#638078] hover:text-[#174C42] cursor-pointer"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      <div className="w-8 h-8 rounded-full bg-[#EAF6F2] flex items-center justify-center cursor-pointer">
        <span className="text-[#007D68] text-xs font-bold">{authUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ lang, navigate, policies, recentlyViewedIds, authUser ,  savedIds}: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; recentlyViewedIds: string[]; authUser: AuthUser;
    savedIds: string[];

}) {
  const [search, setSearch] = useState("");
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const recentPolicies = recentlyViewedIds.slice(0, 3).map(id => policies.find(p => p.id === id)).filter(Boolean) as Policy[];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate("policy-library", { search });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#174C42] mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>
          {t("welcomeBack")}, {authUser.name.split(" ")[0]} 👋
        </h1>
        <p className="text-[#638078] text-sm">
          {isRtl ? "ابحث في سياسات الأكاديمية واستعرض أقسامها." : "Search and browse official academy policies across all departments."}
        </p>
      </div>




{/* Overview Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

  <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-11 h-11 rounded-xl bg-[#EAF6F2] flex items-center justify-center">
        <Icon name="document" className="w-5 h-5 text-[#007D68]" />
      </div>
      <span className="text-xs text-[#638078]">
        {isRtl ? "إجمالي" : "Total"}
      </span>
    </div>

    <div className="text-3xl font-bold text-[#174C42]">
      {policies.length}
    </div>

    <div className="text-sm text-[#638078] mt-1">
      {isRtl ? "سياسة وإجراء" : "Policies & Procedures"}
    </div>
  </div>

  <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-11 h-11 rounded-xl bg-[#EAF6F2] flex items-center justify-center">
        <Icon name="building" className="w-5 h-5 text-[#007D68]" />
      </div>
      <span className="text-xs text-[#638078]">
        {isRtl ? "الأقسام" : "Departments"}
      </span>
    </div>

    <div className="text-3xl font-bold text-[#174C42]">
      {DEPARTMENTS.length}
    </div>

    <div className="text-sm text-[#638078] mt-1">
      {isRtl ? "قسم متاح" : "Departments"}
    </div>
  </div>

  <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-11 h-11 rounded-xl bg-[#EAF6F2] flex items-center justify-center">
        <Icon name="bookmark" className="w-5 h-5 text-[#007D68]" />
      </div>
      <span className="text-xs text-[#638078]">
        {isRtl ? "المحفوظة" : "Saved"}
      </span>
    </div>

    {/* <div className="text-3xl font-bold text-[#174C42]">
      12
    </div> */}
 <div className="text-3xl font-bold text-[#174C42]">
      {savedIds.length}
    </div>

    <div className="text-sm text-[#638078] mt-1">
      {isRtl ? "سياسات محفوظة" : "Saved Policies"}
    </div>
  </div>

  <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="w-11 h-11 rounded-xl bg-[#EAF6F2] flex items-center justify-center">
        <Icon name="bell" className="w-5 h-5 text-[#007D68]" />
      </div>
      <span className="text-xs text-[#638078]">
        {isRtl ? "التحديثات" : "Updates"}
      </span>
    </div>

    <div className="text-3xl font-bold text-[#174C42]">
      2
    </div>

    <div className="text-sm text-[#638078] mt-1">
      {isRtl ? "إشعارات جديدة" : "New Notifications"}
    </div>
  </div>

</div>





      {/* Search */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative max-w-2xl">
          <Icon name="search" className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-[#638078]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPolicies")}
            className="w-full h-12 bg-white border border-[#CEE1DB] rounded-xl ps-12 pe-4 text-sm text-[#174C42] placeholder-[#638078]/70 focus:outline-none focus:border-[#007D68] shadow-sm transition-colors"
          />
          <button type="submit" className="absolute top-1/2 -translate-y-1/2 end-3 px-4 py-1.5 bg-[#007D68] text-white text-sm font-medium rounded-lg hover:bg-[#056655] transition-colors">
            {t("search")}
          </button>
        </div>
      </form>

      {/* Departments */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[#174C42] mb-4">{t("selectDepartment")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DEPARTMENTS.map(dept => {
            const name = isRtl ? dept.nameAr : dept.name;
            const desc = isRtl ? dept.descriptionAr : dept.description;
            return (
              <div
                key={dept.id}
                onClick={() => dept.available ? (dept.id === "it" ? navigate("it-department") : navigate("dept-placeholder", { deptId: dept.id, deptName: dept.name })) : navigate("dept-placeholder", { deptId: dept.id, deptName: dept.name })}
                className={`group bg-white border rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${dept.available ? "border-[#007D68]/30 hover:border-[#007D68] hover:shadow-[#007D68]/10" : "border-[#CEE1DB] hover:border-[#CEE1DB]"}`}
              >
                <div className={`flex items-start justify-between mb-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${dept.available ? "bg-[#EAF6F2] text-[#007D68]" : "bg-[#F3F8F6] text-[#638078]"}`}>
                    <Icon name={dept.icon} className="w-7 h-7" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${dept.available ? "bg-[#EAF6F2] text-[#007D68]" : "bg-[#F3F8F6] text-[#638078]"}`}>
                    {dept.available ? t("available") : t("comingSoon")}
                  </span>
                </div>
                <h3 className={`font-semibold text-[#174C42] text-sm mb-1 ${isRtl ? "text-right" : ""}`}>{name}</h3>
                <p className={`text-xs text-[#638078] mb-3 line-clamp-2 ${isRtl ? "text-right" : ""}`}>{desc}</p>
                <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs text-[#638078]">{dept.policyCount} {t("policies")}</span>
                  <span className={`text-xs font-medium flex items-center gap-1 ${dept.available ? "text-[#007D68]" : "text-[#638078]"} ${isRtl ? "flex-row-reverse" : ""}`}>
                    {t("viewPolicies")}
                    <Icon name={isRtl ? "chevron-left" : "chevron-right"} className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently viewed */}
        <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
          <div className={`flex items-center justify-between mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            <h3 className="font-semibold text-[#174C42] text-sm">{t("recentlyViewedPolicies")}</h3>
            <button onClick={() => navigate("recently-viewed")} className="text-xs text-[#007D68] hover:underline">{isRtl ? "عرض الكل" : "View all"}</button>
          </div>
          {recentPolicies.length === 0 ? (
            <div className="text-center py-8 text-[#638078] text-sm">
              <Icon name="clock" className="w-8 h-8 mx-auto mb-2 opacity-40" />
              {isRtl ? "لم تشاهد أي سياسات بعد" : "No recently viewed policies"}
            </div>
          ) : (
            <div className="space-y-2">
              {recentPolicies.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate("policy-details", { policyId: p.id })}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F3F8F6] transition-colors ${isRtl ? "flex-row-reverse text-right" : ""}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                    <Icon name="document" className="w-4 h-4 text-[#007D68]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#174C42] truncate">{isRtl ? p.titleAr : p.title}</div>
                    <div className="text-xs text-[#638078]">{p.department}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                    {makeT(lang)(p.status)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Important updates */}
        <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
          <h3 className={`font-semibold text-[#174C42] text-sm mb-4 ${isRtl ? "text-right" : ""}`}>{t("importantUpdates")}</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[#EAF6F2] rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#007D68] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="document" className="w-3.5 h-3.5 text-white" />
              </div>
              <div className={isRtl ? "text-right" : ""}>
                <div className="text-xs font-semibold text-[#174C42] mb-0.5">
                  {isRtl ? "IT OPM الإصدار 6 متاح" : "IT OPM Edition 6 Available"}
                </div>
                <div className="text-xs text-[#638078]">
                  {isRtl ? "دليل إجراءات مكتب تقنية المعلومات تم تحديثه في نوفمبر 2024." : "The IT Office Procedure Manual was updated November 2024."}
                </div>
                <button onClick={() => navigate("policy-details", { policyId: "p-it-opm" })} className="text-xs text-[#007D68] font-medium mt-1 hover:underline">
                  {t("view")} →
                </button>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="warning" className="w-3.5 h-3.5 text-white" />
              </div>
              <div className={isRtl ? "text-right" : ""}>
                <div className="text-xs font-semibold text-amber-900 mb-0.5">
                  {isRtl ? "مطلوب إقرار: سياسة الحضور" : "Acknowledgment Due: Attendance Policy"}
                </div>
                <div className="text-xs text-amber-700">
                  {isRtl ? "الموعد النهائي: 5 أبريل 2024." : "Deadline: 5 April 2024."}
                </div>
                <button onClick={() => navigate("policy-details", { policyId: "p-hr-leave" })} className="text-xs text-amber-700 font-medium mt-1 hover:underline">
                  {t("view")} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── IT Department ────────────────────────────────────────────────────────────

function ITDepartment({ lang, navigate }: { lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void }) {
  const isRtl = lang === "ar";
  const t = makeT(lang);

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex items-center gap-2 text-sm text-[#638078] mb-6 ${isRtl ? "flex-row-reverse" : ""}`}>
        <button onClick={() => navigate("dashboard")} className="hover:text-[#007D68]">{t("dashboard")}</button>
        <Icon name={isRtl ? "chevron-left" : "chevron-right"} className="w-3.5 h-3.5" />
        <span className="text-[#174C42] font-medium">{isRtl ? "تقنية المعلومات" : "Information Technology"}</span>
      </div>

      <div className={`flex items-start gap-4 mb-8 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div className="w-14 h-14 rounded-xl bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
          <Icon name="monitor" className="w-7 h-7 text-[#007D68]" />
        </div>
        <div className={isRtl ? "text-right" : ""}>
          <h1 className="text-2xl font-bold text-[#174C42] mb-1" style={{ fontFamily: "'Barlow', sans-serif" }}>
            {isRtl ? "قسم تقنية المعلومات" : "Information Technology"}
          </h1>
          <p className="text-[#638078] text-sm">
            {isRtl ? "سياسات وإجراءات قسم تقنية المعلومات" : "IT infrastructure, systems, support, and digital services policies and procedures."}
          </p>
        </div>
      </div>

      {/* Featured policy */}
      <div className="mb-8 p-5 bg-gradient-to-r from-[#007D68] to-[#056655] rounded-2xl text-white">
        <div className={`flex items-start justify-between gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className={isRtl ? "text-right" : ""}>
            <div className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              {isRtl ? "المستند المتاح" : "Available Document"}
            </div>
            <h2 className="text-lg font-bold mb-2">
              {isRtl ? "دليل إجراءات مكتب تقنية المعلومات" : "Information Technology Office Procedure Manual"}
            </h2>
            <div className={`flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-white/80 mb-4 ${isRtl ? "justify-end" : ""}`}>
              <span>{isRtl ? "الإصدار" : "Edition"} 6</span>
              <span>{isRtl ? "تاريخ النفاذ:" : "Effective:"} 21 Nov 2024</span>
              <span>43 {isRtl ? "صفحة" : "pages"}</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                {isRtl ? "نشط" : "Active"}
              </span>
            </div>
            <button
              onClick={() => navigate("policy-details", { policyId: "p-it-opm" })}
              className="px-4 py-2 bg-white text-[#007D68] text-sm font-semibold rounded-lg hover:bg-[#EAF6F2] transition-colors"
            >
              {t("viewDocument")}
            </button>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-xl bg-white/10 items-center justify-center flex-shrink-0">
            <Icon name="pdf" className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div>
        <h2 className={`text-lg font-bold text-[#174C42] mb-4 ${isRtl ? "text-right" : ""}`}>
          {isRtl ? "فئات الوثائق" : "Document Categories"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {IT_CATEGORIES.map(cat => {
            const name = isRtl ? cat.nameAr : cat.name;
            return (
              <div
                key={cat.id}
                onClick={() => navigate("policy-details", { policyId: "p-it-opm" })}
                className="group bg-white border border-[#CEE1DB] rounded-xl p-4 cursor-pointer hover:border-[#007D68]/40 hover:shadow-md transition-all"
              >
                <div className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-9 h-9 rounded-lg bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                    <Icon name={cat.icon} className="w-4 h-4 text-[#007D68]" />
                  </div>
                  <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : ""}`}>
                    <h3 className="text-sm font-semibold text-[#174C42] mb-0.5 line-clamp-1">{name}</h3>
                    <p className="text-xs text-[#638078] line-clamp-2">{cat.description}</p>
                  </div>
                </div>
                <div className={`flex items-center justify-between mt-3 pt-3 border-t border-[#CEE1DB] ${isRtl ? "flex-row-reverse" : ""}`}>
                  <span className="text-xs text-[#638078]">{cat.documentCount} {isRtl ? "مستند" : "document"}</span>
                  <span className={`text-xs text-[#007D68] font-medium flex items-center gap-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                    {t("view")} <Icon name={isRtl ? "chevron-left" : "chevron-right"} className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Dept Placeholder ─────────────────────────────────────────────────────────

function DeptPlaceholder({ lang, navigate, pageParams }: {
  lang: Lang; navigate: (s: Screen) => void; pageParams: Record<string, string>;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const dept = DEPARTMENTS.find(d => d.id === pageParams.deptId);
  const name = isRtl ? dept?.nameAr : (dept?.name ?? pageParams.deptName);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <button
        onClick={() => navigate("dashboard")}
        className={`flex items-center gap-2 text-[#638078] hover:text-[#007D68] text-sm mb-6 ${isRtl ? "flex-row-reverse" : ""}`}
      >
        <Icon name={isRtl ? "chevron-right" : "chevron-left"} className="w-4 h-4" />
        {isRtl ? "العودة إلى لوحة التحكم" : "Back to Dashboard"}
      </button>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#EAF6F2] flex items-center justify-center mb-6">
          <Icon name={dept?.icon ?? "building"} className="w-10 h-10 text-[#007D68]" />
        </div>
        <h1 className="text-2xl font-bold text-[#174C42] mb-3">{name}</h1>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#EAF6F2] text-[#007D68] rounded-full text-sm font-medium mb-4">
          <Icon name="clock" className="w-4 h-4" />
          {t("comingSoon")}
        </div>
        <p className="text-[#638078] max-w-md">{t("departmentComingSoon")}</p>
        <button
          onClick={() => navigate("dashboard")}
          className="mt-8 px-6 py-2.5 bg-[#007D68] text-white text-sm font-medium rounded-lg hover:bg-[#056655] transition-colors"
        >
          {isRtl ? "العودة إلى الأقسام" : "Back to Departments"}
        </button>
      </div>
    </div>
  );
}

// ─── Policy Library ───────────────────────────────────────────────────────────

function PolicyLibrary({ lang, navigate, policies, pageParams }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; pageParams: Record<string, string>;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const [search, setSearch] = useState(pageParams.search ?? "");
  const [dept, setDept] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const departments = ["all", ...new Set(policies.map(p => p.department))];
  const filtered = policies.filter(p =>
    (dept === "all" || p.department === dept) &&
    [p.title, p.titleAr, p.department, p.category, p.description].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl p-5 sm:p-7" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`mb-7 flex flex-wrap items-end justify-between gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#007D68]">Saudia One</p>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("policyLibrary")}</h1>
          <p className="mt-2 text-sm text-[#638078]">{filtered.length} {isRtl ? "سياسة متاحة في سعودية وان." : "policies available across Saudia One."}</p>
        </div>
      </div>

      {/* Filters */}
      <div className={`mb-6 flex flex-wrap gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div className="relative min-w-52 flex-1">
          <Icon name="search" className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#638078]" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPolicies")}
            className="h-10 w-full rounded-xl border border-[#CEE1DB] bg-white ps-9 pe-3 text-sm outline-none focus:border-[#007D68]"
          />
        </div>
        <select
          value={dept} onChange={e => setDept(e.target.value)}
          className="h-10 rounded-xl border border-[#CEE1DB] bg-white px-3 text-sm text-[#174C42]"
        >
          <option value="all">{t("allDepartments")}</option>
          {departments.slice(1).map(d => <option key={d}>{d}</option>)}
        </select>
        <div className="flex overflow-hidden rounded-xl border border-[#CEE1DB]">
          <button onClick={() => setView("grid")} className={`px-3 ${view === "grid" ? "bg-[#007D68] text-white" : "bg-white text-[#638078]"}`}>
            <Icon name="grid" className="h-4 w-4" />
          </button>
          <button onClick={() => setView("table")} className={`px-3 ${view === "table" ? "bg-[#007D68] text-white" : "bg-white text-[#638078]"}`}>
            <Icon name="list" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!filtered.length ? (
        <div className="py-24 text-center text-sm text-[#638078]">
          <Icon name="search" className="mx-auto mb-3 h-10 w-10 text-[#CEE1DB]" />
          {t("noResults")}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => (
            <article
              key={p.id}
              onClick={() => navigate("policy-details", { policyId: p.id })}
              className="group rounded-2xl border border-[#D8E7E2] bg-white p-5 cursor-pointer transition hover:-translate-y-0.5 hover:border-[#8FCFC0] hover:shadow-lg hover:shadow-[#0B5648]/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF6F2] text-[#007D68]">
                  <Icon name="document" className="h-5 w-5" />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[p.status]}`}>{t(p.status)}</span>
              </div>
              <h2 className="mt-5 text-base font-semibold text-[#174C42]">{isRtl ? p.titleAr : p.title}</h2>
              <p className="mt-2 min-h-10 text-sm leading-relaxed text-[#638078]">{isRtl ? p.descriptionAr : p.description}</p>
              <div className="mt-5 border-t border-[#E7F0ED] pt-3 text-xs text-[#638078]">
                <span>{p.department} · {t("edition")} {p.edition}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#D8E7E2] bg-white">
          <table className="w-full">
            <thead className="bg-[#F3F8F6] text-left text-[11px] font-bold uppercase tracking-wider text-[#638078]">
              <tr>
                <th className="p-4">{t("policyTitle")}</th>
                <th className="hidden p-4 md:table-cell">{t("category")}</th>
                <th className="p-4">{t("status")}</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-[#E7F0ED] hover:bg-[#F3F8F6] cursor-pointer" onClick={() => navigate("policy-details", { policyId: p.id })}>
                  <td className="p-4">
                    <div className="font-medium text-[#174C42]">{isRtl ? p.titleAr : p.title}</div>
                    <div className="mt-1 text-xs text-[#638078]">{p.department}</div>
                  </td>
                  <td className="hidden p-4 text-sm text-[#638078] md:table-cell">{p.category}</td>
                  <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[p.status]}`}>{t(p.status)}</span></td>
                  <td className="p-4 text-right">
                    <span className="text-xs text-[#007D68] font-medium hover:underline">{t("view")} →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Policy Details ───────────────────────────────────────────────────────────

const DETAIL_TABS = ["document", "summary", "keyProcedures", "relatedSections", "versionHistory", "askAI"] as const;
type DetailTab = typeof DETAIL_TABS[number];

function PolicyDetails({ lang, navigate, policies, savedIds, toggleSave, recentlyViewedIds: _recentlyViewedIds, addRecentlyViewed, readConfirmations, confirmReading, pageParams, pdfUrl }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; savedIds: string[]; toggleSave: (id: string) => void;
  recentlyViewedIds: string[]; addRecentlyViewed: (id: string) => void;
  readConfirmations: Record<string, string>; confirmReading: (id: string) => void;
  pageParams: Record<string, string>;
  pdfUrl?: string | null;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const policy = policies.find(p => p.id === pageParams.policyId);
  const [activeTab, setActiveTab] = useState<DetailTab>("document");
  const [shareMsg, setShareMsg] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);

  useEffect(() => { if (policy) addRecentlyViewed(policy.id); }, [policy?.id]);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!policy?.documentKey) { setLocalPdfUrl(null); return; }
    loadLocalPdfUrl(policy.documentKey).then(url => {
      objectUrl = url;
      if (active) setLocalPdfUrl(url);
    }).catch(() => { if (active) setLocalPdfUrl(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [policy?.documentKey]);

  if (!policy) {
    return (
      <div className="p-8 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <p className="text-[#638078]">{t("noData")}</p>
        <button onClick={() => navigate("policy-library")} className="mt-4 px-4 py-2 bg-[#007D68] text-white rounded-lg text-sm">{t("goBack")}</button>
      </div>
    );
  }

  const title = isRtl ? policy.titleAr : policy.title;
  const visibleDetailTabs: readonly DetailTab[] = policy.id === "p-it-opm" ? DETAIL_TABS : ["document", "summary", "versionHistory"];
  const isSaved = savedIds.includes(policy.id);
  const isConfirmed = !!readConfirmations[policy.id];
  const activePdfUrl = policy.id === "p-it-opm" ? pdfUrl ?? null : localPdfUrl;
  const hasPdfDocument = policy.id === "p-it-opm" || Boolean(policy.documentKey);
  const documentName = policy.documentName ?? (policy.id === "p-it-opm" ? "IT_OPM__Ed._6.pdf" : `${policy.title}.pdf`);

  function handleShare() {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setShareMsg(isRtl ? "تم نسخ الرابط!" : "Link copied!");
    setTimeout(() => setShareMsg(""), 2000);
  }

  function handleConfirmReading() {
    confirmReading(policy!.id);
    setConfirmMsg(isRtl ? "تم تأكيد القراءة بنجاح!" : "Reading confirmed successfully!");
    setTimeout(() => setConfirmMsg(""), 4000);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Breadcrumb */}
      <div className={`flex items-center gap-2 text-sm text-[#638078] mb-6 ${isRtl ? "flex-row-reverse" : ""}`}>
        <button onClick={() => navigate("policy-library")} className="hover:text-[#007D68]">{t("policyLibrary")}</button>
        <Icon name={isRtl ? "chevron-left" : "chevron-right"} className="w-3.5 h-3.5" />
        <span className="text-[#174C42] font-medium truncate max-w-xs">{title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left – metadata */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-[#CEE1DB] rounded-xl p-5">
            <div className={`flex items-start justify-between gap-2 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <div className="w-12 h-12 rounded-xl bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                <Icon name="pdf" className="w-6 h-6 text-[#007D68]" />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[policy.status]}`}>
                {t(policy.status)}
              </span>
            </div>
            <h1 className={`text-base font-bold text-[#174C42] mb-4 ${isRtl ? "text-right" : ""}`}>{title}</h1>
            <div className="space-y-2.5 text-sm">
              {[
                { label: t("department"), value: policy.department },
                { label: t("documentType"), value: policy.documentType },
                { label: t("edition"), value: String(policy.edition) },
                { label: t("effectiveDate"), value: policy.effectiveDate },
                { label: t("pages"), value: `${policy.pages} ${isRtl ? "صفحة" : "pages"}` },
                { label: t("lastUpdated"), value: policy.lastUpdated },
              ].map(({ label, value }) => (
                <div key={label} className={`flex justify-between gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <span className="text-[#638078] text-xs">{label}</span>
                  <span className="text-[#174C42] text-xs font-medium text-end">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => toggleSave(policy.id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSaved ? "bg-[#EAF6F2] text-[#007D68] border-[#007D68]/30" : "bg-white text-[#638078] border-[#CEE1DB] hover:bg-[#EAF6F2] hover:text-[#007D68]"} ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <Icon name="bookmark" className="w-4 h-4" />
              {isSaved ? t("saved") : t("save")}
            </button>
            <button
              onClick={handleShare}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-white text-[#638078] border border-[#CEE1DB] hover:bg-[#F3F8F6] transition-colors ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <Icon name="share" className="w-4 h-4" />
              {shareMsg || t("share")}
            </button>
            {policy.id === "p-it-opm" && (
              <button
                onClick={() => navigate("version-comparison")}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[#007D68] text-white hover:bg-[#056655] transition-colors ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <GitCompare size={16} />
                {isRtl ? "مقارنة الإصدارات" : "Version Comparison"}
              </button>
            )}
          </div>

          {/* Confirm reading */}
          {policy.requiresReading && (
            <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${isRtl ? "text-right" : ""}`}>
              {isConfirmed ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <Icon name="check-circle" className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{t("readingConfirmed")}</div>
                    <div className="text-xs">{t("confirmedOn")} {readConfirmations[policy.id]}</div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-amber-700 mb-3">
                    {isRtl ? "هذه السياسة تتطلب تأكيد القراءة." : "This policy requires reading confirmation."}
                  </p>
                  <button
                    onClick={handleConfirmReading}
                    className="w-full py-2 bg-[#007D68] text-white text-xs font-semibold rounded-lg hover:bg-[#056655] transition-colors"
                  >
                    {t("confirmReading")}
                  </button>
                  {confirmMsg && <p className="text-xs text-emerald-700 mt-2 font-medium">{confirmMsg}</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right – tabs */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-[#CEE1DB] rounded-xl overflow-hidden">
            <div className={`flex overflow-x-auto border-b border-[#CEE1DB] bg-[#F3F8F6] ${isRtl ? "flex-row-reverse" : ""}`}>
              {visibleDetailTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? "border-[#007D68] text-[#007D68] bg-white" : "border-transparent text-[#638078] hover:text-[#174C42]"}`}
                >
                  {t(tab)}
                </button>
              ))}
            </div>

            <div className="p-5">
              {activeTab === "document" && (
                <div className={isRtl ? "text-right" : ""}>
                  {hasPdfDocument ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText size={14} className="text-[#007D68]" />
                          <span className="font-medium text-[#174C42]">{documentName}</span>
                          {activePdfUrl && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                              {policy.id === "p-it-opm" ? "Bundled with app" : "Saved locally"}
                            </span>
                          )}
                        </div>
                        {activePdfUrl && (
                          <a href={activePdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#638078] hover:text-[#174C42]">
                            <Download size={13} /> Download
                          </a>
                        )}
                      </div>
                      {activePdfUrl ? (
                        <iframe src={`${activePdfUrl}#toolbar=1&navpanes=0`} title={documentName} className="w-full h-[520px] block rounded-xl border border-[#CEE1DB]" />
                      ) : (
                        <div className="h-96 flex flex-col items-center justify-center gap-3 text-[#638078] bg-[#F3F8F6] rounded-xl">
                          <Icon name="pdf" className="w-12 h-12 opacity-25" />
                          <p className="text-sm font-medium">PDF document is not available in this browser.</p>
                          <p className="text-xs text-amber-600">Upload the file again from the Admin Panel.</p>
                        </div>
                      )}
                    </>
                  ) : policy.content || policy.contentAr ? (
                    <div className="space-y-4">
                      <div className={`flex items-center justify-between gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                        <div><h3 className="font-semibold text-[#174C42]">{title}</h3><p className="text-xs text-[#638078] mt-1">{policy.generatedBy === "ai-assisted" ? (isRtl ? "مسودة بمساعدة آلية" : "AI-assisted draft") : (isRtl ? "وثيقة نصية" : "Text document")}</p></div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{isRtl ? "تتطلب اعتمادًا" : "Approval required"}</span>
                      </div>
                      <pre dir={isRtl ? "rtl" : "ltr"} className="whitespace-pre-wrap break-words text-sm leading-7 text-[#174C42] bg-[#F8FBFA] border border-[#CEE1DB] rounded-xl p-5 font-sans max-h-[620px] overflow-y-auto">{isRtl ? (policy.contentAr || policy.content) : (policy.content || policy.contentAr)}</pre>
                    </div>
                  ) : (
                    <div className="bg-[#F3F8F6] border border-[#CEE1DB] rounded-xl p-8 text-center mb-4">
                      <Icon name="document" className="w-16 h-16 text-[#007D68] mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-[#174C42] mb-1">{title}</h3>
                      <p className="text-sm text-[#638078]">{isRtl ? "لا يوجد ملف أو محتوى نصي لهذه الوثيقة." : "No file or text content is available for this document."}</p>
                    </div>
                  )}
                  <p className="text-sm text-[#638078] mt-4">{isRtl ? policy.descriptionAr : policy.description}</p>
                </div>
              )}

              {activeTab === "summary" && (
                <div className={isRtl ? "text-right" : ""}>
                  <h3 className="text-base font-bold text-[#174C42] mb-4">{isRtl ? "ملخص المستند" : "Document Summary"}</h3>
                  <p className="text-sm text-[#638078] leading-7">{isRtl ? policy.descriptionAr : policy.description}</p>
                  {(isRtl ? policy.keywordsAr : policy.keywords)?.length ? (
                    <div className="mt-5"><p className="text-xs font-semibold text-[#638078] mb-2">{isRtl ? "كلمات البحث" : "Search keywords"}</p><div className="flex flex-wrap gap-2">{(isRtl ? policy.keywordsAr : policy.keywords)!.map(keyword => <span key={keyword} className="px-2.5 py-1 rounded-full bg-[#EAF6F2] text-[#007D68] text-xs">{keyword}</span>)}</div></div>
                  ) : null}
                  {policy.references?.length ? (
                    <div className="mt-5"><p className="text-xs font-semibold text-[#638078] mb-2">{isRtl ? "المراجع المرتبطة" : "Linked references"}</p><div className="space-y-2">{policy.references.map(ref => <div key={ref.groupId} className="border border-[#CEE1DB] rounded-lg p-3 text-xs text-[#638078]"><strong className="text-[#174C42]">{isRtl ? ref.titleAr : ref.title}</strong><br />{ref.groupId} · {isRtl ? "صفحة" : "page"} {ref.page} · {ref.recordIds.join(", ")}</div>)}</div></div>
                  ) : null}
                </div>
              )}

              {activeTab === "keyProcedures" && (
                <div className={isRtl ? "text-right" : ""}>
                  <h3 className="text-base font-bold text-[#174C42] mb-4">{t("keyProcedures")}</h3>
                  <div className="space-y-3">
                    {[
                      { title: "System Failure Response and Business Continuity", titleAr: "الاستجابة لتعطل الأنظمة واستمرارية الأعمال", section: "PROC-2.8", page: 27 },
                      { title: "Freshdesk Ticket Troubleshooting and Closure", titleAr: "معالجة تذاكر Freshdesk وإغلاقها", section: "PROC-3.1", page: 30 },
                      { title: "New Training Path Creation", titleAr: "إنشاء مسار تدريبي جديد", section: "PROC-3.2", page: 32 },
                      { title: "EDRAK Daily Routine Check and Backup", titleAr: "الفحص اليومي والنسخ الاحتياطي لنظام EDRAK", section: "PROC-4.1", page: 33 },
                      { title: "Monthly LMS Backup", titleAr: "النسخ الاحتياطي الشهري لنظام LMS", section: "PROC-4.2", page: 35 },
                    ].map(proc => (
                      <div key={proc.title} className={`flex items-center justify-between p-3 border border-[#CEE1DB] rounded-lg hover:bg-[#F3F8F6] ${isRtl ? "flex-row-reverse" : ""}`}>
                        <div className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                          <Icon name="check-circle" className="w-5 h-5 text-[#007D68] flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-[#174C42]">{isRtl ? proc.titleAr : proc.title}</div>
                            <div className="text-xs text-[#638078]">{proc.section} · {isRtl ? "صفحة" : "Page"} {proc.page}</div>
                          </div>
                        </div>
                        <button className="text-xs text-[#007D68] font-medium hover:underline flex-shrink-0">{t("view")}</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "relatedSections" && (
                <div className={isRtl ? "text-right" : ""}>
                  <h3 className="text-base font-bold text-[#174C42] mb-4">{t("relatedSections")}</h3>
                  <p className="text-sm text-[#638078] mb-4">{isRtl ? "الأقسام ذات الصلة من مستندات أخرى:" : "Related sections from other documents:"}</p>
                  <div className="p-8 text-center text-[#638078] bg-[#F3F8F6] rounded-xl">
                    <Icon name="folder" className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{isRtl ? "لا توجد أقسام ذات صلة بعد." : "No related sections available yet."}</p>
                  </div>
                </div>
              )}

              {activeTab === "versionHistory" && (
                <div className={isRtl ? "text-right" : ""}>
                  <h3 className="text-base font-bold text-[#174C42] mb-4">{t("versionHistory")}</h3>
                  <div className="space-y-3">
                    {[
                      { edition: 6, date: "Issued 20 NOV 2024 · Effective 21 NOV 2024", notes: "Active edition recorded in SEC-1.3, page 7." },
                      { edition: 5, date: "Issued 30 MAY 2024 · Effective 03 JUN 2024", notes: "Edition date record from SEC-1.3, page 7." },
                      { edition: 4, date: "Issued 27 NOV 2023 · Effective 01 DEC 2023", notes: "Edition date record from SEC-1.3, page 7." },
                      { edition: 3, date: "Issued 20 DEC 2022 · Effective 20 DEC 2022", notes: "Edition date record from SEC-1.3, page 7." },
                      { edition: 2, date: "Issued 04 OCT 2021 · Effective 04 OCT 2021", notes: "Edition date record from SEC-1.3, page 7." },
                      { edition: 1, date: "Issued 03 AUG 2021 · Effective 03 AUG 2021", notes: "Edition date record from SEC-1.3, page 7." },
                    ].map(v => (
                      <div key={v.edition} className={`flex items-start gap-3 p-3 border border-[#CEE1DB] rounded-lg ${isRtl ? "flex-row-reverse" : ""}`}>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${v.edition === policy.edition ? "bg-[#007D68] text-white" : "bg-[#F3F8F6] text-[#638078]"}`}>
                          v{v.edition}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-[#174C42]">{v.date}</div>
                          <div className="text-xs text-[#638078] mt-0.5">{v.notes}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "askAI" && (
                <AIAssistantPanel lang={lang} navigate={navigate} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIAssistantPanel({ lang, navigate }: { lang: Lang; navigate: (s: Screen) => void }) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const suggested = isRtl ? aiService.getSuggestedQuestionsAr() : aiService.getSuggestedQuestions();

  async function handleAsk(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setResponse(null);
    const res = await aiService.ask(q, lang);
    setResponse(res);
    setLoading(false);
  }

  return (
    <div className={isRtl ? "text-right" : ""}>
      <div className={`flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>{t("aiNotice")}</span>
      </div>

      <div className={`flex gap-2 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
        <input
          value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAsk(question); }}
          placeholder={t("typeQuestion")}
          className="flex-1 h-9 border border-[#CEE1DB] rounded-lg px-3 text-sm text-[#174C42] bg-white focus:outline-none focus:border-[#007D68] placeholder-[#638078]/70"
        />
        <button
          onClick={() => handleAsk(question)}
          disabled={loading || !question.trim()}
          className={`px-4 py-2 bg-[#007D68] text-white text-sm font-medium rounded-lg hover:bg-[#056655] disabled:opacity-50 transition-colors flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send size={14} />}
          {t("send")}
        </button>
      </div>

      {!response && !loading && (
        <div className={isRtl ? "text-right" : ""}>
          <p className="text-xs font-semibold text-[#638078] uppercase tracking-wider mb-2">{t("suggestedQuestions")}</p>
          <div className="space-y-1.5">
            {suggested.slice(0, 4).map(q => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                className={`w-full text-sm text-[#007D68] px-3 py-2 bg-[#EAF6F2] rounded-lg hover:bg-[#007D68] hover:text-white transition-colors ${isRtl ? "text-right" : "text-left"}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-[#638078]">
          <span className="w-5 h-5 border-2 border-[#CEE1DB] border-t-[#007D68] rounded-full animate-spin" />
          <span className="text-sm">{isRtl ? "جارٍ البحث..." : "Searching..."}</span>
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className={`p-4 bg-[#F3F8F6] border border-[#CEE1DB] rounded-xl ${isRtl ? "text-right" : ""}`}>
            <p className="text-xs font-semibold text-[#638078] uppercase tracking-wider mb-2">
              {isRtl ? "الإجابة" : "Answer"}
            </p>
            <p className="text-sm text-[#174C42] leading-relaxed">{isRtl ? response.answerAr : response.answer}</p>
          </div>

          {(isRtl ? response.stepsAr : response.steps).length > 0 && (
            <div className={isRtl ? "text-right" : ""}>
              <p className="text-xs font-semibold text-[#638078] uppercase tracking-wider mb-2">
                {isRtl ? "الخطوات" : "Steps"}
              </p>
              <div className="space-y-1.5">
                {(isRtl ? response.stepsAr : response.steps).map((step, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <span className="w-5 h-5 rounded-full bg-[#007D68] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-sm text-[#174C42]">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ApprovedResourceLinks response={response} lang={lang} />

          <div className={`p-3 bg-[#EAF6F2] border border-[#007D68]/20 rounded-xl flex items-center justify-between gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className={isRtl ? "text-right" : ""}>
              <p className="text-xs font-semibold text-[#007D68]">{t("sourceDocument")}</p>
              <p className="text-xs text-[#174C42] font-medium mt-0.5">{isRtl ? response.policyAr : response.policy}</p>
              <p className="text-xs text-[#638078]">{response.section} · {isRtl ? "صفحة" : "Page"} {response.page}</p>
              {response.recordIds.length > 0 && <p className="text-[11px] text-[#638078] mt-0.5">{response.recordIds.join(", ")}</p>}
            </div>
            {response.policyId ? (
              <button
                onClick={() => navigate("policy-details")}
                className="px-3 py-1.5 bg-[#007D68] text-white text-xs font-medium rounded-lg hover:bg-[#056655] transition-colors flex-shrink-0"
              >
                {t("openSource")}
              </button>
            ) : null}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsPage({ lang, navigate, notifications, markAllRead, markRead }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  notifications: Notification[]; markAllRead: () => void; markRead: (id: string) => void;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const unread = notifications.filter(n => !n.read).length;

  const TYPE_STYLES = {
    info: { bg: "bg-blue-50 border-blue-200", icon: "bg-blue-100 text-blue-600", iconName: "info" },
    warning: { bg: "bg-amber-50 border-amber-200", icon: "bg-amber-100 text-amber-600", iconName: "warning" },
    success: { bg: "bg-emerald-50 border-emerald-200", icon: "bg-emerald-100 text-emerald-600", iconName: "check-circle" },
  };

  return (
    <div className="p-6 max-w-3xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex items-center justify-between mb-6 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div className={isRtl ? "text-right" : ""}>
          <h1 className="text-xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("notifications")}</h1>
          <p className="text-sm text-[#638078] mt-1">{unread} {isRtl ? "إشعار غير مقروء" : "unread"}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#007D68] hover:underline font-medium">{t("markAllRead")}</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="bell" className="w-14 h-14 mx-auto mb-4 text-[#CEE1DB]" />
          <p className="text-[#638078]">{t("noNotifications")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const styles = TYPE_STYLES[notif.type];
            const title = isRtl ? notif.titleAr : notif.title;
            const message = isRtl ? notif.messageAr : notif.message;
            return (
              <div key={notif.id} className={`border rounded-xl p-4 transition-all ${styles.bg} ${!notif.read ? "opacity-100" : "opacity-70"}`}>
                <div className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
                    <Icon name={styles.iconName} className="w-4 h-4" />
                  </div>
                  <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : ""}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <span className="text-sm font-semibold text-[#174C42]">{title}</span>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-[#007D68] flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-[#638078]">{message}</p>
                    <div className={`flex items-center gap-3 mt-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs text-[#638078]">{notif.date}</span>
                      {notif.policyId && (
                        <button onClick={() => navigate("policy-details", { policyId: notif.policyId! })} className="text-xs text-[#007D68] font-medium hover:underline">
                          {t("openPolicy")}
                        </button>
                      )}
                      {!notif.read && (
                        <button onClick={() => markRead(notif.id)} className="text-xs text-[#638078] hover:text-[#174C42] ms-auto">
                          {t("markRead")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Recently Viewed ──────────────────────────────────────────────────────────

function RecentlyViewed({ lang, navigate, policies, recentlyViewedIds }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; recentlyViewedIds: string[];
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const recent = recentlyViewedIds.map(id => policies.find(p => p.id === id)).filter(Boolean) as Policy[];

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("recentlyViewed")}</h1>
        <p className="text-sm text-[#638078] mt-1">{recent.length} {isRtl ? "سياسة" : "policies"}</p>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="clock" className="w-14 h-14 mx-auto mb-4 text-[#CEE1DB]" />
          <h3 className="text-base font-semibold text-[#174C42] mb-2">{isRtl ? "لا توجد سياسات مشاهدة مؤخراً" : "No recently viewed policies"}</h3>
          <p className="text-sm text-[#638078] mb-6">{isRtl ? "ابدأ باستعراض السياسات." : "Start browsing policies."}</p>
          <button onClick={() => navigate("policy-library")} className="px-5 py-2 bg-[#007D68] text-white text-sm font-medium rounded-lg hover:bg-[#056655] transition-colors">
            {t("policyLibrary")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.map((policy, idx) => {
            const title = isRtl ? policy.titleAr : policy.title;
            return (
              <div key={policy.id} className={`flex items-center gap-4 p-4 bg-white border border-[#CEE1DB] rounded-xl hover:border-[#007D68]/30 transition-all ${isRtl ? "flex-row-reverse" : ""}`}>
                <span className="text-xs font-bold text-[#638078] w-5 text-center flex-shrink-0">{idx + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                  <Icon name="document" className="w-5 h-5 text-[#007D68]" />
                </div>
                <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : ""}`}>
                  <div className="text-sm font-semibold text-[#174C42] truncate">{title}</div>
                  <div className="text-xs text-[#638078]">{policy.department} · {policy.effectiveDate}</div>
                </div>
                <div className={`flex items-center gap-2 flex-shrink-0 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full hidden sm:block ${STATUS_COLORS[policy.status]}`}>{t(policy.status)}</span>
                  <button onClick={() => navigate("policy-details", { policyId: policy.id })} className="px-3 py-1.5 text-xs font-medium text-[#007D68] bg-[#EAF6F2] rounded-lg hover:bg-[#007D68] hover:text-white transition-colors">
                    {t("view")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Required Reading ─────────────────────────────────────────────────────────

function RequiredReading({ lang, navigate, policies, readConfirmations, confirmReading }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; readConfirmations: Record<string, string>; confirmReading: (id: string) => void;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const required = policies.filter(p => p.requiresReading);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("requiredReading")}</h1>
        <p className="text-sm text-[#638078] mt-1">
          {required.filter(p => readConfirmations[p.id]).length}/{required.length} {isRtl ? "مؤكد" : "confirmed"}
        </p>
      </div>

      {required.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="check-circle" className="w-14 h-14 mx-auto mb-4 text-[#CEE1DB]" />
          <p className="text-sm text-[#638078]">{isRtl ? "لا توجد قراءات إلزامية حالياً." : "No required readings at this time."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {required.map(policy => {
            const title = isRtl ? policy.titleAr : policy.title;
            const confirmed = !!readConfirmations[policy.id];
            return (
              <div key={policy.id} className={`bg-white border rounded-xl overflow-hidden ${confirmed ? "border-emerald-200" : "border-amber-200"}`}>
                <div className={`flex items-center gap-3 px-5 py-3 ${confirmed ? "bg-emerald-50" : "bg-amber-50"} ${isRtl ? "flex-row-reverse" : ""}`}>
                  <Icon name={confirmed ? "check-circle" : "warning"} className={`w-5 h-5 flex-shrink-0 ${confirmed ? "text-emerald-600" : "text-amber-600"}`} />
                  <span className={`text-sm font-semibold ${confirmed ? "text-emerald-700" : "text-amber-700"}`}>
                    {confirmed ? t("readingConfirmed") : isRtl ? "قراءة إلزامية مطلوبة" : "Reading Required"}
                  </span>
                  {confirmed && (
                    <span className="text-xs text-emerald-600 ms-auto">{t("confirmedOn")} {readConfirmations[policy.id]}</span>
                  )}
                </div>
                <div className="p-5">
                  <div className={`flex items-start gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <div className="w-12 h-12 rounded-xl bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                      <Icon name="document" className="w-6 h-6 text-[#007D68]" />
                    </div>
                    <div className={`flex-1 ${isRtl ? "text-right" : ""}`}>
                      <h3 className="text-base font-bold text-[#174C42] mb-1">{title}</h3>
                      <p className="text-sm text-[#638078] mb-1">{policy.department} · {policy.documentType}</p>
                      <p className="text-xs text-[#638078]">{t("edition")} {policy.edition} · {policy.effectiveDate} · {policy.pages} {isRtl ? "صفحة" : "pages"}</p>
                    </div>
                  </div>
                  <div className={`flex gap-2 mt-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <button onClick={() => navigate("policy-details", { policyId: policy.id })} className="px-4 py-2 text-sm font-medium text-[#007D68] bg-[#EAF6F2] rounded-lg hover:bg-[#007D68] hover:text-white transition-colors">
                      {t("viewDocument")}
                    </button>
                    {!confirmed && (
                      <button
                        onClick={() => confirmReading(policy.id)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-[#007D68] rounded-lg hover:bg-[#056655] transition-colors"
                      >
                        {t("confirmReading")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Saved Policies ───────────────────────────────────────────────────────────

function SavedPolicies({ lang, navigate, policies, savedIds, toggleSave }: {
  lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void;
  policies: Policy[]; savedIds: string[]; toggleSave: (id: string) => void;
}) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const saved = policies.filter(p => savedIds.includes(p.id));

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("savedPolicies")}</h1>
        <p className="text-sm text-[#638078] mt-1">{saved.length} {isRtl ? "سياسة محفوظة" : "saved policies"}</p>
      </div>

      {saved.length === 0 ? (
        <div className="text-center py-20">
          <Icon name="bookmark" className="w-14 h-14 mx-auto mb-4 text-[#CEE1DB]" />
          <h3 className="text-base font-semibold text-[#174C42] mb-2">{isRtl ? "لا توجد سياسات محفوظة" : "No saved policies"}</h3>
          <p className="text-sm text-[#638078] mb-6">{isRtl ? "احفظ السياسات للوصول إليها بسرعة." : "Save policies to access them quickly."}</p>
          <button onClick={() => navigate("policy-library")} className="px-5 py-2 bg-[#007D68] text-white text-sm font-medium rounded-lg hover:bg-[#056655] transition-colors">
            {t("policyLibrary")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {saved.map(policy => {
            const title = isRtl ? policy.titleAr : policy.title;
            return (
              <div key={policy.id} className={`flex items-center gap-4 p-4 bg-white border border-[#CEE1DB] rounded-xl hover:border-[#007D68]/30 transition-all ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="w-10 h-10 rounded-lg bg-[#EAF6F2] flex items-center justify-center flex-shrink-0">
                  <Icon name="document" className="w-5 h-5 text-[#007D68]" />
                </div>
                <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : ""}`}>
                  <div className="text-sm font-semibold text-[#174C42] truncate">{title}</div>
                  <div className="text-xs text-[#638078]">{policy.department} · {t("edition")} {policy.edition} · {policy.effectiveDate}</div>
                </div>
                <div className={`flex items-center gap-2 flex-shrink-0 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <button onClick={() => navigate("policy-details", { policyId: policy.id })} className="px-3 py-1.5 text-xs font-medium text-[#007D68] bg-[#EAF6F2] rounded-lg hover:bg-[#007D68] hover:text-white transition-colors">
                    {t("view")}
                  </button>
                  <button onClick={() => toggleSave(policy.id)} className="p-1.5 text-[#638078] hover:text-red-500 transition-colors" title={isRtl ? "إزالة" : "Remove"}>
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────


// ─── Voice Assistant ──────────────────────────────────────────────────────────

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";
type VoiceInputMode = "auto" | "ar" | "en";

function detectLang(text: string): Lang {
  const arabic = (text.match(/[\u0600-\u06ff]/g) ?? []).length;
  const english = (text.match(/[a-z]/gi) ?? []).length;
  return arabic >= english ? "ar" : "en";
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[REC-\d+\]/gi, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/mailto:\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeech(text: string, maxLength = 230): string[] {
  const sentences = text.split(/(?<=[.!؟؛])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else current = `${current} ${sentence}`.trim();
  }
  if (current) chunks.push(current);
  return chunks;
}

function VoiceAssistantScreen({ lang, navigate }: { lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void }) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const ui = (en: string, ar: string) => isRtl ? ar : en;
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [detectedLang, setDetectedLang] = useState<Lang>(lang);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [inputMode, setInputMode] = useState<VoiceInputMode>("auto");
  const [speechRate, setSpeechRate] = useState(0.9);
  const [supported, setSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const candidateRef = useRef<string[]>([]);
  const transcriptRef = useRef("");
  const speechQueueRef = useRef<string[]>([]);
  const speechCancelledRef = useRef(false);
  const recognitionFailedRef = useRef(false);
  const suggested = isRtl ? aiService.getSuggestedQuestionsAr() : aiService.getSuggestedQuestions();

  useEffect(() => {
    const SR = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) setSupported(false);
    const loadVoices = () => setAvailableVoices(window.speechSynthesis?.getVoices?.() ?? []);
    loadVoices();
    window.speechSynthesis?.addEventListener?.("voiceschanged", loadVoices);
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  function stopSpeaking() {
    speechCancelledRef.current = true;
    speechQueueRef.current = [];
    window.speechSynthesis?.cancel();
    setVoiceState("idle");
  }

  function speakNext(responseLang: Lang) {
    if (speechCancelledRef.current || !speechQueueRef.current.length) {
      setVoiceState("idle");
      return;
    }
    const text = speechQueueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = responseLang === "ar" ? "ar-SA" : "en-US";
    utterance.rate = speechRate;
    utterance.pitch = 1;
    const matching = availableVoices
      .filter(voice => voice.lang.toLowerCase().startsWith(responseLang === "ar" ? "ar" : "en"))
      .sort((a, b) => Number(b.lang.toLowerCase().includes(responseLang === "ar" ? "sa" : "us")) - Number(a.lang.toLowerCase().includes(responseLang === "ar" ? "sa" : "us")))[0];
    if (matching) utterance.voice = matching;
    utterance.onend = () => speakNext(responseLang);
    utterance.onerror = () => setVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  }

  function speakResponse(result: AIResponse, responseLang: Lang) {
    stopSpeaking();
    speechCancelledRef.current = false;
    const answer = responseLang === "ar" ? result.answerAr : result.answer;
    const steps = (responseLang === "ar" ? result.stepsAr : result.steps)
      .slice(0, 6)
      .map((step, index) => `${responseLang === "ar" ? `الخطوة ${index + 1}` : `Step ${index + 1}`}: ${cleanTextForSpeech(step)}`)
      .join(". ");
    speechQueueRef.current = splitSpeech(cleanTextForSpeech(`${answer}. ${steps}`));
    if (!speechQueueRef.current.length) return;
    setVoiceState("speaking");
    speakNext(responseLang);
  }

  async function processQuestion(question: string, alternatives: string[] = []) {
    const candidates = [...new Set([question, ...alternatives].map(value => value.trim()).filter(Boolean))].slice(0, 4);
    if (!candidates.length) { setVoiceState("idle"); return; }

    const command = candidates[0].toLowerCase().trim();
    if (["stop", "اسكت", "وقف", "ايقاف", "إيقاف"].includes(command)) { stopSpeaking(); return; }
    if (["repeat", "كرر", "اعد", "أعد"].includes(command) && response) { speakResponse(response, detectedLang); return; }
    if (["new question", "سوال جديد", "سؤال جديد"].includes(command)) { handleReset(); return; }

    setVoiceState("processing");
    setErrorMessage("");
    const evaluated = await Promise.all(candidates.map(async candidate => {
      const candidateLang: Lang = inputMode === "auto" ? detectLang(candidate) : inputMode;
      const answer = await aiService.ask(candidate, candidateLang, response ? { previousAnswer: response } : undefined);
      return { candidate, candidateLang, answer };
    }));
    const best = evaluated.sort((a, b) => {
      if (a.answer.isFallback !== b.answer.isFallback) return Number(a.answer.isFallback) - Number(b.answer.isFallback);
      return b.answer.confidence - a.answer.confidence;
    })[0];
    setTranscript(best.candidate);
    transcriptRef.current = best.candidate;
    setDetectedLang(best.candidateLang);
    setResponse(best.answer);
    if (autoSpeak && !isMuted) speakResponse(best.answer, best.candidateLang);
    else setVoiceState("idle");
  }

  function startListening() {
    if (voiceState === "speaking") stopSpeaking();
    const SR = (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR() as SpeechRecognition;
    recognition.lang = inputMode === "ar" ? "ar-SA" : inputMode === "en" ? "en-US" : (lang === "ar" ? "ar-SA" : "en-US");
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      recognitionFailedRef.current = false;
      candidateRef.current = [];
      transcriptRef.current = "";
      setPermissionDenied(false);
      setErrorMessage("");
      setVoiceState("listening");
      setTranscript("");
      setResponse(null);
    };
    recognition.onerror = event => {
      recognitionFailedRef.current = true;
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setPermissionDenied(true);
        setErrorMessage(t("voicePermissionDenied"));
      } else if (event.error === "no-speech") {
        setErrorMessage(ui("No speech was detected. Move closer to the microphone and try again.", "لم يتم اكتشاف صوت. اقترب من الميكروفون وحاول مرة أخرى."));
      } else if (event.error === "network") {
        setErrorMessage(ui("The browser voice service could not connect. You can type the question below.", "تعذر اتصال خدمة الصوت في المتصفح. يمكنك كتابة السؤال أدناه."));
      } else setErrorMessage(t("voiceError"));
      setVoiceState("error");
    };
    recognition.onresult = event => {
      let interim = "";
      const alternatives: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const primary = result[0]?.transcript ?? "";
        if (result.isFinal) {
          for (let j = 0; j < Math.min(result.length, 5); j++) if (result[j]?.transcript) alternatives.push(result[j].transcript);
        } else interim += primary;
      }
      const displayed = alternatives[0] || interim;
      if (displayed) {
        transcriptRef.current = displayed;
        setTranscript(displayed);
        setDetectedLang(inputMode === "auto" ? detectLang(displayed) : inputMode);
      }
      if (alternatives.length) candidateRef.current = alternatives;
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (recognitionFailedRef.current) return;
      if (!transcriptRef.current.trim()) {
        setVoiceState("idle");
        return;
      }
      void processQuestion(transcriptRef.current, candidateRef.current);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setErrorMessage(t("voiceError"));
      setVoiceState("error");
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function handleMicClick() {
    if (voiceState === "listening") { stopListening(); return; }
    if (voiceState === "speaking") { stopSpeaking(); return; }
    if (voiceState === "processing") return;
    startListening();
  }

  function handleSuggestedQuestion(question: string) {
    setTranscript(question);
    void processQuestion(question);
  }

  function handleReset() {
    recognitionRef.current?.abort();
    stopSpeaking();
    transcriptRef.current = "";
    candidateRef.current = [];
    setTranscript("");
    setResponse(null);
    setErrorMessage("");
    setVoiceState("idle");
  }

  const stateLabel: Record<VoiceState, string> = {
    idle: t("voiceIdle"), listening: t("voiceListening"), processing: t("voiceProcessing"),
    speaking: t("voiceSpeaking"), error: permissionDenied ? t("voicePermissionDenied") : (errorMessage || t("voiceError")),
  };

  if (!supported) {
    return <div className="flex-1 flex items-center justify-center p-8 bg-[#063F36]" dir={isRtl ? "rtl" : "ltr"}><div className="text-center max-w-md"><MicOff size={48} className="text-white/30 mx-auto mb-4" /><p className="text-white/70 text-sm">{t("voiceNotSupported")}</p><button onClick={() => navigate("ai-assistant")} className="mt-6 px-5 py-2 bg-[#007D68] text-white text-sm font-medium rounded-lg">{t("aiTitle")}</button></div></div>;
  }

  return (
    <div className="flex flex-col min-h-full bg-[#063F36]" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div className={isRtl ? "text-right" : ""}><h1 className="text-lg font-bold text-white">{t("voiceTitle")}</h1><p className="text-sm text-[#B8E2D5] mt-0.5">{t("voiceSubtitle")}</p></div>
        <div className={`flex flex-wrap items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
          <select value={inputMode} onChange={e => setInputMode(e.target.value as VoiceInputMode)} className="h-9 rounded-lg bg-white/10 border border-white/15 text-white text-xs px-2 outline-none"><option className="text-black" value="auto">{ui("Auto language", "لغة تلقائية")}</option><option className="text-black" value="ar">العربية</option><option className="text-black" value="en">English</option></select>
          <label className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 px-2.5 h-9 rounded-lg"><input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} style={{ accentColor: "#82CDB8" }} />{ui("Auto speak", "نطق تلقائي")}</label>
          <button onClick={() => setIsMuted(value => !value)} className={`p-2 rounded-lg ${isMuted ? "bg-white/5 text-white/40" : "bg-white/10 text-[#82CDB8]"}`}>{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button onClick={() => navigate("ai-assistant")} className="px-3 h-9 bg-white/10 text-white/80 text-xs font-medium rounded-lg hover:bg-white/20">{ui("Text mode", "الوضع النصي")}</button>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1fr_1.2fr] gap-6 p-6 max-w-6xl w-full mx-auto">
        <div className="flex flex-col items-center justify-center gap-5 bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="relative flex items-center justify-center">
            {(voiceState === "listening" || voiceState === "speaking") && <><div className="absolute w-44 h-44 rounded-full border-2 border-[#82CDB8]/20 animate-ping" /><div className="absolute w-32 h-32 rounded-full border border-[#82CDB8]/30 animate-ping" /></>}
            <button onClick={handleMicClick} disabled={voiceState === "processing"} className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 disabled:opacity-60 ${voiceState === "listening" ? "bg-red-500" : voiceState === "processing" ? "bg-amber-500" : "bg-[#007D68]"}`}>
              {voiceState === "speaking" ? <Volume2 size={38} className="text-white" /> : voiceState === "processing" ? <Bot size={38} className="text-white animate-pulse" /> : <Mic size={38} className="text-white" />}
            </button>
          </div>
          <p className={`text-center text-sm font-semibold ${voiceState === "error" ? "text-red-200" : "text-white"}`}>{stateLabel[voiceState]}</p>
          <p className="text-xs text-white/45 text-center">{ui("Speak naturally. Common Arabic expressions and likely recognition alternatives are tested against the approved knowledge base.", "تحدث بطبيعتك؛ تُختبر العبارات العربية العامية وبدائل التعرف المحتملة مقابل قاعدة المعرفة المعتمدة.")}</p>
          <div className="w-full">
            <label className="text-xs font-semibold text-[#82CDB8]">{ui("Speech speed", "سرعة النطق")}: {speechRate.toFixed(2)}×</label>
            <input type="range" min="0.65" max="1.15" step="0.05" value={speechRate} onChange={e => setSpeechRate(Number(e.target.value))} className="w-full mt-2" />
          </div>
          {voiceState === "speaking" && <button onClick={stopSpeaking} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-100 text-xs"><VolumeX size={14} />{t("voiceStop")}</button>}
        </div>

        <div className="space-y-4 min-w-0">
          <div className="bg-white/8 border border-white/15 rounded-2xl p-4">
            <p className="text-xs font-semibold text-[#82CDB8] mb-2">{t("voiceTranscript")}</p>
            <div className="flex gap-2">
              <input dir="auto" value={transcript} onChange={e => { setTranscript(e.target.value); transcriptRef.current = e.target.value; }} onKeyDown={e => { if (e.key === "Enter") void processQuestion(transcript); }} placeholder={ui("Speak or type your IT question…", "تحدث أو اكتب سؤالك التقني…")} className="flex-1 h-11 rounded-xl bg-white/10 border border-white/15 px-3 text-sm text-white placeholder-white/35 outline-none focus:border-[#82CDB8]" />
              <button onClick={() => void processQuestion(transcript)} disabled={!transcript.trim() || voiceState === "processing"} className="px-4 rounded-xl bg-[#007D68] text-white disabled:opacity-40"><Send size={16} /></button>
            </div>
            {transcript && <p className="text-xs text-white/40 mt-2">{t("voiceDetected")} {detectedLang === "ar" ? "العربية" : "English"}</p>}
          </div>

          {response ? <div className="bg-white/8 border border-white/15 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3"><p className="text-xs font-semibold text-[#82CDB8]">{t("voiceResponse")}</p><div className="flex gap-2"><button onClick={() => speakResponse(response, detectedLang)} className="text-xs text-[#82CDB8] hover:text-white flex items-center gap-1"><RotateCcw size={12} />{t("voiceRepeat")}</button><button onClick={handleReset} className="text-xs text-white/50 hover:text-white">{t("voiceNewQuestion")}</button></div></div>
            <p className="text-white text-sm leading-7">{detectedLang === "ar" ? response.answerAr : response.answer}</p>
            {(detectedLang === "ar" ? response.stepsAr : response.steps).length > 0 && <div className="mt-4 space-y-2">{(detectedLang === "ar" ? response.stepsAr : response.steps).map((step, index) => <div key={`${step}-${index}`} className={`flex gap-2.5 ${isRtl ? "flex-row-reverse" : ""}`}><span className="w-5 h-5 rounded-full bg-[#007D68] text-white text-xs flex items-center justify-center shrink-0">{index + 1}</span><span className="text-white/80 text-sm leading-6">{step}</span></div>)}</div>}
            <ApprovedResourceLinks response={response} lang={detectedLang} dark />
            <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/45"><p>{detectedLang === "ar" ? response.policyAr : response.policy} · {response.section} · {detectedLang === "ar" ? "ص" : "p."}{response.page}</p>{response.recordIds.length > 0 && <p className="mt-1">{response.recordIds.join(", ")}</p>}</div>
          </div> : <div className="bg-white/5 border border-white/10 rounded-2xl p-5"><p className="text-xs font-semibold text-[#82CDB8] mb-3">{t("voiceTryAsk")}</p><div className="grid sm:grid-cols-2 gap-2">{suggested.slice(0, 6).map(question => <button key={question} onClick={() => handleSuggestedQuestion(question)} className={`text-sm text-white/75 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 ${isRtl ? "text-right" : "text-left"}`}>{question}</button>)}</div></div>}
        </div>
      </div>
    </div>
  );
}


// ─── AI Chat Components ───────────────────────────────────────────────────────

interface AIChatMsg {
  id: string;
  type: "user" | "ai";
  text: string;
  lang?: Lang;
  response?: AIResponse;
}

interface SavedAIConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AIChatMsg[];
}

const MAX_SAVED_CONVERSATIONS = 100;
const MAX_MESSAGES_PER_CONVERSATION = 250;
const CHAT_SESSION_GAP_MS = 8 * 60 * 60 * 1000;

function safeConversationKey(userKey: string): string {
  return userKey.toLowerCase().replace(/[^a-z0-9@._-]+/g, "-").slice(0, 120) || "guest";
}

function conversationStorageKey(userKey: string): string {
  return `saudia-one-ai-conversations:${safeConversationKey(userKey)}`;
}

function activeConversationStorageKey(userKey: string): string {
  return `saudia-one-ai-active:${safeConversationKey(userKey)}`;
}

function readSavedConversations(userKey: string): SavedAIConversation[] {
  try {
    const raw = window.localStorage.getItem(conversationStorageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAIConversation[];
    return Array.isArray(parsed)
      ? parsed.filter(item => item && typeof item.id === "string" && Array.isArray(item.messages))
      : [];
  } catch {
    return [];
  }
}

function writeSavedConversations(userKey: string, conversations: SavedAIConversation[]): void {
  try {
    const compact = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_SAVED_CONVERSATIONS)
      .map(item => ({ ...item, messages: item.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) }));
    window.localStorage.setItem(conversationStorageKey(userKey), JSON.stringify(compact));
  } catch {
    // The app remains usable if browser storage is unavailable or full.
  }
}

function makeConversationTitle(messages: AIChatMsg[], lang: Lang): string {
  const firstUser = messages.find(message => message.type === "user")?.text.trim();
  if (!firstUser) return lang === "ar" ? "محادثة جديدة" : "New conversation";
  return firstUser.length > 64 ? `${firstUser.slice(0, 61)}…` : firstUser;
}

function AIAssistant({ lang, navigate, userKey }: { lang: Lang; navigate: (s: Screen, p?: Record<string, string>) => void; userKey: string }) {
  const isRtl = lang === "ar";
  const t = makeT(lang);
  const initialConversation = useRef<{ id: string; messages: AIChatMsg[] } | null>(null);
  if (!initialConversation.current) {
    const saved = readSavedConversations(userKey).sort((a, b) => b.updatedAt - a.updatedAt);
    const activeId = window.localStorage.getItem(activeConversationStorageKey(userKey));
    const active = saved.find(item => item.id === activeId);
    const recent = active ?? saved[0];
    const canResume = recent && Date.now() - recent.updatedAt <= CHAT_SESSION_GAP_MS;
    const id = canResume ? recent.id : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    initialConversation.current = { id, messages: canResume ? recent.messages.slice(-MAX_MESSAGES_PER_CONVERSATION) : [] };
    try { window.localStorage.setItem(activeConversationStorageKey(userKey), id); } catch { /* ignore */ }
  }
  const [conversationId, setConversationId] = useState(initialConversation.current.id);
  const [messages, setMessages] = useState<AIChatMsg[]>(initialConversation.current.messages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const suggested = isRtl ? aiService.getSuggestedQuestionsAr() : aiService.getSuggestedQuestions();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const existing = readSavedConversations(userKey);
    const previous = existing.find(item => item.id === conversationId);
    const now = Date.now();
    const nextConversation: SavedAIConversation = {
      id: conversationId,
      title: makeConversationTitle(messages, lang),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
    };
    writeSavedConversations(userKey, [nextConversation, ...existing.filter(item => item.id !== conversationId)]);
    try { window.localStorage.setItem(activeConversationStorageKey(userKey), conversationId); } catch { /* ignore */ }
  }, [conversationId, lang, messages, userKey]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== "n") return;
      event.preventDefault();
      const nextId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setConversationId(nextId);
      setMessages([]);
      setQuestion("");
      try { window.localStorage.setItem(activeConversationStorageKey(userKey), nextId); } catch { /* ignore */ }
    }
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [userKey]);

  async function handleAsk(q: string) {
    if (!q.trim() || loading) return;
    const questionLang = detectLang(q);
    const previousUser = [...messages].reverse().find(message => message.type === "user");
    const previousAI = [...messages].reverse().find(message => message.type === "ai" && message.response);
    const userMsg: AIChatMsg = { id: Date.now().toString(), type: "user", text: q, lang: questionLang };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    const res = await aiService.ask(q, questionLang, {
      previousUserQuery: previousUser?.text,
      previousAnswer: previousAI?.response ?? null,
    });
    const aiMsg: AIChatMsg = { id: (Date.now() + 1).toString(), type: "ai", text: questionLang === "ar" ? res.answerAr : res.answer, lang: questionLang, response: res };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      <div className="p-6 pb-0">
        <div className={`flex items-start justify-between mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
          <div className={isRtl ? "text-right" : ""}>
            <h1 className="text-xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{t("aiTitle")}</h1>
            <p className="text-sm text-[#638078] mt-1">{t("aiSubtitle")}</p>
          </div>
          <div className={`flex items-center gap-2 flex-shrink-0 ${isRtl ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => navigate("voice-assistant")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#063F36] text-white text-xs font-semibold rounded-full hover:bg-[#0A5649] transition-colors"
            >
              <Mic size={12} />
              {isRtl ? "الصوت" : "Voice"}
            </button>
            <span className="text-xs font-semibold px-3 py-1.5 bg-[#EAF6F2] text-[#007D68] rounded-full">{t("demoMode")}</span>
          </div>
        </div>
        <div className={`flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mt-4 mb-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          {t("aiNotice")}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className={isRtl ? "text-right" : ""}>
            <p className="text-xs font-semibold text-[#638078] uppercase tracking-wider mb-3">{t("suggestedQuestions")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggested.map(q => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  className={`text-sm text-[#007D68] px-4 py-3 bg-[#EAF6F2] border border-[#007D68]/20 rounded-xl hover:bg-[#007D68] hover:text-white transition-colors ${isRtl ? "text-right" : "text-left"}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => {
          const messageLang = msg.lang ?? lang;
          const messageRtl = messageLang === "ar";
          return (
          <div key={msg.id} className={`flex ${msg.type === "user" ? (messageRtl ? "justify-start" : "justify-end") : (messageRtl ? "justify-end" : "justify-start")}`}>
            {msg.type === "user" ? (
              <div dir={messageRtl ? "rtl" : "ltr"} className={`max-w-md px-4 py-2.5 bg-[#007D68] text-white text-sm rounded-2xl ${messageRtl ? "rounded-ss-sm" : "rounded-se-sm"}`}>
                {msg.text}
              </div>
            ) : (
              <div className="max-w-2xl w-full space-y-3">
                <div className={`flex items-start gap-2 ${messageRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-[#007D68] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className={`flex-1 ${messageRtl ? "text-right" : ""}`}>
                    <div className={`bg-white border border-[#CEE1DB] rounded-2xl p-4 ${messageRtl ? "rounded-se-sm" : "rounded-ss-sm"}`}>
                      <p dir={messageRtl ? "rtl" : "ltr"} className="text-sm text-[#174C42] leading-relaxed mb-3">{msg.text}</p>
                      {msg.response && (messageLang === "ar" ? msg.response.stepsAr : msg.response.steps).length > 0 && (
                        <div className="space-y-1.5 border-t border-[#EAF6F2] pt-3">
                          {(messageLang === "ar" ? msg.response.stepsAr : msg.response.steps).map((step, i) => (
                            <div key={i} className={`flex items-start gap-2 ${messageRtl ? "flex-row-reverse" : ""}`}>
                              <span className="w-4 h-4 rounded-full bg-[#EAF6F2] text-[#007D68] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                              <span dir={messageRtl ? "rtl" : "ltr"} className="text-xs text-[#638078]">{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.response && <ApprovedResourceLinks response={msg.response} lang={messageLang} />}
                    </div>
                    {msg.response && (
                      <div className={`flex items-center gap-2 mt-2 text-xs text-[#638078] ${messageRtl ? "flex-row-reverse" : ""}`}>
                        <FileText size={12} />
                        <span>{messageLang === "ar" ? msg.response.policyAr : msg.response.policy} · {msg.response.section} · {messageLang === "ar" ? "ص" : "p."}{msg.response.page}{msg.response.recordIds.length > 0 ? ` · ${msg.response.recordIds.join(", ")}` : ""}</span>
                        {msg.response.policyId && (
                          <button
                            onClick={() => navigate("policy-details", { policyId: msg.response!.policyId! })}
                            className="text-[#007D68] font-medium hover:underline ms-auto"
                          >
                            {t("openSource")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}

        {loading && (
          <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className="w-7 h-7 rounded-full bg-[#007D68] flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-[#CEE1DB] rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#007D68] animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#007D68] animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#007D68] animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#CEE1DB] bg-white">
        <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAsk(question); }}
            placeholder={t("typeQuestion")}
            className="flex-1 h-10 border border-[#CEE1DB] rounded-xl px-4 text-sm text-[#174C42] bg-[#F3F8F6] focus:outline-none focus:border-[#007D68] placeholder-[#638078]/70 transition-colors"
          />
          <button
            onClick={() => handleAsk(question)}
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-[#007D68] text-white rounded-xl font-medium disabled:opacity-50 hover:bg-[#056655] transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Version Comparison ───────────────────────────────────────────────────────

// function VersionComparison({ navigate, pdfUrl }: {
//   navigate: (s: Screen) => void; pdfUrl?: string | null;
// }) {
//   return (
//     <div className="p-6 space-y-5 max-w-5xl mx-auto">
//       <button onClick={() => navigate("policy-details")} className="flex items-center gap-2 text-sm text-[#638078] hover:text-[#174C42] transition-colors cursor-pointer">
//         <ArrowLeft size={16} /> Back to Policy Details
//       </button>
//       <div>
//         <h2 className="text-2xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>Edition Information</h2>
//         <p className="text-[#638078] text-sm">Information Technology Office Procedure Manual</p>
//       </div>

//       <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
//         <AlertTriangle size={20} className="text-amber-700 shrink-0 mt-0.5" />
//         <div>
//           <h3 className="font-semibold text-amber-900">A previous edition was not supplied</h3>
//           <p className="text-sm text-amber-800 mt-1">The original project contained two PDF files with identical content. The false Edition 5 comparison has been removed. Only the verified active Edition 6 is shown.</p>
//         </div>
//       </div>

//       <div className="bg-white border border-[#CEE1DB] rounded-xl overflow-hidden">
//         <div className="px-5 py-4 border-b border-[#CEE1DB] bg-[#EAF6F2] flex items-center justify-between gap-4">
//           <div>
//             <p className="font-bold text-[#174C42]">6th Edition</p>
//             <p className="text-xs text-[#638078] mt-1">Effective 21 NOV 2024 · 43 pages · Active</p>
//           </div>
//           {pdfUrl && (
//             <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-[#007D68] text-white text-xs font-semibold rounded-lg hover:bg-[#056655]">
//               <Download size={14} /> Open PDF
//             </a>
//           )}
//         </div>
//         <div className="p-5 grid sm:grid-cols-2 gap-4 text-sm">
//           <div className="rounded-xl bg-[#F3F8F6] p-4">
//             <p className="text-xs font-semibold text-[#638078] uppercase tracking-wide">Knowledge base</p>
//             <p className="text-2xl font-bold text-[#174C42] mt-2">{IT_KNOWLEDGE_STATS.records}</p>
//             <p className="text-xs text-[#638078]">approved records in {IT_KNOWLEDGE_STATS.groups} retrieval groups</p>
//           </div>
//           <div className="rounded-xl bg-[#F3F8F6] p-4">
//             <p className="text-xs font-semibold text-[#638078] uppercase tracking-wide">Assistant scope</p>
//             <p className="font-semibold text-[#174C42] mt-2">IT OPM only</p>
//             <p className="text-xs text-[#638078] mt-1">Questions without approved evidence return a refusal instead of a generated guess.</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// ─── Version Comparison ───────────────────────────────────────────────────────

function VersionComparison({ navigate, pdfUrl, pdfAltUrl }: {
  navigate: (s: Screen) => void; pdfUrl?: string | null; pdfAltUrl?: string | null;
}) {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <button onClick={() => navigate("policy-details")} className="flex items-center gap-2 text-sm text-[#638078] hover:text-[#174C42] transition-colors cursor-pointer">
        <ArrowLeft size={16} /> Back to Policy Details
      </button>
      <div>
        <h2 className="text-2xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>Version Comparison</h2>
        <p className="text-[#638078] text-sm">IT Office Procedure Manual · Edition 5 vs Edition 6</p>
      </div>

      {/* What Changed */}
      <div className="p-4 bg-[#F3F8F6] border border-[#CEE1DB] rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-[#007D68]" />
          <h3 className="font-semibold text-[#174C42]">Key Changes in Edition 6</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { type: "added", text: "Updated support ticket workflow with new SLA tiers and escalation paths." },
            { type: "added", text: "Added TMS path creation guide in Chapter 2." },
            { type: "modified", text: "EDRAK daily routine checks expanded with additional monitoring tasks." },
            { type: "modified", text: "Business continuity section revised with new activation criteria." },
          ].map((item, i) => (
            <div key={i} className={`flex gap-3 p-3 rounded-lg text-sm ${item.type === "added" ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
              <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${item.type === "added" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className={item.type === "added" ? "text-emerald-900" : "text-amber-900"}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { version: "Edition 5", date: "Mar 2023", label: "Previous", url: pdfAltUrl, fileName: "IT_OPM__Ed._6-1.pdf" },
          { version: "Edition 6", date: "21 Nov 2024", label: "Current", url: pdfUrl, fileName: "IT_OPM__Ed._6.pdf" },
        ].map((ver, vi) => (
          <div key={ver.version} className="bg-white border border-[#CEE1DB] rounded-xl overflow-hidden">
            <div className={`px-4 py-3 border-b border-[#CEE1DB] flex items-center justify-between ${vi === 1 ? "bg-[#EAF6F2]" : "bg-[#F3F8F6]"}`}>
              <div>
                <span className="font-bold text-[#174C42]">{ver.version}</span>
                <span className="text-[#638078] text-xs ml-2">{ver.label} · {ver.date}</span>
                {ver.url && (
                  <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-semibold">Supabase</span>
                )}
              </div>
              {ver.url ? (
                <a href={ver.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-[#638078] hover:text-[#174C42] hover:bg-[#F3F8F6] cursor-pointer">
                  <Download size={14} />
                </a>
              ) : (
                <button className="p-1.5 rounded text-[#638078] hover:text-[#174C42] hover:bg-[#F3F8F6] cursor-pointer">
                  <Download size={14} />
                </button>
              )}
            </div>
            <div className="p-4 text-xs leading-relaxed space-y-3 font-mono overflow-auto max-h-80">
              <p className="font-bold not-italic font-sans text-[#174C42]">Section 3.1 — Support Ticket Handling</p>
              {vi === 0 ? (
                <>
                  <p className="text-[#638078]">3.1.1 Support tickets shall be categorised as <span className="bg-red-100 text-red-800 px-0.5 rounded">Low, Medium, or High</span> priority.</p>
                  <p className="text-[#638078]">3.1.2 High priority tickets must be acknowledged within <span className="bg-red-100 text-red-800 px-0.5 rounded">4 hours</span>.</p>
                  <p className="text-[#638078]">3.1.3 Resolution time targets: Low 5 days, Medium 2 days, High <span className="bg-amber-100 text-amber-800 px-0.5 rounded">1 day</span>.</p>
                </>
              ) : (
                <>
                  <p className="text-[#638078]">3.1.1 Support tickets shall be categorised as <span className="bg-emerald-100 text-emerald-800 px-0.5 rounded">Critical, High, Medium, or Low</span> priority.</p>
                  <p className="text-[#638078]">3.1.2 High and Critical priority tickets must be acknowledged within <span className="bg-amber-100 text-amber-800 px-0.5 rounded">2 hours</span>.</p>
                  <p className="text-[#638078]">3.1.3 Resolution time targets: Low 5 days, Medium 2 days, High 1 day, <span className="bg-emerald-100 text-emerald-800 px-0.5 rounded">Critical 4 hours</span>.</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ navigate, policies, setPolicies, submissions, setSubmissions: _setSubmissions, onSubmissionAction }: {
  navigate: (s: Screen) => void;
  policies: Policy[];
  setPolicies: React.Dispatch<React.SetStateAction<Policy[]>>;
  submissions: PolicySubmission[];
  setSubmissions: React.Dispatch<React.SetStateAction<PolicySubmission[]>>;
  onSubmissionAction: (id: string, newStatus: PolicySubmission["status"], note: string | undefined, publishStatus: Policy["status"]) => void;
}) {
  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const [adminTab, setAdminTab] = useState<"overview" | "manage" | "upload" | "submissions" | "users" | "analytics">("overview");
  const [subFilter, setSubFilter] = useState<"all" | PolicySubmission["status"]>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [approveStatus, setApproveStatus] = useState<Policy["status"]>("approved");
  const [approveNote, setApproveNote] = useState("");

  // ── Manage tab state ──
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [editForm, setEditForm] = useState<Partial<Policy>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Upload tab state ──
  const blankForm = { title: "", titleAr: "", description: "", descriptionAr: "", department: "Information Technology", category: "IT", documentType: "Office Procedure Manual", edition: "1", effectiveDate: "", requiresReading: false, status: "draft" as Policy["status"] };
  const [uploadForm, setUploadForm] = useState(blankForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function openEdit(p: Policy) {
    setEditingPolicy(p);
    setEditForm({ title: p.title, titleAr: p.titleAr, description: p.description, department: p.department, documentType: p.documentType, edition: p.edition, effectiveDate: p.effectiveDate, status: p.status, requiresReading: p.requiresReading });
  }

  function saveEdit() {
    if (!editingPolicy) return;
    const nextPolicies = policies.map(p => p.id === editingPolicy.id ? { ...p, ...editForm, lastUpdated: new Date().toISOString().split("T")[0] } : p);
    setPolicies(nextPolicies);
    void savePoliciesToStore(nextPolicies);
    setEditingPolicy(null);
  }

  function changeStatus(id: string, status: Policy["status"]) {
    const nextPolicies = policies.map(p => p.id === id ? { ...p, status, lastUpdated: new Date().toISOString().split("T")[0] } : p);
    setPolicies(nextPolicies);
    void savePoliciesToStore(nextPolicies);
  }

  function confirmDelete() {
    if (deleteId) {
      const nextPolicies = policies.filter(p => p.id !== deleteId);
      setPolicies(nextPolicies);
      void savePoliciesToStore(nextPolicies);
    }
    setDeleteId(null);
  }

  function selectUploadFile(file: File | undefined): void {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadFile(null);
      setUploadErrors(prev => ({ ...prev, file: "Only PDF files are accepted" }));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadFile(null);
      setUploadErrors(prev => ({ ...prev, file: "The PDF must be 50 MB or smaller" }));
      return;
    }
    setUploadErrors(prev => { const next = { ...prev }; delete next.file; return next; });
    setUploadFile(file);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!uploadForm.title.trim()) errs.title = "Title is required";
    if (!uploadForm.effectiveDate) errs.effectiveDate = "Effective date is required";
    if (!uploadFile) errs.file = "A PDF file is required";
    if (Object.keys(errs).length || !uploadFile) { setUploadErrors(errs); return; }
    setUploadErrors({});
    setUploading(true);
    const policyId = `p-${Date.now()}`;
    try {
      await saveLocalPdf(policyId, uploadFile);
      const newPolicy: Policy = {
        id: policyId, title: uploadForm.title, titleAr: uploadForm.titleAr || uploadForm.title,
        description: uploadForm.description, descriptionAr: uploadForm.descriptionAr || uploadForm.description,
        department: uploadForm.department, documentType: uploadForm.documentType, category: uploadForm.category,
        edition: parseInt(uploadForm.edition) || 1, effectiveDate: uploadForm.effectiveDate,
        lastUpdated: new Date().toISOString().split("T")[0], status: uploadForm.status,
        pages: 0, requiresReading: uploadForm.requiresReading, views: 0,
        documentKey: policyId, documentName: uploadFile.name,
        generatedBy: "pdf",
      };
      const nextPolicies = [newPolicy, ...policies];
      setPolicies(nextPolicies);
      void savePoliciesToStore(nextPolicies);
      setUploadSuccess(true);
    } catch (error) {
      setUploadErrors({ file: error instanceof Error ? error.message : "Could not save the PDF" });
    } finally {
      setUploading(false);
    }
  }

  const managedFiltered = policies.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.titleAr.includes(search);
    const matchDept = filterDept === "All" || p.department === filterDept;
    const matchStatus = filterStatus === "All" || p.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });
  const depts = ["All", ...Array.from(new Set(policies.map(p => p.department)))];
  const statuses = ["All", "active", "draft", "under_review", "approved", "published", "archived"];
  const statusBadge: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    under_review: "bg-amber-100 text-amber-800 border-amber-200",
    approved: "bg-blue-100 text-blue-800 border-blue-200",
    published: "bg-purple-100 text-purple-800 border-purple-200",
    archived: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>Admin Panel</h2>
          <p className="text-[#638078] text-sm">Policy management and analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAdminTab("manage")} className="flex items-center gap-2 px-4 py-2 border border-[#CEE1DB] bg-white text-[#174C42] text-sm font-semibold rounded-lg hover:bg-[#F3F8F6] transition-colors cursor-pointer">
            <Layers size={14} /> Manage Policies
          </button>
          <button onClick={() => setAdminTab("upload")} className="flex items-center gap-2 px-4 py-2 bg-[#007D68] text-white text-sm font-semibold rounded-lg hover:bg-[#056655] transition-colors cursor-pointer">
            <Upload size={14} /> Upload Policy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-white border border-[#CEE1DB] rounded-xl p-1 w-fit">
        {([
          { key: "overview", label: "Overview" },
          { key: "manage", label: "Manage Policies" },
          { key: "upload", label: "Upload Policy" },
          { key: "submissions", label: "Submissions", badge: pendingCount },
          { key: "users", label: "Users" },
          { key: "analytics", label: "Analytics" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setAdminTab(tab.key)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${adminTab === tab.key ? "bg-[#007D68] text-white" : "text-[#638078] hover:text-[#174C42] hover:bg-[#F3F8F6]"}`}
          >
            {tab.label}
            {"badge" in tab && tab.badge > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${adminTab === tab.key ? "bg-white text-[#007D68]" : "bg-red-500 text-white"}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {adminTab === "overview" && (
        <div className="space-y-6">
          {/* Primary action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setAdminTab("upload")}
              className="group flex items-center gap-5 p-5 bg-[#007D68] text-white rounded-2xl hover:bg-[#056655] transition-colors text-left cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
                <Upload size={22} />
              </div>
              <div>
                <div className="font-bold text-base" style={{ fontFamily: "'Barlow', sans-serif" }}>Upload Policy</div>
                <div className="text-sm text-white/80 mt-0.5">Add a new policy document to the library</div>
              </div>
              <ChevronRight size={18} className="ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => setAdminTab("manage")}
              className="group flex items-center gap-5 p-5 bg-white border border-[#CEE1DB] text-[#174C42] rounded-2xl hover:border-[#007D68] hover:bg-[#F3F8F6] transition-colors text-left cursor-pointer shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#EAF6F2] flex items-center justify-center shrink-0 group-hover:bg-[#CEE1DB] transition-colors">
                <Layers size={22} className="text-[#007D68]" />
              </div>
              <div>
                <div className="font-bold text-base" style={{ fontFamily: "'Barlow', sans-serif" }}>Manage Policies</div>
                <div className="text-sm text-[#638078] mt-0.5">Edit, publish, archive, or delete policies</div>
              </div>
              <ChevronRight size={18} className="ml-auto text-[#638078] group-hover:text-[#007D68] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#CEE1DB] rounded-xl p-4">
              <h3 className="font-semibold text-[#174C42] mb-4" style={{ fontFamily: "'Barlow', sans-serif" }}>Live policy snapshot</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-[#F3F8F6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#638078]">Policies</p>
                  <p className="mt-2 text-2xl font-bold text-[#174C42]">{policies.length}</p>
                </div>
                <div className="rounded-xl bg-[#F3F8F6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#638078]">Published</p>
                  <p className="mt-2 text-2xl font-bold text-[#174C42]">{policies.filter(p => p.status === "published" || p.status === "active").length}</p>
                </div>
                <div className="rounded-xl bg-[#F3F8F6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#638078]">Pending review</p>
                  <p className="mt-2 text-2xl font-bold text-[#174C42]">{submissions.filter(s => s.status === "pending" || s.status === "under_review").length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-[#CEE1DB] rounded-xl p-4">
              <h3 className="font-semibold text-[#174C42] mb-4" style={{ fontFamily: "'Barlow', sans-serif" }}>Latest submissions</h3>
              {submissions.length === 0 ? (
                <p className="text-sm text-[#638078]">No submissions have been recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {submissions.slice(0, 4).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border border-[#CEE1DB] px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-[#174C42]">{sub.policy.title}</p>
                        <p className="text-xs text-[#638078]">{sub.submittedBy} · {sub.generationMethod}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#638078]">{sub.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-[#CEE1DB] rounded-xl p-4">
              <h3 className="font-semibold text-[#174C42] text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { icon: <Upload size={14} />, label: "Upload New Policy", tab: "upload" as const },
                  { icon: <Layers size={14} />, label: "Manage Policies", tab: "manage" as const },
                  { icon: <Users size={14} />, label: "Manage User Roles", tab: "users" as const },
                  { icon: <BarChart2 size={14} />, label: "Policy Analytics", tab: "analytics" as const },
                ].map(action => (
                  <button key={action.label} onClick={() => action.tab && setAdminTab(action.tab)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F3F8F6] transition-colors text-left cursor-pointer border border-transparent hover:border-[#CEE1DB]">
                    <span className="text-[#007D68]">{action.icon}</span>
                    <span className="text-sm text-[#174C42] font-medium">{action.label}</span>
                    <ChevronRight size={14} className="ml-auto text-[#638078]" />
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white border border-[#CEE1DB] rounded-xl p-4">
              <h3 className="font-semibold text-[#174C42] text-sm mb-3">Live activity</h3>
              <p className="text-sm text-[#638078]">No unresolved AI questions are being tracked yet. The workspace will display live issues here once activity data is connected.</p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ── Manage Policies Tab ── */}
      {adminTab === "manage" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#638078]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies…" className="w-full h-9 border border-[#CEE1DB] rounded-xl pl-8 pr-3 text-sm bg-white outline-none focus:border-[#007D68] transition-colors" />
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="h-9 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68]">
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68]">
              {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s.replace("_", " ")}</option>)}
            </select>
            <button onClick={() => setAdminTab("upload")} className="flex items-center gap-2 h-9 px-4 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655] transition-colors cursor-pointer">
              <Plus size={14} /> Upload New
            </button>
          </div>
          <div className="bg-white border border-[#CEE1DB] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F3F8F6] border-b border-[#CEE1DB]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Policy</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide hidden md:table-cell">Department</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide hidden lg:table-cell">Edition</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide hidden lg:table-cell">Updated</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managedFiltered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-12 text-[#638078] text-sm">No policies match your filters.</td></tr>
                  )}
                  {managedFiltered.map((p, i) => (
                    <tr key={p.id} className={`hover:bg-[#F3F8F6] transition-colors ${i < managedFiltered.length - 1 ? "border-b border-[#CEE1DB]" : ""}`}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#174C42] text-sm">{p.title}</div>
                        <div className="text-xs text-[#638078] mt-0.5">{p.documentType}</div>
                      </td>
                      <td className="px-5 py-4 text-[#638078] text-sm hidden md:table-cell">{p.department}</td>
                      <td className="px-5 py-4 text-[#638078] text-sm hidden lg:table-cell">Ed. {p.edition}</td>
                      <td className="px-5 py-4">
                        <select value={p.status} onChange={e => changeStatus(p.id, e.target.value as Policy["status"])} className={`text-xs font-semibold border rounded-full px-2.5 py-1 outline-none cursor-pointer capitalize ${statusBadge[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {["active","draft","under_review","approved","published","archived"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-[#638078] text-xs hidden lg:table-cell">{p.lastUpdated}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate("policy-details")} title="View" className="p-1.5 rounded-lg text-[#638078] hover:text-[#174C42] hover:bg-[#F3F8F6] transition-colors cursor-pointer"><Eye size={14} /></button>
                          <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg text-[#638078] hover:text-[#007D68] hover:bg-[#EAF6F2] transition-colors cursor-pointer"><Pencil size={14} /></button>
                          <button onClick={() => setDeleteId(p.id)} title="Delete" className="p-1.5 rounded-lg text-[#638078] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"><X size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Policy Tab ── */}
      {adminTab === "upload" && (
        <div className="max-w-3xl">
          {uploadSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-[#174C42] mb-2" style={{ fontFamily: "'Barlow', sans-serif" }}>Policy Uploaded</h3>
              <p className="text-[#638078] mb-8 max-w-sm">"{uploadForm.title}" has been added with <span className="font-semibold capitalize">{uploadForm.status}</span> status.</p>
              <div className="flex gap-3">
                <button onClick={() => setAdminTab("manage")} className="px-5 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655] transition-colors cursor-pointer">View in Manage Policies</button>
                <button onClick={() => { setUploadSuccess(false); setUploadForm(blankForm); setUploadFile(null); }} className="px-5 py-2.5 border border-[#CEE1DB] text-[#174C42] text-sm font-semibold rounded-xl hover:bg-[#F3F8F6] transition-colors cursor-pointer">Upload Another</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-5">
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); selectUploadFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragging ? "border-[#007D68] bg-[#EAF6F2]" : uploadFile ? "border-emerald-400 bg-emerald-50" : uploadErrors.file ? "border-red-300 bg-red-50" : "border-[#CEE1DB] hover:border-[#007D68] hover:bg-[#EAF6F2]/50"}`}
              >
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => selectUploadFile(e.target.files?.[0])} />
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><FileText size={22} className="text-emerald-600" /></div>
                    <p className="font-semibold text-emerald-800 text-sm">{uploadFile.name}</p>
                    <p className="text-xs text-emerald-600">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB · PDF</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setUploadFile(null); }} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#EAF6F2] flex items-center justify-center"><Upload size={22} className="text-[#007D68]" /></div>
                    <div>
                      <p className="font-semibold text-[#174C42] text-sm">Drop PDF here or click to browse</p>
                      <p className="text-xs text-[#638078] mt-1">PDF only · Max 50 MB</p>
                    </div>
                  </div>
                )}
              </div>
              {uploadErrors.file && <p className="text-xs text-red-600">{uploadErrors.file}</p>}

              <div className="bg-white border border-[#CEE1DB] rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-[#174C42]">Policy Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Title (English) *</label>
                    <input value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. IT Office Procedure Manual" className={`w-full h-10 border rounded-xl px-3 text-sm bg-white outline-none transition focus:border-[#007D68] focus:ring-2 focus:ring-[#007D68]/10 ${uploadErrors.title ? "border-red-400" : "border-[#CEE1DB]"}`} />
                    {uploadErrors.title && <p className="text-xs text-red-600 mt-1">{uploadErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Title (Arabic)</label>
                    <input value={uploadForm.titleAr} onChange={e => setUploadForm(f => ({ ...f, titleAr: e.target.value }))} dir="rtl" placeholder="العنوان بالعربية" className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none transition focus:border-[#007D68] focus:ring-2 focus:ring-[#007D68]/10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Description</label>
                  <textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description…" className="w-full border border-[#CEE1DB] rounded-xl px-3 py-2 text-sm bg-white outline-none transition focus:border-[#007D68] resize-none" />
                </div>
              </div>

              <div className="bg-white border border-[#CEE1DB] rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-[#174C42]">Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Department *</label>
                    <select value={uploadForm.department} onChange={e => setUploadForm(f => ({ ...f, department: e.target.value }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68]">
                      {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Document Type</label>
                    <select value={uploadForm.documentType} onChange={e => setUploadForm(f => ({ ...f, documentType: e.target.value }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68]">
                      {["Office Procedure Manual","Policy","Guideline","Standard","Framework","Circular"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Edition</label>
                    <input type="number" value={uploadForm.edition} onChange={e => setUploadForm(f => ({ ...f, edition: e.target.value }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68]" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Effective Date *</label>
                    <input type="date" value={uploadForm.effectiveDate} onChange={e => setUploadForm(f => ({ ...f, effectiveDate: e.target.value }))} className={`w-full h-10 border rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] ${uploadErrors.effectiveDate ? "border-red-400" : "border-[#CEE1DB]"}`} />
                    {uploadErrors.effectiveDate && <p className="text-xs text-red-600 mt-1">{uploadErrors.effectiveDate}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#174C42] mb-1.5">Initial Status</label>
                    <select value={uploadForm.status} onChange={e => setUploadForm(f => ({ ...f, status: e.target.value as Policy["status"] }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] capitalize">
                      {["draft","active","under_review","approved","published"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="up-req" checked={uploadForm.requiresReading} onChange={e => setUploadForm(f => ({ ...f, requiresReading: e.target.checked }))} style={{ accentColor: "#007D68" }} className="w-4 h-4 cursor-pointer" />
                    <label htmlFor="up-req" className="text-sm font-medium text-[#174C42] cursor-pointer">Require acknowledgment from all users</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pb-6">
                <button type="button" onClick={() => setAdminTab("overview")} className="px-5 py-2.5 border border-[#CEE1DB] text-[#174C42] text-sm font-semibold rounded-xl hover:bg-[#F3F8F6] transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={uploading} className="flex items-center gap-2 px-6 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655] transition-colors disabled:opacity-60 cursor-pointer">
                  {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Upload size={15} />}
                  {uploading ? "Uploading…" : "Upload Policy"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingPolicy(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>Edit Policy</h3>
              <button onClick={() => setEditingPolicy(null)} className="p-1.5 rounded-lg hover:bg-[#F3F8F6] text-[#638078] cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              {(["title", "titleAr"] as const).map(k => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">{k === "title" ? "Title (EN)" : "Title (AR)"}</label>
                  <input
                    value={String(editForm[k] ?? "")}
                    onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))}
                    dir={k === "titleAr" ? "rtl" : "ltr"}
                    className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] focus:ring-2 focus:ring-[#007D68]/10 transition"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">Edition</label>
                  <input type="number" value={String(editForm.edition ?? "")} onChange={e => setEditForm(f => ({ ...f, edition: parseInt(e.target.value) }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">Effective Date</label>
                  <input type="date" value={String(editForm.effectiveDate ?? "")} onChange={e => setEditForm(f => ({ ...f, effectiveDate: e.target.value }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">Status</label>
                <select value={String(editForm.status ?? "draft")} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Policy["status"] }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] transition capitalize">
                  {["draft", "active", "under_review", "approved", "published", "archived"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">Department</label>
                <select value={String(editForm.department ?? "")} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] transition">
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1">Description (EN)</label>
                <textarea value={String(editForm.description ?? "")} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-[#CEE1DB] rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-[#007D68] transition resize-none" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="admin-edit-req" checked={Boolean(editForm.requiresReading)} onChange={e => setEditForm(f => ({ ...f, requiresReading: e.target.checked }))} style={{ accentColor: "#007D68" }} />
                <label htmlFor="admin-edit-req" className="text-sm text-[#174C42] cursor-pointer">Require acknowledgment from all users</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#CEE1DB]">
              <button onClick={() => setEditingPolicy(null)} className="px-4 py-2 border border-[#CEE1DB] text-sm font-semibold text-[#174C42] rounded-xl hover:bg-[#F3F8F6] transition-colors cursor-pointer">Cancel</button>
              <button onClick={saveEdit} className="px-5 py-2 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655] transition-colors cursor-pointer">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-[#174C42] mb-2">Delete Policy?</h3>
            <p className="text-sm text-[#638078] mb-6">This will permanently remove the policy from the library and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 border border-[#CEE1DB] text-sm font-semibold text-[#174C42] rounded-xl hover:bg-[#F3F8F6] transition-colors cursor-pointer">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submissions Tab ── */}
      {adminTab === "submissions" && (() => {
        const subStatusColors: Record<PolicySubmission["status"], string> = {
          pending: "bg-amber-100 text-amber-800 border-amber-200",
          approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
          under_review: "bg-blue-100 text-blue-800 border-blue-200",
          rejected: "bg-red-100 text-red-700 border-red-200",
        };
        const subMethodLabel: Record<PolicySubmission["generationMethod"], string> = { ai: "AI Generated", text: "Written Manually", pdf: "PDF Upload" };
        const subMethodIcon: Record<PolicySubmission["generationMethod"], React.ReactNode> = { ai: <Sparkles size={12} />, text: <Edit3 size={12} />, pdf: <FileText size={12} /> };
        const filtered = submissions.filter(s => subFilter === "all" || s.status === subFilter);
        const approvingSub = submissions.find(s => s.id === approvingId);
        const detailsSub = submissions.find(s => s.id === detailsId);

        function doAction(id: string, newStatus: PolicySubmission["status"], note?: string) {
          onSubmissionAction(id, newStatus, note, approveStatus);
          setApprovingId(null);
          setApproveNote("");
          setDetailsId(null);
        }

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1 bg-white border border-[#CEE1DB] rounded-xl p-1">
                {(["all","pending","approved","under_review","rejected"] as const).map(f => (
                  <button key={f} onClick={() => setSubFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer capitalize ${subFilter === f ? "bg-[#007D68] text-white" : "text-[#638078] hover:bg-[#F3F8F6]"}`}>
                    {f === "all" ? `All (${submissions.length})` : `${f.replace("_"," ")} (${submissions.filter(s => s.status === f).length})`}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-[#EAF6F2] flex items-center justify-center mb-4"><Inbox size={24} className="text-[#007D68]" /></div>
                <p className="font-semibold text-[#174C42]">No submissions yet</p>
                <p className="text-sm text-[#638078] mt-1">Employee and academic policy submissions will appear here.</p>
              </div>
            ) : (
              <div className="bg-white border border-[#CEE1DB] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#F3F8F6] border-b border-[#CEE1DB]">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Policy</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide hidden md:table-cell">Submitted By</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide hidden lg:table-cell">Method</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Status</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-[#638078] uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((sub, i) => (
                        <tr key={sub.id} className={`hover:bg-[#F3F8F6] transition-colors ${i < filtered.length - 1 ? "border-b border-[#CEE1DB]" : ""}`}>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-[#174C42] text-sm">{sub.policy.title}</div>
                            <div className="text-xs text-[#638078] mt-0.5">{sub.policy.department} · {sub.submittedAt}</div>
                            {sub.aiPrompt && <div className="text-xs text-[#638078] italic mt-0.5 truncate max-w-xs">"{sub.aiPrompt}"</div>}
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <div className="text-sm font-medium text-[#174C42]">{sub.submittedBy}</div>
                            <div className="text-xs text-[#638078] capitalize">{sub.submittedByRole}</div>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="flex items-center gap-1.5 text-xs text-[#638078]">
                              {subMethodIcon[sub.generationMethod]}
                              {subMethodLabel[sub.generationMethod]}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center text-xs font-semibold border rounded-full px-2.5 py-1 capitalize ${subStatusColors[sub.status]}`}>
                              {sub.status.replace("_"," ")}
                            </span>
                            {sub.adminNote && <div className="text-xs text-[#638078] mt-1 italic">{sub.adminNote}</div>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setDetailsId(sub.id)} title="Read details" className="p-1.5 rounded-lg text-[#638078] hover:text-[#174C42] hover:bg-[#F3F8F6] transition-colors cursor-pointer"><Eye size={14} /></button>
                              {(sub.status === "pending" || sub.status === "under_review") ? (
                                <>
                                  <button onClick={() => doAction(sub.id, "under_review")} title="Mark Under Review" className="p-1.5 rounded-lg text-[#638078] hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"><CircleDot size={14} /></button>
                                  <button onClick={() => { setApprovingId(sub.id); setApproveNote(""); setApproveStatus("approved"); }} title="Approve" className="p-1.5 rounded-lg text-[#638078] hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"><ThumbsUp size={14} /></button>
                                  <button onClick={() => doAction(sub.id, "rejected", "Does not meet policy standards.")} title="Reject" className="p-1.5 rounded-lg text-[#638078] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"><ThumbsDown size={14} /></button>
                                </>
                              ) : (
                                <button onClick={() => onSubmissionAction(sub.id, "pending", undefined, "draft")} className="text-xs text-[#638078] hover:text-[#174C42] underline cursor-pointer">Reset</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Submission details modal */}
            {detailsId && detailsSub && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailsId(null)} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>{detailsSub.policy.title}</h3>
                      <p className="text-sm text-[#638078] mt-1">{detailsSub.policy.description || "No description provided."}</p>
                    </div>
                    <button onClick={() => setDetailsId(null)} className="p-1.5 rounded-lg hover:bg-[#F3F8F6] text-[#638078] cursor-pointer"><X size={16} /></button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm text-[#174C42]">
                    <div className="rounded-xl border border-[#CEE1DB] bg-[#F3F8F6] p-4 space-y-2">
                      <div><span className="font-semibold text-[#638078]">Submitted by:</span> {detailsSub.submittedBy}</div>
                      <div><span className="font-semibold text-[#638078]">Department:</span> {detailsSub.policy.department}</div>
                      <div><span className="font-semibold text-[#638078]">Document type:</span> {detailsSub.policy.documentType}</div>
                      <div><span className="font-semibold text-[#638078]">Effective date:</span> {detailsSub.policy.effectiveDate || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-[#CEE1DB] bg-white p-4 space-y-2">
                      <div><span className="font-semibold text-[#638078]">Method:</span> {subMethodLabel[detailsSub.generationMethod]}</div>
                      <div><span className="font-semibold text-[#638078]">Status:</span> {detailsSub.status}</div>
                      {detailsSub.aiPrompt && <div><span className="font-semibold text-[#638078]">Prompt:</span> {detailsSub.aiPrompt}</div>}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#CEE1DB] p-4 bg-white">
                    <h4 className="text-sm font-semibold text-[#174C42] mb-2">English draft</h4>
                    <pre className="whitespace-pre-wrap text-xs leading-6 text-[#174C42] bg-[#F3F8F6] rounded-lg p-3">{detailsSub.policy.content || "No content available yet."}</pre>
                  </div>

                  <div className="rounded-xl border border-[#CEE1DB] p-4 bg-white">
                    <h4 className="text-sm font-semibold text-[#174C42] mb-2">Arabic draft</h4>
                    <pre dir="rtl" className="whitespace-pre-wrap text-xs leading-6 text-[#174C42] bg-[#F3F8F6] rounded-lg p-3">{detailsSub.policy.contentAr || "لا يوجد محتوى متاح بعد."}</pre>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#CEE1DB]">
                    <button onClick={() => setDetailsId(null)} className="px-4 py-2 border border-[#CEE1DB] text-sm font-semibold text-[#174C42] rounded-xl hover:bg-[#F3F8F6] cursor-pointer">Close</button>
                    <button onClick={() => { setDetailsId(null); setApprovingId(detailsSub.id); setApproveNote(""); setApproveStatus("approved"); }} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 cursor-pointer"><ThumbsUp size={14} /> Approve</button>
                    <button onClick={() => { doAction(detailsSub.id, "rejected", "Does not meet policy standards."); }} className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 cursor-pointer"><ThumbsDown size={14} /> Reject</button>
                  </div>
                </div>
              </div>
            )}

            {/* Approve modal */}
            {approvingId && approvingSub && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApprovingId(null)} />
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#174C42]" style={{ fontFamily: "'Barlow', sans-serif" }}>Approve Submission</h3>
                    <button onClick={() => setApprovingId(null)} className="p-1.5 rounded-lg hover:bg-[#F3F8F6] text-[#638078] cursor-pointer"><X size={16} /></button>
                  </div>
                  <p className="text-sm text-[#638078]">Approving <strong className="text-[#174C42]">"{approvingSub.policy.title}"</strong> by {approvingSub.submittedBy}. This will add it to the policy library.</p>
                  <div>
                    <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1.5">Publish Status</label>
                    <select value={approveStatus} onChange={e => setApproveStatus(e.target.value as Policy["status"])} className="w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm bg-white outline-none focus:border-[#007D68] capitalize">
                      {["approved","published","active"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#638078] uppercase tracking-wide mb-1.5">Note to submitter (optional)</label>
                    <textarea value={approveNote} onChange={e => setApproveNote(e.target.value)} rows={2} placeholder="Great policy! It has been approved and published." className="w-full border border-[#CEE1DB] rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-[#007D68] resize-none" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-[#CEE1DB]">
                    <button onClick={() => setApprovingId(null)} className="px-4 py-2 border border-[#CEE1DB] text-sm font-semibold text-[#174C42] rounded-xl hover:bg-[#F3F8F6] cursor-pointer">Cancel</button>
                    <button onClick={() => doAction(approvingId, "approved", approveNote || undefined)} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 cursor-pointer"><ThumbsUp size={14} /> Approve & Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {adminTab === "users" && (
        <div className="bg-white border border-[#CEE1DB] rounded-xl p-6 text-sm text-[#638078]">
          <h3 className="font-semibold text-[#174C42] mb-3">User management data will appear here once the directory and engagement tracking are configured.</h3>
          <p>Connect a real user directory or analytics source to replace placeholder user tables with actual employee data.</p>
        </div>
      )}

      {adminTab === "analytics" && (
        <div className="bg-white border border-[#CEE1DB] rounded-xl p-6 text-sm text-[#638078]">
          <h3 className="font-semibold text-[#174C42] mb-3">Analytics will display here when live policy engagement data is available.</h3>
          <p>Once actual policy views and acknowledgments are tracked, this section can show useful trends and distribution charts.</p>
        </div>
      )}
    </div>
  );
}

// ─── Generate Policy Screen ──────────────────────────────────────────────────

function GeneratePolicyScreen({ authUser, lang, navigate: _navigate, onSubmit, mySubmissions }: {
  authUser: AuthUser;
  lang: Lang;
  navigate: (s: Screen) => void;
  onSubmit: (sub: PolicySubmission) => void;
  mySubmissions: PolicySubmission[];
}) {
  const isAdmin = authUser.role === "admin";
  const isRtl = lang === "ar";
  const [method, setMethod] = useState<"ai" | "text" | "pdf">("ai");
  const [step, setStep] = useState<"input" | "preview">("input");
  const [previewLang, setPreviewLang] = useState<Lang>(lang);
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<GeneratedPolicyDraft | null>(null);
  const [aiSource, setAiSource] = useState<"openai" | "local">("local");
  const [textContent, setTextContent] = useState("");
  const [textContentAr, setTextContentAr] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const makeBlankMeta = () => ({
    title: "", titleAr: "", description: "", descriptionAr: "",
    content: "", contentAr: "",
    department: "Information Technology", documentType: "Policy",
    edition: "1", effectiveDate: "", requiresReading: false,
    status: "draft" as Policy["status"],
    keywords: [] as string[], keywordsAr: [] as string[], references: [] as PolicyReference[],
  });
  const [meta, setMeta] = useState(makeBlankMeta);
  const [metaErrors, setMetaErrors] = useState<Record<string, string>>({});

  const ui = (en: string, ar: string) => isRtl ? ar : en;

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    setMetaErrors({});
    await new Promise(resolve => setTimeout(resolve, 650));
    const generated = await generatePolicyDraft(aiPrompt);
    setDraft(generated);
    setAiSource(generated.generatedByAI === "openai" ? "openai" : "local");
    setMeta(current => ({
      ...current,
      title: generated.title,
      titleAr: generated.titleAr,
      description: generated.description,
      descriptionAr: generated.descriptionAr,
      content: generated.content,
      contentAr: generated.contentAr,
      department: generated.department,
      documentType: generated.documentType,
      keywords: generated.keywords,
      keywordsAr: generated.keywordsAr,
      references: generated.references,
    }));
    setPreviewLang(generated.detectedLanguage);
    setGenerating(false);
    setStep("preview");
  }

  function handleManualNext() {
    if (method === "pdf" && !pdfFile) {
      setMetaErrors({ pdf: ui("Please select a PDF file.", "اختر ملف PDF.") });
      return;
    }
    if (method === "text" && !textContent.trim() && !textContentAr.trim()) {
      setMetaErrors({ text: ui("Enter policy content in at least one language.", "أدخل محتوى السياسة بلغة واحدة على الأقل.") });
      return;
    }
    setMeta(current => ({ ...current, content: textContent, contentAr: textContentAr }));
    setMetaErrors({});
    setStep("preview");
  }

  function validateMeta() {
    const errors: Record<string, string> = {};
    if (!meta.title.trim()) errors.title = ui("English title is required.", "العنوان الإنجليزي مطلوب.");
    if (!meta.titleAr.trim()) errors.titleAr = ui("Arabic title is required.", "العنوان العربي مطلوب.");
    if (method !== "pdf" && !meta.content.trim() && !meta.contentAr.trim()) errors.content = ui("Policy content is required.", "محتوى السياسة مطلوب.");
    if (!meta.effectiveDate) errors.effectiveDate = ui("Effective date is required.", "تاريخ النفاذ مطلوب.");
    return errors;
  }

  function handleSubmit() {
    const errors = validateMeta();
    if (Object.keys(errors).length) { setMetaErrors(errors); return; }
    const today = new Date().toISOString().split("T")[0];
    const policy: Policy = {
      id: `p-${Date.now()}`,
      title: meta.title,
      titleAr: meta.titleAr,
      description: meta.description,
      descriptionAr: meta.descriptionAr || meta.description,
      content: meta.content,
      contentAr: meta.contentAr,
      keywords: meta.keywords,
      keywordsAr: meta.keywordsAr,
      references: meta.references,
      generatedBy: method === "ai" ? "ai-assisted" : method,
      department: meta.department,
      documentType: meta.documentType,
      category: "IT",
      edition: Number.parseInt(meta.edition, 10) || 1,
      effectiveDate: meta.effectiveDate,
      lastUpdated: today,
      status: isAdmin ? meta.status : "draft",
      pages: method === "pdf" ? 1 : Math.max(1, Math.ceil(Math.max(meta.content.length, meta.contentAr.length) / 2600)),
      requiresReading: meta.requiresReading,
      views: 0,
    };
    const initialStatus: PolicySubmission["status"] = isAdmin ? "approved" : "pending";
    const submission: PolicySubmission = {
      id: `sub-${Date.now()}`,
      policy,
      submittedBy: authUser.name,
      submittedByEmail: authUser.email,
      submittedByRole: authUser.role as PolicySubmission["submittedByRole"],
      submittedAt: today,
      generationMethod: method,
      aiPrompt: method === "ai" ? aiPrompt : undefined,
      textContent: method !== "pdf" ? meta.content : undefined,
      textContentAr: method !== "pdf" ? meta.contentAr : undefined,
      pdfName: method === "pdf" ? pdfFile?.name : undefined,
      status: initialStatus,
      statusHistory: [{ status: initialStatus, date: today }],
    };
    onSubmit(submission);
    setJustSubmitted(isRtl ? meta.titleAr : meta.title);
    setStep("input");
    setMeta(makeBlankMeta());
    setDraft(null);
    setAiPrompt("");
    setTextContent("");
    setTextContentAr("");
    setPdfFile(null);
    setTimeout(() => setJustSubmitted(null), 6000);
  }

  if (step === "preview") {
    const shownContent = previewLang === "ar" ? meta.contentAr : meta.content;
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        <button onClick={() => setStep("input")} className={`flex items-center gap-2 text-sm text-[#638078] hover:text-[#174C42] ${isRtl ? "flex-row-reverse" : ""}`}>
          {isRtl ? <ChevronRight size={15} /> : <ArrowLeft size={15} />} {ui("Back", "رجوع")}
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#174C42]">{ui("Review and finalize the bilingual draft", "مراجعة المسودة الثنائية واعتماد بياناتها")}</h2>
          <p className="text-sm text-[#638078] mt-1">{ui("Edit both languages, verify references, and complete approval metadata before submission.", "عدّل اللغتين وتحقق من المراجع واستكمل بيانات الاعتماد قبل الإرسال.")}</p>
        </div>

        {method === "ai" && draft && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className={`flex gap-3 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
              <Sparkles size={18} className="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">{ui("AI-assisted draft — human approval required", "مسودة بمساعدة آلية — المراجعة البشرية والاعتماد إلزاميان")}</p>
                <p className="text-xs text-[#174C42] mt-2">{aiSource === "openai" ? ui("Generated by a real AI service.", "تم إنشاؤها بواسطة خدمة ذكاء اصطناعي حقيقية.") : ui("Generated using the local fallback policy generator.", "تم إنشاؤها باستخدام مولد السياسات المحلي الاحتياطي.")}</p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800">
                  {(isRtl ? draft.reviewNotesAr : draft.reviewNotes).map(note => <li key={note}>• {note}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-[#CEE1DB] rounded-2xl p-5 space-y-5">
          <h3 className="font-semibold text-[#174C42]">{ui("Document metadata", "بيانات الوثيقة")}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-[#638078]">{ui("Title — English *", "العنوان — إنجليزي *")}
              <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))} className={`mt-1.5 w-full h-10 border rounded-xl px-3 text-sm outline-none focus:border-[#007D68] ${metaErrors.title ? "border-red-400" : "border-[#CEE1DB]"}`} />
              {metaErrors.title && <span className="block text-red-600 mt-1">{metaErrors.title}</span>}
            </label>
            <label className="text-xs font-semibold text-[#638078]">{ui("Title — Arabic *", "العنوان — عربي *")}
              <input dir="rtl" value={meta.titleAr} onChange={e => setMeta(m => ({ ...m, titleAr: e.target.value }))} className={`mt-1.5 w-full h-10 border rounded-xl px-3 text-sm outline-none focus:border-[#007D68] ${metaErrors.titleAr ? "border-red-400" : "border-[#CEE1DB]"}`} />
              {metaErrors.titleAr && <span className="block text-red-600 mt-1">{metaErrors.titleAr}</span>}
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-xs font-semibold text-[#638078]">{ui("Description — English", "الوصف — إنجليزي")}
              <textarea value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))} rows={4} className="mt-1.5 w-full border border-[#CEE1DB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007D68] resize-y" />
            </label>
            <label className="text-xs font-semibold text-[#638078]">{ui("Description — Arabic", "الوصف — عربي")}
              <textarea dir="rtl" value={meta.descriptionAr} onChange={e => setMeta(m => ({ ...m, descriptionAr: e.target.value }))} rows={4} className="mt-1.5 w-full border border-[#CEE1DB] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#007D68] resize-y" />
            </label>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="text-xs font-semibold text-[#638078]">{ui("Department", "القسم")}
              <select value={meta.department} onChange={e => setMeta(m => ({ ...m, department: e.target.value }))} className="mt-1.5 w-full h-10 border border-[#CEE1DB] rounded-xl px-2 text-sm bg-white">
                {DEPARTMENTS.map(dept => <option key={dept.id} value={dept.name}>{isRtl ? dept.nameAr : dept.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#638078]">{ui("Document type", "نوع الوثيقة")}
              <select value={meta.documentType} onChange={e => setMeta(m => ({ ...m, documentType: e.target.value }))} className="mt-1.5 w-full h-10 border border-[#CEE1DB] rounded-xl px-2 text-sm bg-white">
                {["Policy", "Office Procedure Manual", "Guideline", "Standard", "Framework", "Circular"].map(type => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#638078]">{ui("Edition", "الإصدار")}
              <input type="number" min="1" value={meta.edition} onChange={e => setMeta(m => ({ ...m, edition: e.target.value }))} className="mt-1.5 w-full h-10 border border-[#CEE1DB] rounded-xl px-3 text-sm" />
            </label>
            <label className="text-xs font-semibold text-[#638078]">{ui("Effective date *", "تاريخ النفاذ *")}
              <input type="date" value={meta.effectiveDate} onChange={e => setMeta(m => ({ ...m, effectiveDate: e.target.value }))} className={`mt-1.5 w-full h-10 border rounded-xl px-3 text-sm ${metaErrors.effectiveDate ? "border-red-400" : "border-[#CEE1DB]"}`} />
              {metaErrors.effectiveDate && <span className="block text-red-600 mt-1">{metaErrors.effectiveDate}</span>}
            </label>
          </div>
        </div>

        {method !== "pdf" && (
          <div className="bg-white border border-[#CEE1DB] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#CEE1DB] bg-[#F3F8F6]">
              <h3 className="font-semibold text-[#174C42]">{ui("Full policy draft", "نص مسودة السياسة الكامل")}</h3>
              <div className="flex rounded-lg border border-[#CEE1DB] bg-white p-0.5">
                <button onClick={() => setPreviewLang("en")} className={`px-3 py-1.5 text-xs rounded-md ${previewLang === "en" ? "bg-[#007D68] text-white" : "text-[#638078]"}`}>English</button>
                <button onClick={() => setPreviewLang("ar")} className={`px-3 py-1.5 text-xs rounded-md ${previewLang === "ar" ? "bg-[#007D68] text-white" : "text-[#638078]"}`}>العربية</button>
              </div>
            </div>
            <textarea
              dir={previewLang === "ar" ? "rtl" : "ltr"}
              value={shownContent}
              onChange={e => setMeta(m => previewLang === "ar" ? ({ ...m, contentAr: e.target.value }) : ({ ...m, content: e.target.value }))}
              rows={28}
              className={`w-full px-5 py-4 text-sm leading-7 font-mono outline-none resize-y ${metaErrors.content ? "bg-red-50" : "bg-white"}`}
            />
            {metaErrors.content && <p className="px-5 pb-3 text-xs text-red-600">{metaErrors.content}</p>}
          </div>
        )}

        {method === "ai" && (
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#CEE1DB] rounded-2xl p-5">
              <h3 className="font-semibold text-[#174C42] mb-3">{ui("Search keywords", "كلمات البحث")}</h3>
              <div className="flex flex-wrap gap-2">
                {(isRtl ? meta.keywordsAr : meta.keywords).map(keyword => <span key={keyword} className="px-2.5 py-1 rounded-full bg-[#EAF6F2] text-[#007D68] text-xs">{keyword}</span>)}
              </div>
            </div>
            <div className="bg-white border border-[#CEE1DB] rounded-2xl p-5">
              <h3 className="font-semibold text-[#174C42] mb-3">{ui("Grounding references", "مراجع الاستناد")}</h3>
              {meta.references.length ? <div className="space-y-2">{meta.references.map(ref => (
                <div key={ref.groupId} className="text-xs text-[#638078] border-b border-[#EAF6F2] pb-2 last:border-0">
                  <strong className="text-[#174C42]">{isRtl ? ref.titleAr : ref.title}</strong><br />{ref.groupId} · {ui("page", "صفحة")} {ref.page} · {ref.recordIds.join(", ")}
                </div>
              ))}</div> : <p className="text-xs text-amber-700">{ui("No IT OPM reference was linked automatically. Add authoritative references before approval.", "لم يُربط مرجع من دليل IT OPM تلقائيًا. أضف المراجع الرسمية قبل الاعتماد.")}</p>}
            </div>
          </div>
        )}

        <div className="bg-white border border-[#CEE1DB] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-[#174C42]">
            <input type="checkbox" checked={meta.requiresReading} onChange={e => setMeta(m => ({ ...m, requiresReading: e.target.checked }))} style={{ accentColor: "#007D68" }} />
            {ui("Require user acknowledgment", "يتطلب إقرار المستخدمين بالقراءة")}
          </label>
          {isAdmin && <select value={meta.status} onChange={e => setMeta(m => ({ ...m, status: e.target.value as Policy["status"] }))} className="h-9 border border-[#CEE1DB] rounded-lg px-3 text-sm bg-white"><option value="draft">Draft</option><option value="approved">Approved</option><option value="active">Active</option><option value="published">Published</option></select>}
        </div>

        <div className={`flex gap-3 pb-6 ${isRtl ? "justify-start" : "justify-end"}`}>
          <button onClick={() => setStep("input")} className="px-5 py-2.5 border border-[#CEE1DB] text-[#174C42] text-sm font-semibold rounded-xl hover:bg-[#F3F8F6]">{ui("Back", "رجوع")}</button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655]">
            {isAdmin ? <CheckCircle size={15} /> : <Send size={15} />}{isAdmin ? ui("Add to Library", "إضافة إلى المكتبة") : ui("Submit for Approval", "إرسال للاعتماد")}
          </button>
        </div>
      </div>
    );
  }

  const examples = POLICY_GENERATOR_EXAMPLES[lang];
  const methods = [
    { key: "ai" as const, icon: <Sparkles size={18} />, en: "AI-assisted bilingual draft", ar: "مسودة ثنائية بمساعدة آلية", enDesc: "Generate complete editable Arabic and English content", arDesc: "إنشاء محتوى عربي وإنجليزي كامل وقابل للتعديل" },
    { key: "text" as const, icon: <Edit3 size={18} />, en: "Write manually", ar: "كتابة يدوية", enDesc: "Paste or author content in either language", arDesc: "اكتب أو الصق المحتوى بأي من اللغتين" },
    { key: "pdf" as const, icon: <FileText size={18} />, en: "Upload PDF", ar: "رفع PDF", enDesc: "Register an existing controlled document", arDesc: "تسجيل وثيقة مضبوطة موجودة" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-xl font-bold text-[#174C42]">{ui("Professional Bilingual Policy Studio", "استوديو احترافي لإصدار السياسات باللغتين")}</h1>
        <p className="text-sm text-[#638078] mt-1">{ui("Create editable drafts with structured sections, keywords, controls, KPIs, and IT OPM references where applicable.", "أنشئ مسودات قابلة للتعديل تتضمن الأقسام والضوابط ومؤشرات الأداء وكلمات البحث ومراجع IT OPM عند انطباقها.")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {methods.map(option => <button key={option.key} onClick={() => { setMethod(option.key); setMetaErrors({}); }} className={`p-4 rounded-2xl border-2 text-center ${method === option.key ? "border-[#007D68] bg-[#EAF6F2]" : "border-[#CEE1DB] bg-white hover:border-[#007D68]/40"}`}>
          <span className={`mx-auto mb-2 flex justify-center ${method === option.key ? "text-[#007D68]" : "text-[#638078]"}`}>{option.icon}</span>
          <span className="block text-sm font-semibold text-[#174C42]">{isRtl ? option.ar : option.en}</span>
          <span className="block text-xs text-[#638078] mt-1">{isRtl ? option.arDesc : option.enDesc}</span>
        </button>)}
      </div>

      {method === "ai" && <div className="bg-white border border-[#CEE1DB] rounded-2xl p-6 space-y-4">
        <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}><Wand2 size={18} className="text-[#007D68]" /><h3 className="font-semibold text-[#174C42]">{ui("Describe the document in Arabic or English", "صف الوثيقة بالعربية أو الإنجليزية")}</h3></div>
        <textarea dir="auto" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={6} placeholder={ui("Example: Data backup and recovery policy covering daily backups, monthly backups, restore testing, responsibilities, evidence, and KPIs…", "مثال: سياسة النسخ الاحتياطي واستعادة البيانات تشمل النسخ اليومي والشهري واختبار الاستعادة والمسؤوليات والأدلة ومؤشرات الأداء…")} className="w-full border border-[#CEE1DB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#007D68] focus:ring-2 focus:ring-[#007D68]/10 resize-y" />
        <div><p className="text-xs font-semibold text-[#638078] mb-2">{ui("Examples", "أمثلة")}</p><div className="flex flex-wrap gap-2">{examples.map(example => <button key={example} onClick={() => setAiPrompt(example)} className="text-xs px-3 py-1.5 border border-[#CEE1DB] rounded-full text-[#638078] hover:border-[#007D68] hover:text-[#007D68] bg-white">{example}</button>)}</div></div>
        <button onClick={handleGenerate} disabled={!aiPrompt.trim() || generating} className="flex items-center gap-2 px-6 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-[#056655]">{generating ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{ui("Building both language versions…", "جارٍ إنشاء النسختين اللغويتين…")}</> : <><Sparkles size={15} />{ui("Generate Professional Draft", "إنشاء مسودة احترافية")}</>}</button>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{ui("The generator creates a reviewable draft. It never makes the draft an approved policy automatically; the document owner must verify requirements and references.", "ينشئ المولد مسودة قابلة للمراجعة، ولا يحولها تلقائيًا إلى سياسة معتمدة؛ يجب على مالك الوثيقة التحقق من المتطلبات والمراجع.")}</p>
      </div>}

      {method === "text" && <div className="bg-white border border-[#CEE1DB] rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-[#174C42]">{ui("Manual bilingual content", "محتوى يدوي ثنائي اللغة")}</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-xs font-semibold text-[#638078]">English<textarea value={textContent} onChange={e => setTextContent(e.target.value)} rows={16} className="mt-1.5 w-full border border-[#CEE1DB] rounded-xl p-3 text-sm font-mono outline-none focus:border-[#007D68] resize-y" placeholder="1. Purpose\n2. Scope\n3. Responsibilities…" /></label>
          <label className="text-xs font-semibold text-[#638078]">العربية<textarea dir="rtl" value={textContentAr} onChange={e => setTextContentAr(e.target.value)} rows={16} className="mt-1.5 w-full border border-[#CEE1DB] rounded-xl p-3 text-sm font-mono outline-none focus:border-[#007D68] resize-y" placeholder="1. الغرض\n2. النطاق\n3. المسؤوليات…" /></label>
        </div>
        {metaErrors.text && <p className="text-xs text-red-600">{metaErrors.text}</p>}
        <button onClick={handleManualNext} className="flex items-center gap-2 px-6 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655]">{ui("Continue to metadata", "المتابعة إلى بيانات الوثيقة")}<ChevronRight size={15} /></button>
      </div>}

      {method === "pdf" && <div className="bg-white border border-[#CEE1DB] rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-[#174C42]">{ui("Upload an existing PDF document", "رفع وثيقة PDF موجودة")}</h3>
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file?.type === "application/pdf") setPdfFile(file); }} onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer ${dragging ? "border-[#007D68] bg-[#EAF6F2]" : pdfFile ? "border-emerald-400 bg-emerald-50" : "border-[#CEE1DB] hover:border-[#007D68]"}`}>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setPdfFile(file); }} />
          <FileText size={28} className="mx-auto text-[#007D68] mb-2" /><p className="text-sm font-semibold text-[#174C42]">{pdfFile?.name ?? ui("Drop a PDF here or click to browse", "اسحب ملف PDF هنا أو اضغط للاختيار")}</p>{pdfFile && <p className="text-xs text-[#638078] mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        {metaErrors.pdf && <p className="text-xs text-red-600">{metaErrors.pdf}</p>}
        <button onClick={handleManualNext} className="flex items-center gap-2 px-6 py-2.5 bg-[#007D68] text-white text-sm font-semibold rounded-xl hover:bg-[#056655]">{ui("Continue to metadata", "المتابعة إلى بيانات الوثيقة")}<ChevronRight size={15} /></button>
      </div>}

      <div className={`flex items-start gap-3 rounded-xl p-4 text-sm border ${isAdmin ? "bg-[#EAF6F2] border-[#CEE1DB]" : "bg-amber-50 border-amber-200"}`}>
        {isAdmin ? <CheckCircle size={16} className="text-[#007D68] shrink-0 mt-0.5" /> : <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />}
        <p className={isAdmin ? "text-[#174C42]" : "text-amber-800"}>{isAdmin ? ui("As an administrator, you can save the reviewed draft directly to the library.", "بصفتك مديرًا يمكنك حفظ المسودة بعد مراجعتها مباشرة في المكتبة.") : ui("Your draft will be sent to the administrator for review and approval before publication.", "ستُرسل المسودة إلى المدير للمراجعة والاعتماد قبل النشر.")}</p>
      </div>

      {justSubmitted && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm"><CheckCircle size={18} className="text-emerald-600" /><p className="text-emerald-800 font-semibold">{ui(`Submitted: ${justSubmitted}`, `تم الإرسال: ${justSubmitted}`)}</p></div>}

      {!isAdmin && <div className="space-y-3 pb-8"><h3 className="font-bold text-[#174C42]">{ui("My submissions", "طلباتي")}</h3>{mySubmissions.length === 0 ? <div className="bg-white border border-[#CEE1DB] rounded-2xl p-8 text-center text-sm text-[#638078]">{ui("No submissions yet.", "لا توجد طلبات حتى الآن.")}</div> : mySubmissions.map(submission => <div key={submission.id} className="bg-white border border-[#CEE1DB] rounded-xl p-4 flex items-center justify-between gap-3"><div><p className="font-semibold text-[#174C42] text-sm">{isRtl ? submission.policy.titleAr : submission.policy.title}</p><p className="text-xs text-[#638078] mt-1">{submission.submittedAt} · {submission.policy.documentType}</p></div><span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{submission.status.replace("_", " ")}</span></div>)}</div>}
    </div>
  );
}


// ─── App Shell ────────────────────────────────────────────────────────────────

const SCREEN_TITLES: Partial<Record<Screen, { title: string; titleAr: string; subtitle?: string; subtitleAr?: string }>> = {
  dashboard: { title: "Dashboard", titleAr: "لوحة التحكم" },
  "it-department": { title: "Information Technology", titleAr: "تقنية المعلومات", subtitle: "Department policies and procedures", subtitleAr: "سياسات وإجراءات القسم" },
  "dept-placeholder": { title: "Department", titleAr: "القسم", subtitle: "Coming soon", subtitleAr: "قريبًا" },
  "policy-library": { title: "Policy Library", titleAr: "مكتبة السياسات", subtitle: "Browse all official documents", subtitleAr: "تصفح جميع الوثائق الرسمية" },
  "policy-details": { title: "Policy Details", titleAr: "تفاصيل السياسة" },
  notifications: { title: "Notifications", titleAr: "الإشعارات" },
  "recently-viewed": { title: "Recently Viewed", titleAr: "المشاهدة مؤخرًا" },
  "required-reading": { title: "Required Reading", titleAr: "القراءة الإلزامية" },
  "saved-policies": { title: "Saved Policies", titleAr: "السياسات المحفوظة" },
  "ai-assistant": { title: "AI Policy Assistant", titleAr: "مساعد السياسات الذكي", subtitle: "Powered by official Academy documents", subtitleAr: "مدعوم بوثائق الأكاديمية الرسمية" },
  "voice-assistant": { title: "Voice Assistant", titleAr: "المساعد الصوتي", subtitle: "Bilingual real-time voice response", subtitleAr: "استجابة صوتية فورية باللغتين" },
  "version-comparison": { title: "Version Comparison", titleAr: "مقارنة الإصدارات" },
  admin: { title: "Admin Panel", titleAr: "لوحة الإدارة", subtitle: "Policy management and analytics", subtitleAr: "إدارة السياسات والتحليلات" },
  "generate-policy": { title: "Generate Policy", titleAr: "إصدار السياسات", subtitle: "Create a professional bilingual draft", subtitleAr: "إنشاء مسودة احترافية ثنائية اللغة" },
};

function AppShell({ authUser, onLogout }: { authUser: AuthUser; onLogout: () => void }) {
  const isAdmin = authUser.role === "admin";
  const canAccessGeneratePolicy = authUser.role === "admin" || authUser.role === "employee";
  // const [screen, setScreen] = useState<Screen>("dashboard");
  const [screen, setScreen] = useState<Screen>(
  authUser.role === "guest"
    ? "policy-library"
    : "dashboard"
);
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lang, setLang] = usePersistentState<Lang>("saudia-one-language", navigator.language.startsWith("ar") ? "ar" : "en");
  const [savedIds, setSavedIds] = usePersistentState<string[]>("saudia-one-saved", []);
  const [recentlyViewedIds, setRecentlyViewedIds] = usePersistentState<string[]>("saudia-one-recent", []);
  const [readConfirmations, setReadConfirmations] = usePersistentState<Record<string, string>>("saudia-one-reading", {});
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const pdfUrl = pdf1Url;
  const [managedPolicies, setManagedPolicies] = useState<Policy[]>([]);
  const [policiesLoaded, setPoliciesLoaded] = useState(false);
  const [submissions, setSubmissions] = useState<PolicySubmission[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [storedPolicies, storedSubmissions, storedNotifications] = await Promise.all([
          loadPoliciesFromStore(),
          loadSubmissionsFromStore(),
          loadNotificationsFromStore(),
        ]);
        if (!cancelled) {
          setManagedPolicies(storedPolicies as Policy[]);
          setSubmissions(storedSubmissions as PolicySubmission[]);
          setNotifications(storedNotifications as Notification[]);
          setPoliciesLoaded(true);
        }
      } catch (error) {
        console.warn("Unable to hydrate policies/submissions/notifications from database", error);
        if (!cancelled) {
          setManagedPolicies([]);
          setPoliciesLoaded(true);
        }
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!policiesLoaded) return;
    void savePoliciesToStore(managedPolicies).catch(error => console.warn("Unable to sync policies to database", error));
  }, [managedPolicies, policiesLoaded]);

  useEffect(() => {
    if (!policiesLoaded) return;
    void saveSubmissionsToStore(submissions).catch(error => console.warn("Unable to sync submissions to database", error));
  }, [submissions, policiesLoaded]);

  useEffect(() => {
    if (!policiesLoaded) return;
    void saveNotificationsToStore(notifications).catch(error => console.warn("Unable to sync notifications to database", error));
  }, [notifications, policiesLoaded]);

  function handleNewSubmission(sub: PolicySubmission) {
    const nextPolicy: Policy = {
      ...sub.policy,
      id: sub.policy.id,
      status: "published" as Policy["status"],
    };

    const nextPolicies = sub.status === "approved"
      ? (managedPolicies.some(policy => policy.id === sub.policy.id)
        ? managedPolicies.map(policy => policy.id === sub.policy.id ? nextPolicy : policy)
        : [nextPolicy, ...managedPolicies])
      : managedPolicies;

    if (sub.status === "approved") {
      setManagedPolicies(nextPolicies);
      void savePoliciesToStore(nextPolicies);
    }

    setSubmissions(prev => [sub, ...prev]);
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const methodLabel = sub.generationMethod === "ai" ? "AI" : sub.generationMethod === "text" ? "Manual Text" : "PDF Upload";
    const nextNotification = {
      id: `notif-admin-${sub.id}`,
      type: "info" as const,
      title: "New Policy Submission",
      titleAr: "طلب سياسة جديد",
      message: `${sub.submittedBy} submitted "${sub.policy.title}" for approval via ${methodLabel}.`,
      messageAr: `قدّم ${sub.submittedBy} سياسة "${sub.policy.titleAr}" للموافقة.`,
      date: today,
      read: false,
    };
    setNotifications(prev => [nextNotification, ...prev]);
    void saveSubmissionsToStore([sub, ...submissions]);
    void saveNotificationsToStore([nextNotification, ...notifications]);
  }

  function handleSubmissionAction(
    submissionId: string,
    newStatus: PolicySubmission["status"],
    note: string | undefined,
    publishStatus: Policy["status"],
  ) {
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const sub = submissions.find(s => s.id === submissionId);

    const nextSubmissions = submissions.map(s => {
      if (s.id !== submissionId) return s;
      return {
        ...s,
        status: newStatus,
        adminNote: note,
        statusHistory: [...(s.statusHistory ?? []), { status: newStatus, date: today, note }],
      };
    });
    setSubmissions(nextSubmissions);

    let nextPolicies = managedPolicies;
    if (newStatus === "approved" && sub) {
      const approvedPolicy: Policy = {
        ...sub.policy,
        id: sub.policy.id,
        status: publishStatus,
      };
      nextPolicies = [approvedPolicy, ...managedPolicies.filter(policy => policy.id !== sub.policy.id)];
      setManagedPolicies(nextPolicies);
    }

    if (sub) {
      const statusLabel =
        newStatus === "approved" ? "approved and published to the library" :
        newStatus === "rejected" ? "rejected" :
        newStatus === "under_review" ? "moved to Under Review" : "reset to Pending";
      const nextNotification = {
        id: `notif-emp-${submissionId}-${Date.now()}`,
        type: newStatus === "approved" ? "success" as const : newStatus === "rejected" ? "warning" as const : "info" as const,
        title: "Policy Status Update",
        titleAr: "تحديث حالة السياسة",
        message: `Your policy "${sub.policy.title}" has been ${statusLabel}.${note ? ` Note: ${note}` : ""}`,
        messageAr: `تم تحديث حالة سياستك "${sub.policy.titleAr}".`,
        date: today,
        read: false,
      };
      setNotifications(prev => [nextNotification, ...prev]);
      void saveNotificationsToStore([nextNotification, ...notifications]);
    }

    void saveSubmissionsToStore(nextSubmissions);
    if (newStatus === "approved" && sub) {
      void savePoliciesToStore(nextPolicies);
    }
  }

  const pendingSubmissions = submissions.filter(s => s.status === "pending").length;


  useEffect(() => {
    if (screen === "generate-policy" && !canAccessGeneratePolicy) {
      setScreen("dashboard");
      setPageParams({});
    }
  }, [screen, canAccessGeneratePolicy]);

  function navigate(s: Screen, params?: Record<string, string>) {
    setScreen(s);
    setPageParams(params ?? {});
  }

  function toggleSave(id: string) {
    setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function addRecentlyViewed(id: string) {
    setRecentlyViewedIds(prev => [id, ...prev.filter(x => x !== id)].slice(0, 20));
  }

  function confirmReading(id: string) {
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    setReadConfirmations(prev => ({ ...prev, [id]: today }));
  }

  const unreadCount = notifications.filter(n => !n.read).length + (isAdmin ? pendingSubmissions : 0);
  const info = SCREEN_TITLES[screen] ?? { title: "Saudia One", titleAr: "سعودية ون" };
  const headerTitle = lang === "ar" ? info.titleAr : info.title;
  const subtitle = screen === "notifications"
    ? (lang === "ar" ? `${unreadCount} غير مقروء` : `${unreadCount} unread`)
    : screen === "dashboard"
    ? `${authUser.name} · ${lang === "ar" ? (authUser.role === "admin" ? "مدير" : authUser.role === "academic" ? "أكاديمي" : "موظف") : authUser.role.charAt(0).toUpperCase() + authUser.role.slice(1)}`
    : (lang === "ar" ? info.subtitleAr : info.subtitle);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F8F6]">
      <Sidebar screen={screen} navigate={navigate} isAdmin={isAdmin} canAccessGeneratePolicy={canAccessGeneratePolicy} onLogout={onLogout} collapsed={collapsed} setCollapsed={setCollapsed} authUser={authUser} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} lang={lang} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={headerTitle} subtitle={subtitle} unreadCount={unreadCount} navigate={navigate} authUser={authUser} onMenuClick={() => setMobileOpen(true)} lang={lang} setLang={setLang} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {screen === "dashboard" && (
            <Dashboard lang={lang} navigate={navigate} policies={managedPolicies} recentlyViewedIds={recentlyViewedIds} authUser={authUser}  savedIds={savedIds}/>
          )}
          {screen === "it-department" && (
            <ITDepartment lang={lang} navigate={navigate} />
          )}
          {screen === "dept-placeholder" && (
            <DeptPlaceholder lang={lang} navigate={navigate} pageParams={pageParams} />
          )}
          {screen === "policy-library" && (
            <PolicyLibrary lang={lang} navigate={navigate} policies={managedPolicies} pageParams={pageParams} />
          )}
          {screen === "policy-details" && (
            <PolicyDetails
              lang={lang} navigate={navigate} policies={managedPolicies}
              savedIds={savedIds} toggleSave={toggleSave}
              recentlyViewedIds={recentlyViewedIds} addRecentlyViewed={addRecentlyViewed}
              readConfirmations={readConfirmations} confirmReading={confirmReading}
              pageParams={pageParams} pdfUrl={pdfUrl}
            />
          )}
          {screen === "notifications" && (
            <NotificationsPage
              lang={lang} navigate={navigate} notifications={notifications}
              markAllRead={() => setNotifications(n => n.map(x => ({ ...x, read: true })))}
              markRead={(id) => setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))}
            />
          )}
          {screen === "recently-viewed" && (
            <RecentlyViewed lang={lang} navigate={navigate} policies={managedPolicies} recentlyViewedIds={recentlyViewedIds} />
          )}
          {screen === "required-reading" && (
            <RequiredReading lang={lang} navigate={navigate} policies={managedPolicies} readConfirmations={readConfirmations} confirmReading={confirmReading} />
          )}
          {screen === "saved-policies" && (
            <SavedPolicies lang={lang} navigate={navigate} policies={managedPolicies} savedIds={savedIds} toggleSave={toggleSave} />
          )}
          {screen === "ai-assistant" && (
            <AIAssistant lang={lang} navigate={navigate} userKey={authUser.email || authUser.name} />
          )}
          {screen === "voice-assistant" && (
            <VoiceAssistantScreen lang={lang} navigate={navigate} />
          )}
          {screen === "version-comparison" && (
            <VersionComparison navigate={navigate} pdfUrl={pdfUrl} />
          )}
          {screen === "admin" && (
            <AdminDashboard navigate={navigate} policies={managedPolicies} setPolicies={setManagedPolicies} submissions={submissions} setSubmissions={setSubmissions} onSubmissionAction={handleSubmissionAction} />
          )}
          {screen === "generate-policy" && canAccessGeneratePolicy && (
            <GeneratePolicyScreen authUser={authUser} lang={lang} navigate={navigate} onSubmit={handleNewSubmission} mySubmissions={submissions.filter(s => s.submittedByEmail === authUser.email)} />
          )}
        </main>
      </div>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[#063F36] border-t border-white/10 flex items-center justify-around px-2 py-2">
        {[
          { key: "dashboard" as Screen, icon: <Home size={20} />, label: lang === "ar" ? "الرئيسية" : "Home" },
          { key: "policy-library" as Screen, icon: <BookOpen size={20} />, label: lang === "ar" ? "المكتبة" : "Library" },
          { key: "notifications" as Screen, icon: <Bell size={20} />, label: lang === "ar" ? "التنبيهات" : "Alerts" },
          { key: "ai-assistant" as Screen, icon: <Bot size={20} />, label: lang === "ar" ? "المساعد" : "AI" },
        ].map(item => {
          const active = screen === item.key || (item.key === "dashboard" && (screen === "it-department" || screen === "dept-placeholder"));
          return (
            <button key={item.key} onClick={() => navigate(item.key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors cursor-pointer ${active ? "text-white" : "text-white/40"}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-white/40 cursor-pointer">
          <Menu size={20} />
          <span className="text-[10px] font-medium">{lang === "ar" ? "المزيد" : "More"}</span>
        </button>
      </nav>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => loadAuthUser());

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut().catch(() => {});
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthUser(null);
  }

  if (!authUser) {
    return <LoginPage onLogin={(user) => setAuthUser(user)} />;
  }
  return <AppShell authUser={authUser} onLogout={handleLogout} />;
}
