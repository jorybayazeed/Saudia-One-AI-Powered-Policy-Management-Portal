import enterpriseRaw from "./enterpriseKnowledgeBase.json";
import arabicTranslationsRaw from "./arabicRecordTranslations.json";

export type RagLink = {
  id: string;
  label: string;
  labelAr: string;
  url: string;
  type: "website" | "email";
  recordIds: string[];
};

export type RagAnswer = {
  answer: string;
  answerAr: string;
  steps: string[];
  stepsAr: string[];
  policy: string;
  policyAr: string;
  section: string;
  page: string;
  source: string;
  isDemoMode: boolean;
  policyId?: string;
  recordIds: string[];
  retrievalGroupId?: string;
  isFallback: boolean;
  confidence: number;
  links: RagLink[];
};

export type RagConversationContext = {
  previousUserQuery?: string;
  previousAnswer?: RagAnswer | null;
};

type AnswerFields = {
  what: string;
  who: string;
  when: string;
  where: string;
  retention: string;
  target: string;
  system_or_asset: string;
  record_type: string;
  evidence: {
    record_id: string;
    section: string;
    source_page: string;
    group_id: string;
  };
};

type AtomicChunk = {
  chunkId: string;
  chunkType: "atomic";
  recordId: string;
  intent: string;
  title: string;
  denseText: string;
  sparseText: string;
  answerText: string;
  answerFields: AnswerFields;
  metadata: {
    record_id: string;
    intent: string;
    record_type: string;
    retrieval_group_id: string;
    group_title: string;
    chapter: string;
    section: string;
    source_page: string;
    system_or_asset: string;
    responsible_role: string;
    status: string;
    language: string;
    topics: string[];
    boost_exact_keyword?: number;
    boost_title?: number;
  };
};

type StructuredStep = {
  record_id: string;
  title: string;
  what: string;
  who: string;
  when: string;
  where: string;
  retention: string;
  target: string;
};

type ProcedureChunk = {
  chunkId: string;
  chunkType: "procedure";
  groupId: string;
  title: string;
  denseText: string;
  sparseText: string;
  answerText: string;
  structuredSteps: StructuredStep[];
  recordIds: string[];
  metadata: { language: string; status: string };
};

type SummaryChunk = {
  chunkId: string;
  chunkType: "summary";
  groupId: string;
  title: string;
  denseText: string;
  sparseText: string;
  answerText: string;
  recordIds: string[];
  metadata: { language: string; status: string };
};

type GroupMetadata = {
  id: string;
  title: string;
  type: string;
  chapter: string;
  section: string;
  pages: string;
  recordIds: string[];
  systems: string;
  roles: string;
  status: string;
};

type Entity = {
  id: string;
  name: string;
  type: string;
  aliases: string[];
  normalizedAliases: string[];
  recordIds: string[];
  groupIds: string[];
};

type EnterpriseKnowledgeBase = {
  manifest: {
    version: string;
    records: number;
    entities: number;
    relations: number;
    hard_negative_sets: number;
    evaluation_cases: number;
    chunks: { atomic: number; procedure: number; summary: number };
  };
  groups: GroupMetadata[];
  atomic: AtomicChunk[];
  procedure: ProcedureChunk[];
  summary: SummaryChunk[];
  entities: Entity[];
};

type Chunk = AtomicChunk | ProcedureChunk | SummaryChunk;
type ChunkType = Chunk["chunkType"];
type RequestedField = "what" | "who" | "when" | "where" | "retention" | "target" | "full_procedure" | "";
type IntentType = "lookup" | "procedure" | "responsibility" | "timing" | "location" | "retention" | "target" | "troubleshooting" | "ambiguous";

type Route = {
  intent: IntentType;
  requestedField: RequestedField;
  preferredType: ChunkType;
};

type IndexedChunk = {
  chunk: Chunk;
  id: string;
  type: ChunkType;
  groupId: string;
  titleNorm: string;
  denseNorm: string;
  sparseNorm: string;
  denseTokens: Set<string>;
  sparseTokens: string[];
  sparseTermFrequency: Map<string, number>;
  recordIds: string[];
};

const KB = enterpriseRaw as EnterpriseKnowledgeBase;
const ARABIC_TRANSLATIONS = arabicTranslationsRaw as Record<string, string>;

const POLICY_TITLE = "Information Technology Office Procedure Manual";
const POLICY_TITLE_AR = "دليل إجراءات مكتب تقنية المعلومات";
const SOURCE_LABEL = "IT OPM Enterprise RAG v3.0 · 6th Edition · Effective 21 NOV 2024";
const ABSTAIN_AR = "لم أجد إجراءً معتمدًا يغطي هذه الحالة.";
const ABSTAIN_EN = "I could not find an approved IT OPM procedure that covers this case.";
const CLARIFY_AR = "حدد النظام أو الإجراء المقصود حتى أجيبك من السجل الصحيح.";
const CLARIFY_EN = "Please specify the system or procedure so I can answer from the correct approved record.";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "what", "which", "do", "does", "i", "we", "you", "to", "for", "of", "in", "on", "and", "or", "with", "about", "please", "tell", "me",
  "ما", "ماذا", "هل", "هو", "هي", "في", "من", "على", "الى", "إلى", "عن", "او", "أو", "و", "يا", "لي", "انا", "أنا", "ابغى", "أبغى", "ابي", "أبي", "اريد", "أريد", "التي", "الذي", "هذا", "هذه", "هناك", "عند", "كل",
  "دحين", "الحين", "هالحين", "لسه", "للحين", "مره", "مرة", "ياهو", "ياهوه", "يعني", "طيب", "تمام", "لو سمحت", "ممكن",
]);

const GENERIC_TERMS = new Set([
  "سياسه", "اجراء", "دليل", "نظام", "معلومه", "معلومات", "طلب", "مشكله", "المشكله", "خدمه", "كيف", "وش", "what", "how", "policy", "procedure", "manual", "system", "request", "issue",
]);

const AMBIGUOUS_QUERIES = new Set([
  "النظام", "السيستم", "الصيانه", "منتننس", "الصلاحية", "الصلاحيه", "خدمه", "مشكله",
  "cbt", "it", "ضبط الوثائق", "maintenance", "access",
]);

const OUT_OF_SCOPE_HINTS = [
  "اجازه", "اجازة", "راتب", "رواتب", "موارد بشريه", "الموارد البشريه", "حضور وانصراف", "استقاله", "نهايه الخدمه",
  "حريق", "اخلاء", "سلامه", "السلامه", "طقس", "مطعم", "دولار", "اسنان", "سياره", "مباراه", "قصيده", "فيزا", "انفلونزا", "اعراض",
  "leave request", "salary", "human resources", "weather", "restaurant", "dentist", "car engine", "football", "visa", "influenza",
];

const COLLOQUIAL_EXPANSIONS: Array<{ terms: string[]; add: string }> = [
  { terms: ["فريش دسك", "فريشدسك", "فرش دسك", "فرشديسك", "fresh desk"], add: "Freshdesk فريش ديسك نظام التذاكر" },
  { terms: ["تكت", "تيكت", "تكيت", "تذكره", "تذكرة", "بلاغ", "بلاغ تقني"], add: "support ticket Freshdesk تذكرة دعم فني" },
  { terms: ["الباك اب", "باك اب", "باكاب", "الباكب", "باكب", "بكب", "نسخه احتياطيه", "نسخة احتياطية"], add: "backup نسخ احتياطي استعادة بيانات" },
  { terms: ["ادراك", "الإدراك", "ايدراك", "edrak"], add: "EDRAK منصة ادراك" },
  { terms: ["تي ام اس", "تيمس", "t m s", "tms"], add: "TMS Training Management System نظام ادارة التدريب" },
  { terms: ["ال ام اس", "الام اس", "l m s", "lms"], add: "LMS Learning Management System نظام ادارة التعلم" },
  { terms: ["النت", "نت", "واي فاي", "وايفاي", "يقطع", "يفصل", "بطيء", "wifi", "wi fi"], add: "internet network شبكة انترنت عطل دعم فني" },
  { terms: ["يهنق", "مهنق", "معلق", "فريز", "هنق", "stuck", "frozen"], add: "not working system failure device issue تعطل عطل" },
  { terms: ["طافي", "طاح", "خربان", "مو شغال", "ما يشتغل", "مايفتح", "ما يفتح"], add: "system failure outage not working تعطل النظام" },
  { terms: ["ابي", "ابغى", "أبي", "أبغى", "ودي", "احتاج"], add: "request need طلب" },
  { terms: ["وش اسوي", "ايش اسوي", "ماذا اسوي", "وش الحل", "ايش الحل"], add: "procedure steps action اجراء خطوات" },
  { terms: ["مين اكلم", "من اكلم", "وين اروح", "اتواصل مع مين"], add: "contact responsible support email تواصل مسؤول دعم" },
  { terms: ["باسورد", "الباسورد", "كلمه السر", "كلمة السر", "نسيت الرقم السري"], add: "password login account access كلمة مرور تسجيل دخول" },
  { terms: ["ما اقدر ادخل", "ماقدر ادخل", "الدخول ما يضبط", "login issue"], add: "login access account not working تسجيل الدخول صلاحية" },
  { terms: ["ارفع", "افتح", "اسوي", "أنشئ", "انشئ"], add: "create open raise submit انشاء فتح" },
  { terms: ["اقفل", "سكر", "اغلق", "إغلاق"], add: "close closure verify إغلاق تحقق" },
  { terms: ["raise a ticket", "submit a ticket", "open a ticket", "log a ticket", "service desk", "help desk", "helpdesk"], add: "Freshdesk support ticket IT defect request" },
  { terms: ["keeps freezing", "freezing", "freeze", "crashed", "crashing", "hangs", "hanging"], add: "device computer laptop not working stuck system failure support ticket" },
  { terms: ["wifi", "wi-fi", "keeps disconnecting", "disconnects", "no internet", "internet is slow", "network is slow"], add: "internet network outage support ticket Freshdesk" },
  { terms: ["forgot my password", "forgot password", "locked out", "cannot log in", "can't log in", "cant log in", "cannot sign in", "login problem"], add: "password account login access not working IT support ticket" },
  { terms: ["what should i do", "what do i do", "who should i contact", "where do i report"], add: "approved procedure steps responsible contact support" },
  { terms: ["تعليق الجهاز", "الجهاز ثقيل", "الجهاز بطيء", "ما يدخلني", "الحساب مقفل", "نسيت كلمه المرور", "نسيت كلمة المرور"], add: "جهاز كمبيوتر عطل تسجيل دخول كلمة مرور تذكرة دعم فني" },
  { terms: ["الواي فاي", "الشبكه تفصل", "الشبكة تفصل", "مافي نت", "ما فيه نت", "الاتصال ضعيف"], add: "شبكة انترنت عطل تذكرة دعم فني Freshdesk" },

  // Jeddah / western Saudi conversational phrasing. These phrases expand retrieval only;
  // they never become answer content and therefore cannot introduce unsupported policy facts.
  { terms: ["فين", "فين الاقي", "فين ألاقي", "فين احصل", "فين أحصل", "وريني فين", "دلني فين", "feen", "فينه"], add: "where location link portal contact أين مكان رابط بوابة تواصل" },
  { terms: ["ايش", "إيش", "اش", "وش", "esh", "eesh"], add: "what procedure information ماذا اجراء معلومات" },
  { terms: ["دحين", "الحين", "هالحين", "الان", "الآن", "daheen", "d7een"], add: "now current action procedure الآن اجراء" },
  { terms: ["مو راضي يفتح", "ماهو راضي يفتح", "ما هو راضي يفتح", "مو زابط", "مو ضابط", "ما يزبط", "ما يضبط", "ماهو شغال", "ما هو شغال", "ma yeftah", "ma yeshteghal"], add: "not working system failure outage تعطل النظام عطل" },
  { terms: ["يرميني برا", "يطلعني برا", "يخرجني", "يقفل علي", "قفل علي", "السستم قفل", "السستم قافل", "ماهو داخلني", "مو داخلني", "ماني قادر ادخل", "ماني قادر أدخل"], add: "login access account locked out cannot sign in تسجيل دخول صلاحية حساب" },
  { terms: ["ما يلقط", "ماهو لاقط", "مو لاقط", "ما يجيب نت", "النت ضعيف مره", "النت مره ضعيف", "يفصل علي", "يقطع علي", "net yefsel"], add: "internet network wifi disconnecting outage support ticket شبكة انترنت واي فاي عطل" },
  { terms: ["يهنق مره", "يعلق مره", "مره يعلق", "مره ثقيل", "ثقيل مره", "قاعد يعلق", "قاعد يهنق", "ما يتحرك", "واقف علي"], add: "computer laptop device freezing slow not working support ticket جهاز كمبيوتر عطل" },
  { terms: ["مطول", "طول مره", "ما جاني رد", "ما ردوا علي", "لسه ما انحل", "للحين ما انحل", "ما انحلت", "محد رد", "ولا احد رد"], add: "unresolved support ticket follow up escalation resolution verification تذكرة دعم متابعة تصعيد حل" },
  { terms: ["عطيني", "اعطيني", "أعطيني", "هات", "وريني", "علمني", "قول لي", "قولي", "جيب لي"], add: "provide show tell information details رابط بريد معلومات تفاصيل" },
  { terms: ["سوي لي", "سويلي", "سو لي", "ابغا اسوي", "أبغى أسوي", "ابغا ارفع", "أبغى أرفع", "abgha", "abgha asawi"], add: "create open raise submit request انشاء فتح رفع طلب" },
  { terms: ["فرش دسك", "فرشدسك", "فريش دسك", "فريشدسك", "freshdesk", "fresh desk"], add: "Freshdesk portal support ticket رابط بوابة تذكرة دعم" },
  { terms: ["تكت", "تكيت", "تيكت", "تيكيت", "ticket", "tiket"], add: "support ticket Freshdesk تذكرة دعم فني بلاغ" },
  { terms: ["ادراك مو زابط", "إدراك مو زابط", "ادراك مو راضي", "إدراك مو راضي", "ادراك طافي", "إدراك طافي"], add: "EDRAK system failure outage continuity تعطل ادراك استمرارية الاعمال" },
  { terms: ["تي ام اس مو راضي", "تي ام اس ما يفتح", "tms ma yeftah", "ال ام اس ما يفتح", "lms ma yeftah"], add: "TMS LMS system failure training platform support ticket تعطل منصة التدريب" },
];

const GROUPS = new Map(KB.groups.map(group => [group.id, group]));
const ATOMIC_BY_ID = new Map(KB.atomic.map(chunk => [chunk.recordId, chunk]));
const PROCEDURE_BY_GROUP = new Map(KB.procedure.map(chunk => [chunk.groupId, chunk]));

const APPROVED_LINKS: RagLink[] = [
  {
    id: "freshdesk-portal",
    label: "Open Freshdesk Portal",
    labelAr: "فتح بوابة Freshdesk",
    url: "https://princesultanaviationacademysaudiairlines.freshdesk.com/",
    type: "website",
    recordIds: ["REC-083"],
  },
  {
    id: "it-support-email",
    label: "Email IT Support",
    labelAr: "مراسلة دعم تقنية المعلومات",
    url: "mailto:itsupport@psaa.com.sa",
    type: "email",
    recordIds: ["REC-086", "REC-087"],
  },
  {
    id: "sales-email",
    label: "Email PSAA Sales",
    labelAr: "مراسلة مبيعات الأكاديمية",
    url: "mailto:psaasales@saudia.com",
    type: "email",
    recordIds: ["REC-132"],
  },
];

function approvedLinksFor(recordIds: string[], retrievalGroupId?: string): RagLink[] {
  const records = new Set(recordIds);
  const result = APPROVED_LINKS.filter(link => link.recordIds.some(id => records.has(id)));

  // The Freshdesk portal is the approved access reference for the Freshdesk
  // system and its troubleshooting procedure, even when the selected answer
  // cites another record from the same approved section.
  if ((retrievalGroupId === "SEC-2.5" || retrievalGroupId === "PROC-3.1") && !result.some(link => link.id === "freshdesk-portal")) {
    result.unshift(APPROVED_LINKS[0]);
  }

  // The approved TMS path-creation procedure includes a notification to
  // PSAA Sales. Show that contact whenever the selected result belongs to
  // the complete procedure, even when retrieval lands on an earlier step.
  if (retrievalGroupId === "PROC-3.2" && !result.some(link => link.id === "sales-email")) {
    result.push(APPROVED_LINKS[2]);
  }

  return result.map(link => ({ ...link, recordIds: [...link.recordIds] }));
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff@.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenVariants(token: string): string[] {
  const result = new Set([token]);
  if (/^[\u0600-\u06ff]+$/.test(token) && token.length >= 4) {
    if (token.startsWith("ال") && token.length > 4) result.add(token.slice(2));
    if (/^[وفبلك]/.test(token) && token.length > 4) result.add(token.slice(1));
    for (const suffix of ["هم", "كم", "نا", "ات", "ون", "ين", "ه", "ي"]) {
      if (token.endsWith(suffix) && token.length - suffix.length >= 3) result.add(token.slice(0, -suffix.length));
    }
  }
  return [...result];
}

function tokenize(value: string): string[] {
  const tokens = normalizeText(value)
    .split(" ")
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
  return [...new Set(tokens.flatMap(tokenVariants))];
}

function expandColloquialQuery(query: string): string {
  const q = normalizeText(query);
  const additions: string[] = [];
  for (const rule of COLLOQUIAL_EXPANSIONS) {
    if (rule.terms.some(term => q.includes(normalizeText(term)))) additions.push(rule.add);
  }
  return `${query} ${additions.join(" ")}`.trim();
}

function chunkGroupId(chunk: Chunk): string {
  return chunk.chunkType === "atomic" ? chunk.metadata.retrieval_group_id : chunk.groupId;
}

function chunkRecordIds(chunk: Chunk): string[] {
  return chunk.chunkType === "atomic" ? [chunk.recordId] : chunk.recordIds;
}

const ALL_CHUNKS: Chunk[] = [...KB.atomic, ...KB.procedure, ...KB.summary];
const INDEX: IndexedChunk[] = ALL_CHUNKS.map(chunk => {
  const sparseTokens = tokenize(chunk.sparseText);
  const sparseTermFrequency = new Map<string, number>();
  sparseTokens.forEach(token => sparseTermFrequency.set(token, (sparseTermFrequency.get(token) ?? 0) + 1));
  return {
    chunk,
    id: chunk.chunkId,
    type: chunk.chunkType,
    groupId: chunkGroupId(chunk),
    titleNorm: normalizeText(`${chunk.title} ${GROUPS.get(chunkGroupId(chunk))?.title ?? ""}`),
    denseNorm: normalizeText(chunk.denseText),
    sparseNorm: normalizeText(chunk.sparseText),
    denseTokens: new Set(tokenize(`${chunk.title} ${chunk.denseText}`)),
    sparseTokens,
    sparseTermFrequency,
    recordIds: chunkRecordIds(chunk),
  };
});

const DOCUMENT_FREQUENCY = new Map<string, number>();
for (const item of INDEX) {
  for (const token of new Set(item.sparseTokens)) {
    DOCUMENT_FREQUENCY.set(token, (DOCUMENT_FREQUENCY.get(token) ?? 0) + 1);
  }
}
const AVERAGE_DOCUMENT_LENGTH = INDEX.reduce((sum, item) => sum + item.sparseTokens.length, 0) / Math.max(1, INDEX.length);

function inverseDocumentFrequency(token: string): number {
  const n = INDEX.length;
  const df = DOCUMENT_FREQUENCY.get(token) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function fuzzyTermFrequency(token: string, item: IndexedChunk): { tf: number; factor: number; matched: string } {
  const exact = item.sparseTermFrequency.get(token) ?? 0;
  if (exact) return { tf: exact, factor: 1, matched: token };
  if (token.length < 4 || GENERIC_TERMS.has(token)) return { tf: 0, factor: 0, matched: token };
  const maxDistance = token.length >= 7 ? 2 : 1;
  let best = "";
  let bestDistance = maxDistance + 1;
  for (const candidate of item.sparseTermFrequency.keys()) {
    if (Math.abs(candidate.length - token.length) > maxDistance) continue;
    const distance = editDistance(token, candidate);
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
    if (distance === 1) break;
  }
  if (!best || bestDistance > maxDistance) return { tf: 0, factor: 0, matched: token };
  return { tf: item.sparseTermFrequency.get(best) ?? 0, factor: bestDistance === 1 ? 0.62 : 0.38, matched: best };
}

function bm25Score(queryTokens: string[], item: IndexedChunk): number {
  const k1 = 1.5;
  const b = 0.75;
  let score = 0;
  for (const token of queryTokens) {
    const match = fuzzyTermFrequency(token, item);
    if (!match.tf) continue;
    const idf = inverseDocumentFrequency(match.matched);
    const denominator = match.tf + k1 * (1 - b + b * item.sparseTokens.length / AVERAGE_DOCUMENT_LENGTH);
    score += idf * ((match.tf * (k1 + 1)) / denominator) * match.factor;
  }
  return score;
}

function denseSimilarity(queryTokens: string[], normalizedQuery: string, item: IndexedChunk): number {
  if (!queryTokens.length) return 0;
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const token of queryTokens) {
    const weight = Math.max(0.5, inverseDocumentFrequency(token));
    totalWeight += weight;
    if (item.denseTokens.has(token)) matchedWeight += weight;
    else if (token.length >= 4 && [...item.denseTokens].some(candidate => Math.abs(candidate.length - token.length) <= 1 && editDistance(token, candidate) <= 1)) matchedWeight += weight * 0.5;
  }
  const tokenOverlap = totalWeight ? matchedWeight / totalWeight : 0;
  const phraseMatch = normalizedQuery.length >= 4 && item.denseNorm.includes(normalizedQuery) ? 1 : 0;
  return tokenOverlap * 0.75 + phraseMatch * 0.25;
}

function routeQuery(query: string): Route {
  const q = normalizeText(query);
  const has = (...patterns: string[]) => patterns.some(pattern => q.includes(normalizeText(pattern)));
  const ticketContext = has("تذكره", "تذكرة", "تكت", "تيكت", "بلاغ", "freshdesk", "support ticket");
  const openContext = has("افتح", "فتح", "ارفع", "إنشاء", "انشاء", "open", "create", "raise", "email", "ايميل", "بريد");
  if (ticketContext && openContext) return { intent: "lookup", requestedField: "what", preferredType: "atomic" };
  if (has("البريد الالكتروني", "البريد الإلكتروني", "ايميل الدعم", "بريد الدعم", "support email", "email address")) return { intent: "lookup", requestedField: "what", preferredType: "atomic" };
  if (has("مين", "من المسؤول", "who is responsible", "who handles")) return { intent: "responsibility", requestedField: "who", preferredType: "atomic" };
  if (has("متى", "كم مرة", "كل متى", "how often", "when")) return { intent: "timing", requestedField: "when", preferredType: "atomic" };
  if (has("وين", "أين", "مكان", "where", "location")) return { intent: "location", requestedField: "where", preferredType: "atomic" };
  if (has("مدة الاحتفاظ", "متى نحذف", "retention")) return { intent: "retention", requestedField: "retention", preferredType: "atomic" };
  if (has("كم الهدف", "كم النسبة", "التارجت", "المستهدف", "مستهدف", "النسبة المطلوبة", "target", "threshold", "percentage")) return { intent: "target", requestedField: "target", preferredType: "atomic" };
  if (has("طاح", "ما يشتغل", "ما يفتح", "مو راضي", "مو زابط", "معلق", "يهنق", "يفصل", "يقطع", "عطل", "تعطل", "outage", "failure", "not working", "keeps disconnecting", "freezing")) return { intent: "troubleshooting", requestedField: "full_procedure", preferredType: "procedure" };
  if (has("كيف", "خطوات", "اجراء", "how do", "steps", "procedure", "process")) return { intent: "procedure", requestedField: "full_procedure", preferredType: "procedure" };
  return { intent: "lookup", requestedField: "what", preferredType: "atomic" };
}

function fieldHasValue(chunk: Chunk, requestedField: RequestedField): boolean {
  if (chunk.chunkType !== "atomic" || !requestedField || requestedField === "full_procedure") return false;
  const fields = chunk.answerFields;
  if (requestedField === "what") return Boolean(fields.what);
  return Boolean(fields[requestedField]);
}

function entityGroupBoosts(normalizedQuery: string): Map<string, number> {
  const boosts = new Map<string, number>();
  for (const entity of KB.entities) {
    let best = 0;
    for (const aliasRaw of entity.normalizedAliases) {
      const alias = normalizeText(aliasRaw);
      if (alias.length < 3 || GENERIC_TERMS.has(alias)) continue;
      const exact = normalizedQuery === alias;
      const contained = alias.includes(" ") && normalizedQuery.includes(alias);
      if (exact) best = Math.max(best, 1);
      else if (contained) best = Math.max(best, 0.6);
    }
    if (!best) continue;
    for (const groupId of entity.groupIds) boosts.set(groupId, Math.max(boosts.get(groupId) ?? 0, best));
  }
  return boosts;
}

type ScoredChunk = {
  item: IndexedChunk;
  bm25: number;
  dense: number;
  score: number;
};

function expandQuery(query: string): string {
  const colloquial = expandColloquialQuery(query);
  const q = normalizeText(colloquial);
  const additions: string[] = [];
  if (["بريد", "ايميل", "email", "mail"].some(term => q.includes(term)) && ["دعم", "support", "it"].some(term => q.includes(term))) {
    additions.push("Open Ticket by Email", "فتح تذكرة", "Freshdesk");
  }
  if (["رابط", "لينك", "بوابه", "دخول", "url", "link", "portal", "access"].some(term => q.includes(normalizeText(term)))
      && ["فريش ديسك", "freshdesk"].some(term => q.includes(normalizeText(term)))) {
    additions.push("Freshdesk Account Link", "System Access Reference", "Freshdesk URL");
  }
  if (["زمن الاستجابه", "وقت الاستجابه", "response time"].some(term => q.includes(normalizeText(term)))) {
    additions.push("Average Response Time to Support Tickets", "Within 2 working days", "KPI");
  }
  if (["متابعه التذاكر", "تابع التذاكر", "monitor tickets", "follow tickets"].some(term => q.includes(normalizeText(term)))) {
    additions.push("Follow Up and Close Old Tickets", "Freshdesk");
  }
  return `${colloquial} ${additions.join(" ")}`.trim();
}

function routingBoost(query: string, item: IndexedChunk): number {
  const q = normalizeText(query);
  const has = (...terms: string[]) => terms.some(term => q.includes(normalizeText(term)));
  const recordId = item.chunk.chunkType === "atomic" ? item.chunk.recordId : "";
  let boost = 0;
  if (has("البريد", "ايميل", "email address", "support email") && (recordId === "REC-086" || item.groupId === "SEC-2.5")) boost += recordId === "REC-086" ? 0.55 : 0.12;
  if (has("رابط", "لينك", "بوابه", "دخول", "url", "link", "portal", "access") && has("فريش ديسك", "freshdesk") && (recordId === "REC-083" || item.groupId === "SEC-2.5")) boost += recordId === "REC-083" ? 0.72 : 0.08;
  if (has("افتح", "فتح", "ارفع", "open", "create", "raise") && has("تذكره", "تذكرة", "تكت", "بلاغ", "ticket") && (recordId === "REC-086" || item.groupId === "SEC-2.5")) boost += recordId === "REC-086" ? 0.48 : 0.1;
  if (has("زمن الاستجابه", "وقت الاستجابه", "response time") && (recordId === "REC-069" || item.groupId === "SEC-2.1.1")) boost += recordId === "REC-069" ? 0.58 : 0.08;
  if (has("متابعه", "تابع", "follow", "monitor") && has("تذاكر", "تذكره", "ticket", "freshdesk") && recordId === "REC-085") boost += 0.5;
  if (has("فحص يومي", "الفحص اليومي", "daily check", "daily routine") && has("ادراك", "edrak") && item.groupId === "PROC-4.1") boost += 0.42;
  if (has("نسخ احتياطي", "backup") && has("ادراك", "edrak") && !has("شهري", "monthly") && item.groupId === "PROC-4.1") boost += 0.34;
  if (has("شهري", "monthly") && has("نسخ احتياطي", "backup") && item.groupId === "PROC-4.2") boost += 0.5;
  if (has("اغلاق", "اقفل", "حل المشكله", "close", "closure", "troubleshoot") && has("تذكره", "تكت", "ticket", "freshdesk") && item.groupId === "PROC-3.1") boost += 0.45;
  if (has("مسار", "training path") && has("انشاء", "جديد", "create", "new") && item.groupId === "PROC-3.2") boost += 0.5;
  if (has("تعطل", "طاح", "ما يشتغل", "ما يفتح", "مو راضي", "مو زابط", "طافي", "failure", "outage", "not working") && has("ادراك", "edrak") && item.groupId === "PROC-2.8") boost += 0.58;
  if (has("مطول", "ما جاني رد", "ما ردوا", "لسه ما انحل", "للحين ما انحل", "unresolved", "no response") && has("تذكره", "تكت", "تيكت", "بلاغ", "ticket", "freshdesk") && (item.groupId === "PROC-3.1" || item.groupId === "SEC-2.5")) boost += item.groupId === "PROC-3.1" ? 0.52 : 0.14;
  if (has("يرميني برا", "يطلعني", "قفل علي", "ماهو داخلني", "مو داخلني", "locked out", "cannot log in") && (item.groupId === "SEC-2.5" || item.groupId === "PROC-3.1")) boost += 0.34;
  return boost;
}


function allowedGroupsForExplicitEntities(query: string): Set<string> | null {
  const q = normalizeText(query);
  const groups = new Set<string>();
  const has = (...terms: string[]) => terms.some(term => q.includes(normalizeText(term)));
  if (has("freshdesk", "فريش ديسك", "فريشدسك", "فرش دسك", "فرشدسك")) {
    groups.add("SEC-2.5");
    groups.add("PROC-3.1");
  }
  if (has("edrak", "ادراك", "إدراك", "ايدراك")) {
    groups.add("SEC-2.7");
    groups.add("PROC-2.8");
    groups.add("PROC-4");
    groups.add("PROC-4.1");
    groups.add("FORM-5.2.1");
  }
  if (has("tms", "تي ام اس", "تيمس", "training management system")) {
    groups.add("SEC-2.6");
    groups.add("PROC-2.8");
    groups.add("PROC-3.2");
  }
  if (has("lms", "ال ام اس", "الام اس", "learning management system")) {
    groups.add("PROC-4.2");
  }
  return groups.size ? groups : null;
}

function retrieve(query: string, route: Route): ScoredChunk[] {
  const normalizedQuery = normalizeText(query);
  const expandedQuery = expandQuery(query);
  const queryTokens = tokenize(expandedQuery);
  const entityBoosts = entityGroupBoosts(normalizedQuery);

  const allowedGroups = allowedGroupsForExplicitEntities(query);
  const candidateIndex = allowedGroups ? INDEX.filter(item => allowedGroups.has(item.groupId)) : INDEX;
  const raw = candidateIndex.map(item => ({
    item,
    bm25: bm25Score(queryTokens, item),
    dense: denseSimilarity(queryTokens, normalizedQuery, item),
  }));

  const bm25Ranked = [...raw].sort((a, b) => b.bm25 - a.bm25).slice(0, 20);
  const denseRanked = [...raw].sort((a, b) => b.dense - a.dense).slice(0, 20);
  const bm25Ranks = new Map(bm25Ranked.map((entry, index) => [entry.item.id, index + 1]));
  const denseRanks = new Map(denseRanked.map((entry, index) => [entry.item.id, index + 1]));
  const maxBm25 = bm25Ranked[0]?.bm25 || 1;

  return raw.map(entry => {
    const item = entry.item;
    const rrf = (bm25Ranks.has(item.id) ? 1 / (60 + (bm25Ranks.get(item.id) ?? 20)) : 0)
      + (denseRanks.has(item.id) ? 1 / (60 + (denseRanks.get(item.id) ?? 20)) : 0);
    const bm25Normalized = entry.bm25 / maxBm25;
    const exactQuery = normalizedQuery.length >= 3 && item.sparseNorm.includes(normalizedQuery) ? 1 : 0;
    const exactTitle = normalizedQuery.length >= 3 && (item.titleNorm.includes(normalizedQuery) || normalizedQuery.includes(item.titleNorm)) ? 1 : 0;
    const preferredTypeBoost = item.type === route.preferredType ? 0.12 : 0;
    const requestedFieldBoost = fieldHasValue(item.chunk, route.requestedField) ? 0.1 : 0;
    const entityBoost = (entityBoosts.get(item.groupId) ?? 0) * 0.14;
    const activeBoost = item.chunk.metadata.status === "Active" ? 0.02 : 0;
    const score = rrf * 12 + bm25Normalized * 0.35 + entry.dense * 0.18
      + exactQuery * 0.18 + exactTitle * 0.12 + preferredTypeBoost + requestedFieldBoost + entityBoost + activeBoost
      + routingBoost(query, item);
    return { ...entry, score };
  }).sort((a, b) => b.score - a.score || b.bm25 - a.bm25);
}

function hasHighInformationMatch(queryTokens: string[], best: ScoredChunk | undefined): boolean {
  if (!best) return false;
  return queryTokens.some(token => {
    if (GENERIC_TERMS.has(token)) return false;
    const match = fuzzyTermFrequency(token, best.item);
    return Boolean(match.tf) && inverseDocumentFrequency(match.matched) >= 1.05;
  });
}

function isOutOfScope(query: string): boolean {
  const q = normalizeText(query);
  return OUT_OF_SCOPE_HINTS.some(term => q.includes(normalizeText(term)));
}

function isExplicitlyAmbiguous(query: string): boolean {
  return AMBIGUOUS_QUERIES.has(normalizeText(query));
}

function formatAtomic(chunk: AtomicChunk, lang: "en" | "ar"): string {
  const f = chunk.answerFields;
  const approvedWhat = lang === "ar" && ARABIC_TRANSLATIONS[chunk.recordId]
    ? ARABIC_TRANSLATIONS[chunk.recordId]
    : f.what || chunk.answerText;
  const details: string[] = [];
  if (f.who) details.push(lang === "ar" ? `المسؤول: ${f.who}` : `Responsible: ${f.who}`);
  if (f.when) details.push(lang === "ar" ? `التوقيت: ${f.when}` : `Timing: ${f.when}`);
  if (f.where) details.push(lang === "ar" ? `الموقع: ${f.where}` : `Location: ${f.where}`);
  if (f.retention) details.push(lang === "ar" ? `مدة الاحتفاظ: ${f.retention}` : `Retention: ${f.retention}`);
  if (f.target) details.push(lang === "ar" ? `الحد المستهدف: ${f.target}` : `Target: ${f.target}`);
  if (f.system_or_asset) details.push(lang === "ar" ? `النظام/الأصل: ${f.system_or_asset}` : `System/asset: ${f.system_or_asset}`);
  return `${approvedWhat}${details.length ? ` (${details.join("؛ ")})` : ""} [${chunk.recordId}]`;
}

function formatProcedureStep(step: StructuredStep, lang: "en" | "ar"): string {
  const body = lang === "ar" && ARABIC_TRANSLATIONS[step.record_id]
    ? ARABIC_TRANSLATIONS[step.record_id]
    : step.what;
  const details: string[] = [];
  if (step.who && !body.includes(step.who)) details.push(lang === "ar" ? `المسؤول: ${step.who}` : `Responsible: ${step.who}`);
  if (step.when) details.push(lang === "ar" ? `التوقيت: ${step.when}` : `Timing: ${step.when}`);
  if (step.where) details.push(lang === "ar" ? `الموقع: ${step.where}` : `Location: ${step.where}`);
  if (step.retention) details.push(lang === "ar" ? `مدة الاحتفاظ: ${step.retention}` : `Retention: ${step.retention}`);
  if (step.target) details.push(lang === "ar" ? `الحد المستهدف: ${step.target}` : `Target: ${step.target}`);
  return `${body}${details.length ? ` (${details.join("؛ ")})` : ""} [${step.record_id}]`;
}

function groupCitation(groupId: string, recordIds: string[]): { section: string; page: string } {
  const group = GROUPS.get(groupId);
  const atomic = recordIds.map(id => ATOMIC_BY_ID.get(id)).filter((item): item is AtomicChunk => Boolean(item));
  const pages = group?.pages || [...new Set(atomic.map(item => item.metadata.source_page).filter(Boolean))].join(", ");
  const sectionValue = group?.section ? `Section ${group.section}` : group?.chapter ? `Chapter ${group.chapter}` : groupId;
  return { section: `${sectionValue} · ${groupId}`, page: pages || "—" };
}

function atomicAnswer(chunk: AtomicChunk, confidence: number): RagAnswer {
  const groupId = chunk.metadata.retrieval_group_id;
  const citation = groupCitation(groupId, [chunk.recordId]);
  const fields = chunk.answerFields;
  const answer = fields.what || chunk.answerText;
  const answerAr = ARABIC_TRANSLATIONS[chunk.recordId] || answer;
  const steps: string[] = [];
  const stepsAr: string[] = [];
  if (fields.who) {
    steps.push(`Responsible: ${fields.who}`);
    stepsAr.push(`المسؤول: ${fields.who}`);
  }
  if (fields.when) {
    steps.push(`Timing: ${fields.when}`);
    stepsAr.push(`التوقيت: ${fields.when}`);
  }
  if (fields.where) {
    steps.push(`Location: ${fields.where}`);
    stepsAr.push(`الموقع: ${fields.where}`);
  }
  if (fields.target) {
    steps.push(`Target: ${fields.target}`);
    stepsAr.push(`الحد المستهدف: ${fields.target}`);
  }
  if (fields.retention) {
    steps.push(`Retention: ${fields.retention}`);
    stepsAr.push(`مدة الاحتفاظ: ${fields.retention}`);
  }
  return {
    answer,
    answerAr,
    steps,
    stepsAr,
    policy: POLICY_TITLE,
    policyAr: POLICY_TITLE_AR,
    section: citation.section,
    page: chunk.metadata.source_page || citation.page,
    source: SOURCE_LABEL,
    isDemoMode: false,
    policyId: "p-it-opm",
    recordIds: [chunk.recordId],
    retrievalGroupId: groupId,
    isFallback: false,
    confidence,
    links: approvedLinksFor([chunk.recordId], groupId),
  };
}

function procedureAnswer(chunk: ProcedureChunk, confidence: number): RagAnswer {
  const group = GROUPS.get(chunk.groupId);
  const citation = groupCitation(chunk.groupId, chunk.recordIds);
  return {
    answer: `The complete approved procedure “${group?.title ?? chunk.groupId}” is shown below in its recorded order.`,
    answerAr: `الإجراء المعتمد الكامل «${group?.title ?? chunk.groupId}» موضح أدناه بالترتيب المسجل.`,
    steps: chunk.structuredSteps.map(step => formatProcedureStep(step, "en")),
    stepsAr: chunk.structuredSteps.map(step => formatProcedureStep(step, "ar")),
    policy: POLICY_TITLE,
    policyAr: POLICY_TITLE_AR,
    section: citation.section,
    page: citation.page,
    source: SOURCE_LABEL,
    isDemoMode: false,
    policyId: "p-it-opm",
    recordIds: chunk.recordIds,
    retrievalGroupId: chunk.groupId,
    isFallback: false,
    confidence,
    links: approvedLinksFor(chunk.recordIds, chunk.groupId),
  };
}

function summaryAnswer(chunk: SummaryChunk, confidence: number): RagAnswer {
  const records = chunk.recordIds
    .map(id => ATOMIC_BY_ID.get(id))
    .filter((item): item is AtomicChunk => Boolean(item))
    .slice(0, 6);
  const group = GROUPS.get(chunk.groupId);
  const citation = groupCitation(chunk.groupId, records.map(item => item.recordId));
  return {
    answer: `Approved information was found under “${group?.title ?? chunk.groupId}”.`,
    answerAr: `تم العثور على معلومات معتمدة ضمن «${group?.title ?? chunk.groupId}».`,
    steps: records.map(record => formatAtomic(record, "en")),
    stepsAr: records.map(record => formatAtomic(record, "ar")),
    policy: POLICY_TITLE,
    policyAr: POLICY_TITLE_AR,
    section: citation.section,
    page: citation.page,
    source: SOURCE_LABEL,
    isDemoMode: false,
    policyId: "p-it-opm",
    recordIds: records.map(item => item.recordId),
    retrievalGroupId: chunk.groupId,
    isFallback: false,
    confidence,
    links: approvedLinksFor(records.map(item => item.recordId), chunk.groupId),
  };
}

function makeFallback(_lang: "en" | "ar", clarification = false): RagAnswer {
  return {
    answer: clarification ? CLARIFY_EN : ABSTAIN_EN,
    answerAr: clarification ? CLARIFY_AR : ABSTAIN_AR,
    steps: [],
    stepsAr: [],
    policy: POLICY_TITLE,
    policyAr: POLICY_TITLE_AR,
    section: clarification ? "Clarification required" : "No approved match",
    page: "—",
    source: SOURCE_LABEL,
    isDemoMode: false,
    recordIds: [],
    isFallback: true,
    confidence: 0,
    links: [],
  };
}


function includesAny(normalizedQuery: string, terms: string[]): boolean {
  return terms.some(term => normalizedQuery.includes(normalizeText(term)));
}

function customRecordsAnswer(options: {
  answer: string;
  answerAr: string;
  recordIds: string[];
  groupId: string;
  confidence?: number;
  section?: string;
  page?: string;
  links?: RagLink[];
  steps?: string[];
  stepsAr?: string[];
}): RagAnswer {
  const records = options.recordIds
    .map(id => ATOMIC_BY_ID.get(id))
    .filter((record): record is AtomicChunk => Boolean(record));
  const citation = groupCitation(options.groupId, options.recordIds);
  return {
    answer: options.answer,
    answerAr: options.answerAr,
    steps: options.steps ?? records.map(record => formatAtomic(record, "en")),
    stepsAr: options.stepsAr ?? records.map(record => formatAtomic(record, "ar")),
    policy: POLICY_TITLE,
    policyAr: POLICY_TITLE_AR,
    section: options.section ?? citation.section,
    page: options.page ?? citation.page,
    source: SOURCE_LABEL,
    isDemoMode: false,
    policyId: "p-it-opm",
    recordIds: options.recordIds,
    retrievalGroupId: options.groupId,
    isFallback: false,
    confidence: options.confidence ?? 1,
    links: options.links ?? approvedLinksFor(options.recordIds, options.groupId),
  };
}

function makeSpecificClarification(answer: string, answerAr: string): RagAnswer {
  const result = makeFallback("ar", true);
  result.answer = answer;
  result.answerAr = answerAr;
  return result;
}

function contextFieldAnswer(query: string, context?: RagConversationContext): RagAnswer | null {
  const previous = context?.previousAnswer;
  if (!previous || !previous.recordIds.length) return null;
  const q = normalizeText(query);
  const asksWho = includesAny(q, ["مين", "من المسؤول", "المسؤول", "who", "responsible"]);
  const asksWhen = includesAny(q, ["متى", "التوقيت", "كم مره", "كل متى", "when", "timing", "how often"]);
  const asksWhere = includesAny(q, ["وين", "اين", "الموقع", "مكان", "where", "location"]);
  const asksTarget = includesAny(q, ["المستهدف", "الهدف", "النسبه", "target", "threshold", "percentage"]);
  const field: keyof Pick<AnswerFields, "who" | "when" | "where" | "target"> | "" = asksWho
    ? "who"
    : asksWhen
      ? "when"
      : asksWhere
        ? "where"
        : asksTarget
          ? "target"
          : "";
  if (!field) return null;
  const matching = previous.recordIds
    .map(id => ATOMIC_BY_ID.get(id))
    .filter((record): record is AtomicChunk => Boolean(record?.answerFields[field]));
  if (!matching.length) return null;
  const values = [...new Set(matching.map(record => record.answerFields[field]).filter(Boolean))];
  const labels = {
    who: ["Responsible", "المسؤول"],
    when: ["Timing", "التوقيت"],
    where: ["Location", "الموقع"],
    target: ["Target", "الحد المستهدف"],
  } as const;
  return customRecordsAnswer({
    answer: `${labels[field][0]}: ${values.join("; ")}.`,
    answerAr: `${labels[field][1]}: ${values.join("، ")}.`,
    recordIds: matching.map(record => record.recordId),
    groupId: previous.retrievalGroupId ?? matching[0].metadata.retrieval_group_id,
    steps: [],
    stepsAr: [],
  });
}

function directApprovedAnswer(query: string, context?: RagConversationContext): RagAnswer | null {
  const q = normalizeText(query);
  const previousGroup = context?.previousAnswer?.retrievalGroupId ?? "";
  const previousRecords = new Set(context?.previousAnswer?.recordIds ?? []);
  const contextFreshdesk = previousGroup === "SEC-2.5" || previousGroup === "PROC-3.1"
    || [...previousRecords].some(id => ["REC-079", "REC-080", "REC-081", "REC-082", "REC-083", "REC-084", "REC-085", "REC-086", "REC-087"].includes(id));
  const contextTmsPath = previousGroup === "PROC-3.2";
  const contextEdrak = previousGroup === "SEC-2.7" || previousGroup === "PROC-2.8" || previousGroup === "PROC-4.1";

  const explicitFreshdesk = includesAny(q, ["freshdesk", "fresh desk", "فريش ديسك", "فريشدسك", "فرش دسك", "فرشدسك"]);
  const explicitEdrak = includesAny(q, ["edrak", "ادراك", "إدراك", "ايدراك"]);
  const explicitTms = includesAny(q, ["tms", "تي ام اس", "تيمس", "training management system"]);
  const explicitLms = includesAny(q, ["lms", "ال ام اس", "الام اس", "learning management system"]);
  const ticketContext = explicitFreshdesk || contextFreshdesk || includesAny(q, [
    "تذكره", "تذكرة", "تكت", "تيكت", "تكيت", "بلاغ", "support ticket", "it ticket", "ticket", "helpdesk", "service desk",
  ]);
  const asksLink = includesAny(q, ["رابط", "لينك", "بوابه", "بوابة", "url", "link", "portal"]);
  const asksEmail = includesAny(q, ["بريد", "ايميل", "الايميل", "البريد الالكتروني", "email", "mail"]);
  const asksWho = includesAny(q, ["مين", "من المسؤول", "المسؤول", "who", "responsible"]);
  const asksWhen = includesAny(q, ["متى", "التوقيت", "كم مره", "كل متى", "when", "timing", "how often"]);
  const asksProcedure = includesAny(q, ["كيف", "خطوات", "اجراء", "الإجراء", "procedure", "steps", "process", "how do", "how is"]);
  const asksOpen = includesAny(q, ["افتح", "فتح", "ارفع", "رفع", "اسوي", "أنشئ", "انشئ", "open", "raise", "submit", "create", "log"]);
  const asksFollow = includesAny(q, ["اتابع", "متابعه", "متابعة", "تابع", "حاله التذكره", "حالة التذكرة", "follow", "track", "status", "monitor"]);
  const asksClose = includesAny(q, ["اغلاق", "إغلاق", "اقفل", "يقفل", "close", "closure", "closing"]);
  const asksResponseTime = includesAny(q, [
    "زمن الاستجابه", "وقت الاستجابه", "مدة الاستجابه", "كم ياخذ", "كم يستغرق", "متى يرد", "متى يردوا", "متى يجيني رد",
    "response time", "how long", "when will they reply", "when do they respond",
  ]) || (includesAny(q, ["استجابه", "استجابة", "response", "reply"]) && includesAny(q, ["زمن", "وقت", "مده", "مدة", "مستهدف", "target", "time"]));
  const noResponse = includesAny(q, [
    "ما جاني رد", "ما ردوا", "محد رد", "ولا احد رد", "البلاغ مطول", "التذكره مطوله", "التذكرة مطولة", "no response", "no reply", "still waiting",
  ]);
  const unresolved = includesAny(q, [
    "لم يتم حل", "لم تحل", "ما انحلت", "ما انحل", "لسه ما انحل", "للحين ما انحل", "غير محلوله", "غير محلولة",
    "not fixed", "not resolved", "unresolved", "still not working", "ticket has not been resolved",
  ]);
  const issueContext = includesAny(q, [
    "فاصل", "يفصل", "يقطع", "بطيء", "ثقيل", "معلق", "يعلق", "يهنق", "خربان", "طافي", "ما يشتغل", "ما تشتغل", "مو شغال", "مو شغاله", "مو شغالة", "ما يفتح", "مو راضي", "مو زابط", "لا يعمل", "تعطل", "عطل", "مشكله", "مشكلة",
    "لا استطيع", "ما اقدر", "down", "not working", "stuck", "issue", "problem", "cannot", "can't", "cant", "freeze", "freezing", "frozen", "crash", "crashed", "hang", "hanging", "disconnect", "disconnecting", "slow", "locked out", "forgot",
  ]);
  const asksEmailAddress = asksEmail && (!issueContext || includesAny(q, [
    "ايميل الدعم", "بريد الدعم", "البريد المعتمد", "البريد الالكتروني المعتمد", "عنوان البريد", "عطيني الايميل", "اعطيني الايميل",
    "support email", "email address", "approved email", "contact email", "what is the email",
  ]));

  const commonItAsset = includesAny(q, [
    "النت", "انترنت", "الانترنت", "الشبكه", "الشبكة", "الجهاز", "كمبيوتر", "الكمبيوتر", "لابتوب", "اللابتوب", "الطابعه", "الطابعة", "البريد", "الايميل", "ملفات مشتركه", "تسجيل الدخول", "ادخل", "دخول", "باسورد", "كلمه مرور", "كلمة مرور",
    "network", "internet", "computer", "device", "laptop", "printer", "email", "shared files", "login", "log in", "sign in", "password", "account", "wifi", "wi fi", "wi-fi", "system",
  ]);
  const backupContext = includesAny(q, ["نسخ احتياطي", "النسخ الاحتياطي", "باك اب", "باكاب", "باكب", "الباكب", "backup"]);
  const dailyContext = includesAny(q, ["يومي", "اليومي", "كل يوم", "daily"]);
  const monthlyContext = includesAny(q, ["شهري", "الشهري", "كل شهر", "monthly"]);
  const backupServerContext = includesAny(q, ["الخادم الاحتياطي", "سيرفر احتياطي", "backup server"])
    || (includesAny(q, ["backup", "احتياطي"]) && includesAny(q, ["server", "خادم", "سيرفر"]));
  const newPathContext = explicitTms && includesAny(q, ["مسار", "path", "learning path", "training path"])
    && includesAny(q, ["جديد", "انشاء", "إنشاء", "اضيف", "أضيف", "ابني", "create", "new", "build", "add"]);

  // TMS notification contact is not the submission channel. Keep this before generic email handling.
  if (asksEmail && (explicitTms || contextTmsPath) && includesAny(q, ["مسار", "path", "انشاء", "إنشاء", "جديد", "new"])) {
    return customRecordsAnswer({
      answer: "A new-path request is submitted by the Training Department through Freshdesk. After the path is created, the IT Specialist sends the approved notification to psaasales@saudia.com and copies the Training Department.",
      answerAr: "يُقدَّم طلب إنشاء المسار من إدارة التدريب عبر Freshdesk. وبعد إنشاء المسار، يرسل أخصائي تقنية المعلومات الإشعار المعتمد إلى psaasales@saudia.com مع إضافة إدارة التدريب في نسخة الرسالة.",
      recordIds: ["REC-122", "REC-132", "REC-133"],
      groupId: "PROC-3.2",
      steps: ["Submit the request through Freshdesk.", "After creation, notify psaasales@saudia.com and copy the Training Department."],
      stepsAr: ["يبدأ الطلب عبر Freshdesk.", "بعد الإنشاء، يُرسل الإشعار إلى psaasales@saudia.com مع إضافة إدارة التدريب في نسخة الرسالة."],
      links: approvedLinksFor(["REC-083", "REC-132"], "PROC-3.2"),
    });
  }

  if (asksLink && (explicitFreshdesk || ticketContext || contextFreshdesk)) {
    return customRecordsAnswer({
      answer: "Use the approved Freshdesk portal link below.",
      answerAr: "استخدم رابط بوابة Freshdesk المعتمد أدناه.",
      recordIds: ["REC-083"],
      groupId: "SEC-2.5",
      steps: [],
      stepsAr: [],
      links: approvedLinksFor(["REC-083"], "SEC-2.5"),
    });
  }

  if (asksEmailAddress && !explicitTms) {
    return customRecordsAnswer({
      answer: "The approved IT support email is itsupport@psaa.com.sa. Sending an email creates a Freshdesk ticket automatically, and the requester receives the ticket number.",
      answerAr: "البريد المعتمد لدعم تقنية المعلومات هو itsupport@psaa.com.sa. عند إرسال البريد، ينشئ Freshdesk التذكرة تلقائيًا ويرسل رقمها إلى مقدم الطلب.",
      recordIds: ["REC-086", "REC-087"],
      groupId: "SEC-2.5",
      steps: ["Send the issue to itsupport@psaa.com.sa.", "Freshdesk creates the ticket and replies with its number."],
      stepsAr: ["أرسل تفاصيل المشكلة إلى itsupport@psaa.com.sa.", "ينشئ Freshdesk التذكرة ويرسل رقمها تلقائيًا."],
    });
  }

  if (asksResponseTime || (contextFreshdesk && asksWhen && includesAny(q, ["يرد", "رد", "reply", "respond"]))) {
    return customRecordsAnswer({
      answer: "The approved target is a response within two working days from ticket creation.",
      answerAr: "الزمن المستهدف المعتمد للاستجابة هو خلال يومي عمل من وقت إنشاء التذكرة.",
      recordIds: ["REC-069"],
      groupId: "SEC-2.1.1",
      steps: ["Measured from ticket creation.", "Responsible role: IT Specialist."],
      stepsAr: ["يُقاس الزمن من وقت إنشاء التذكرة.", "المسؤول: أخصائي تقنية المعلومات."],
      links: approvedLinksFor(["REC-083", "REC-086"], "SEC-2.5"),
    });
  }

  if (noResponse && ticketContext) {
    return customRecordsAnswer({
      answer: "The response-time target is within two working days from ticket creation. IT Specialists are required to continuously monitor, follow, and close tickets in Freshdesk.",
      answerAr: "الزمن المستهدف للاستجابة هو خلال يومي عمل من إنشاء التذكرة، وعلى أخصائيي تقنية المعلومات متابعة التذاكر في Freshdesk باستمرار وإغلاقها بعد المعالجة.",
      recordIds: ["REC-069", "REC-084", "REC-085"],
      groupId: "SEC-2.5",
      steps: ["Check the ticket through Freshdesk.", "Use the ticket number received from Freshdesk when following up."],
      stepsAr: ["تابع التذكرة عبر Freshdesk.", "استخدم رقم التذكرة الذي أرسله Freshdesk عند المتابعة."],
    });
  }

  if (unresolved) {
    return customRecordsAnswer({
      answer: "If the problem is not fixed, the approved Freshdesk procedure returns to identifying the cause, determining and applying a solution, and confirming the fix. The ticket is updated and closed only after the problem is fixed.",
      answerAr: "إذا لم تُحل المشكلة، يعود الإجراء المعتمد إلى تحديد السبب، ثم تحديد الحل وتطبيقه والتحقق من نجاح الإصلاح. لا تُحدَّث التذكرة وتُغلق إلا بعد التأكد من حل المشكلة.",
      recordIds: ["REC-119", "REC-115", "REC-116", "REC-117", "REC-118", "REC-121"],
      groupId: "PROC-3.1",
      steps: ["Identify the cause again.", "Determine and apply the solution.", "Confirm that the problem is fixed.", "Update and close the ticket only after confirmation."],
      stepsAr: ["أعد تحديد سبب المشكلة.", "حدد الحل وطبّقه.", "تحقق من أن المشكلة حُلّت.", "حدّث التذكرة وأغلقها بعد التأكد فقط."],
    });
  }

  if (ticketContext && asksOpen) {
    return customRecordsAnswer({
      answer: "Open the support request through the approved Freshdesk portal or email itsupport@psaa.com.sa. Freshdesk creates the ticket automatically and replies with the ticket number.",
      answerAr: "افتح طلب الدعم عبر بوابة Freshdesk المعتمدة أو أرسل بريدًا إلى itsupport@psaa.com.sa. ينشئ Freshdesk التذكرة تلقائيًا ويرسل رقمها إليك.",
      recordIds: ["REC-083", "REC-086", "REC-087"],
      groupId: "SEC-2.5",
      steps: ["Open the Freshdesk portal or email IT Support.", "Describe the technical issue.", "Keep the ticket number sent by Freshdesk for follow-up."],
      stepsAr: ["افتح بوابة Freshdesk أو راسل دعم تقنية المعلومات.", "اكتب تفاصيل المشكلة التقنية.", "احتفظ برقم التذكرة الذي يرسله Freshdesk للمتابعة."],
    });
  }

  if (ticketContext && asksWho && (asksFollow || includesAny(q, ["متابعه التذاكر", "متابعة التذاكر", "تذاكر جديده", "تذاكر جديدة", "monitor tickets", "new tickets"]))) {
    return customRecordsAnswer({
      answer: "IT Specialists are responsible for continuously monitoring newly opened Freshdesk tickets and following and closing old tickets.",
      answerAr: "أخصائيو تقنية المعلومات مسؤولون عن متابعة تذاكر Freshdesk الجديدة باستمرار، ومتابعة التذاكر القديمة وإغلاقها بعد المعالجة.",
      recordIds: ["REC-084", "REC-085"],
      groupId: "SEC-2.5",
      steps: [],
      stepsAr: [],
    });
  }

  if (ticketContext && asksFollow && !asksClose) {
    return customRecordsAnswer({
      answer: "Follow the ticket in Freshdesk using the ticket number sent to you. IT Specialists are required to continuously monitor new tickets and follow and close old tickets.",
      answerAr: "تابع التذكرة في Freshdesk باستخدام رقم التذكرة المرسل إليك. ويلتزم أخصائيو تقنية المعلومات بمتابعة التذاكر الجديدة والقديمة باستمرار وإغلاقها بعد المعالجة.",
      recordIds: ["REC-084", "REC-085", "REC-087"],
      groupId: "SEC-2.5",
      steps: [],
      stepsAr: [],
    });
  }

  if (ticketContext && (asksClose || (asksProcedure && asksFollow))) {
    const procedure = PROCEDURE_BY_GROUP.get("PROC-3.1");
    if (procedure) return procedureAnswer(procedure, 1);
  }

  if ((explicitEdrak || contextEdrak) && backupServerContext && (asksWhen || includesAny(q, ["استخدم", "تحويل", "احول", "switch", "use"]))) {
    return customRecordsAnswer({
      answer: "For EDRAK, switch immediately to the backup server if troubleshooting takes more than one day. Return to the main EDRAK server after the problem is fixed.",
      answerAr: "في نظام EDRAK، يتم التحويل فورًا إلى الخادم الاحتياطي إذا استغرق استكشاف العطل أكثر من يوم واحد، ثم تتم العودة إلى الخادم الرئيسي بعد حل المشكلة.",
      recordIds: ["REC-109", "REC-110"],
      groupId: "PROC-2.8",
      steps: [],
      stepsAr: [],
    });
  }

  if (backupContext && asksWho) {
    return customRecordsAnswer({
      answer: "The approved EDRAK daily backup and LMS monthly backup records assign the work to the IT Specialist.",
      answerAr: "تُسند سجلات النسخ الاحتياطي اليومي لـEDRAK والنسخ الشهري لـLMS إلى أخصائي تقنية المعلومات.",
      recordIds: ["REC-151", "REC-159", "REC-160"],
      groupId: explicitLms ? "PROC-4.2" : "PROC-4.1",
      steps: [],
      stepsAr: [],
    });
  }

  if (backupContext && (explicitLms || monthlyContext)) {
    const procedure = PROCEDURE_BY_GROUP.get("PROC-4.2");
    if (procedure) return procedureAnswer(procedure, 1);
  }

  if (backupContext && (explicitEdrak || dailyContext)) {
    return customRecordsAnswer({
      answer: "The approved daily EDRAK backup steps are shown below.",
      answerAr: "خطوات النسخ الاحتياطي اليومي المعتمدة لنظام EDRAK موضحة أدناه.",
      recordIds: ["REC-151", "REC-152", "REC-153", "REC-154", "REC-155", "REC-156", "REC-157"],
      groupId: "PROC-4.1",
      steps: [
        "Conduct the EDRAK data backup.",
        "Log in to the SQL virtual machine from the H1 server.",
        "Open the two MSSQL backup scripts on the C drive.",
        "Change the backup file name to the current date.",
        "Run the backup script.",
        "Copy the backup files to the H3 SQL virtual machine.",
        "Copy the backup files to the external hard drive.",
      ],
      stepsAr: [
        "نفّذ النسخ الاحتياطي لبيانات EDRAK.",
        "سجّل الدخول إلى جهاز SQL الافتراضي من خادم H1.",
        "افتح نصّي النسخ الاحتياطي باستخدام MSSQL من القرص C.",
        "غيّر اسم ملف النسخ في النص البرمجي إلى تاريخ اليوم.",
        "شغّل نص النسخ الاحتياطي.",
        "انسخ ملفات النسخ إلى جهاز SQL الافتراضي H3.",
        "انسخ ملفات النسخ إلى القرص الصلب الخارجي.",
      ],
    });
  }

  if (backupContext && !explicitEdrak && !explicitLms && !dailyContext && !monthlyContext) {
    return makeSpecificClarification(
      "Please specify whether you mean the daily EDRAK backup or the monthly LMS backup.",
      "حدد هل تقصد النسخ الاحتياطي اليومي لنظام EDRAK أم النسخ الاحتياطي الشهري لنظام LMS.",
    );
  }

  if (newPathContext) {
    const procedure = PROCEDURE_BY_GROUP.get("PROC-3.2");
    if (procedure) return procedureAnswer(procedure, 1);
  }

  if (issueContext && includesAny(q, ["منصه التدريب", "منصة التدريب", "training platform"]) && !explicitTms && !explicitLms) {
    return makeSpecificClarification(
      "Please specify whether the training-platform issue is in TMS or LMS.",
      "حدد هل المشكلة في نظام TMS أم LMS حتى أستخدم السجل المعتمد الصحيح.",
    );
  }

  if (issueContext && (explicitEdrak || explicitTms)) {
    const procedure = PROCEDURE_BY_GROUP.get("PROC-2.8");
    if (procedure) {
      const answer = procedureAnswer(procedure, 1);
      if (explicitEdrak) {
        answer.answer = "Apply the approved system-failure and business-continuity procedure. For EDRAK, switch to the backup server if troubleshooting takes more than one day.";
        answer.answerAr = "طبّق إجراء تعطل الأنظمة واستمرارية الأعمال المعتمد. وبالنسبة إلى EDRAK، يتم التحويل إلى الخادم الاحتياطي إذا استغرق استكشاف العطل أكثر من يوم واحد.";
      } else {
        answer.answer = "Apply the approved system-failure and business-continuity procedure shown below.";
        answer.answerAr = "طبّق إجراء تعطل الأنظمة واستمرارية الأعمال المعتمد الموضح أدناه.";
      }
      return answer;
    }
  }

  if (issueContext && (commonItAsset || explicitLms) && !explicitEdrak && !explicitTms) {
    return customRecordsAnswer({
      answer: "The manual does not provide repair steps for this exact device, network, login, or LMS symptom. The approved action is to open an IT defect ticket through Freshdesk or email itsupport@psaa.com.sa.",
      answerAr: "لا يورد الدليل خطوات إصلاح فنية لهذا العطل المحدد في الجهاز أو الشبكة أو تسجيل الدخول أو LMS. الإجراء المعتمد هو فتح تذكرة عطل عبر Freshdesk أو مراسلة itsupport@psaa.com.sa.",
      recordIds: ["REC-080", "REC-086", "REC-087"],
      groupId: "SEC-2.5",
      steps: ["Describe the symptom in the ticket.", "Keep the ticket number for follow-up."],
      stepsAr: ["اكتب وصف العطل في التذكرة.", "احتفظ برقم التذكرة للمتابعة."],
    });
  }

  const definitionQuestion = includesAny(q, ["ما هو", "ماهي", "ما هي", "what is", "define", "اش يعني", "ايش هو"]);
  if (definitionQuestion && explicitFreshdesk) {
    return customRecordsAnswer({
      answer: "Freshdesk is the Academy's cloud-based system for receiving, following, and managing IT defect tickets.",
      answerAr: "Freshdesk هو النظام السحابي المعتمد في الأكاديمية لاستقبال تذاكر أعطال تقنية المعلومات ومتابعتها وإدارتها.",
      recordIds: ["REC-079", "REC-080"],
      groupId: "SEC-2.5",
      steps: [],
      stepsAr: [],
    });
  }
  if (definitionQuestion && explicitTms) {
    return customRecordsAnswer({
      answer: "TMS is cloud-based software used by Saudia Academy to manage training processes.",
      answerAr: "TMS هو نظام سحابي تستخدمه الأكاديمية لإدارة عمليات التدريب.",
      recordIds: ["REC-092"],
      groupId: "SEC-2.6",
      steps: [],
      stepsAr: [],
    });
  }
  if (definitionQuestion && explicitEdrak) {
    return customRecordsAnswer({
      answer: "EDRAK is the platform used for Saudia Academy CBT learning activities.",
      answerAr: "EDRAK هو المنصة المستخدمة لأنشطة التعلم المعتمدة على الحاسب في الأكاديمية.",
      recordIds: ["REC-102"],
      groupId: "SEC-2.7",
      steps: [],
      stepsAr: [],
    });
  }

  if (context?.previousAnswer && includesAny(q, ["اختصر", "اختصرها", "باختصار", "summary", "summarize", "short answer"])) {
    return { ...context.previousAnswer, steps: [], stepsAr: [], confidence: 1 };
  }

  if (context?.previousAnswer?.retrievalGroupId && includesAny(q, ["الخطوات كامله", "الخطوات كاملة", "التفاصيل كامله", "التفاصيل كاملة", "full steps", "complete procedure", "all steps"])) {
    const procedure = PROCEDURE_BY_GROUP.get(context.previousAnswer.retrievalGroupId);
    if (procedure) return procedureAnswer(procedure, 1);
  }

  const contextual = contextFieldAnswer(query, context);
  if (contextual) return contextual;

  if (asksLink && !explicitFreshdesk && !contextFreshdesk) {
    return makeSpecificClarification("Please specify which system link you need.", "حدد رابط أي نظام تقصد.");
  }

  return null;
}

export function getSuggestedQuestions(lang: "en" | "ar"): string[] {
  return lang === "ar"
    ? [
        "كيف أفتح تذكرة دعم فني عبر Freshdesk؟",
        "من المسؤول عن متابعة تذاكر Freshdesk؟",
        "ماذا أفعل إذا تعطل نظام EDRAK؟",
        "ما خطوات الفحص اليومي والنسخ الاحتياطي لنظام EDRAK؟",
        "كيف يتم إنشاء مسار تدريبي جديد في TMS؟",
        "ما زمن الاستجابة المستهدف لتذاكر الدعم؟",
      ]
    : [
        "How do I open an IT support ticket through Freshdesk?",
        "Who is responsible for monitoring Freshdesk tickets?",
        "What should I do if EDRAK fails?",
        "What are the daily EDRAK check and backup steps?",
        "How is a new training path created in TMS?",
        "What is the target response time for support tickets?",
      ];
}

export async function askITKnowledgeBase(query: string, lang: "en" | "ar", context?: RagConversationContext): Promise<RagAnswer> {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(expandQuery(query));
  if (!normalizedQuery || !queryTokens.length || isOutOfScope(query)) return makeFallback(lang);

  const directAnswer = directApprovedAnswer(query, context);
  if (directAnswer) return directAnswer;

  if (isExplicitlyAmbiguous(query)) return makeFallback(lang, true);

  const route = routeQuery(query);
  const ranked = retrieve(query, route);
  const best = ranked[0];
  const secondDifferentGroup = ranked.find(item => item.item.groupId !== best?.item.groupId);
  if (!best || !hasHighInformationMatch(queryTokens, best)) return makeFallback(lang);

  const margin = best.score - (secondDifferentGroup?.score ?? 0);
  const shortBroadQuery = queryTokens.length <= 2 && margin < 0.065;
  if (shortBroadQuery) return makeFallback(lang, true);

  // Scores are deterministic fusion values, not model probabilities.
  const confidence = Math.max(0, Math.min(1, (best.score - 0.25) / 0.65));
  if (best.score < 0.42) return makeFallback(lang);

  let selected = best.item.chunk;
  if ((route.intent === "procedure" || route.intent === "troubleshooting") && selected.chunkType !== "procedure") {
    selected = PROCEDURE_BY_GROUP.get(best.item.groupId) ?? selected;
  }

  if (selected.chunkType === "atomic") return atomicAnswer(selected, confidence);
  if (selected.chunkType === "procedure") return procedureAnswer(selected, confidence);
  return summaryAnswer(selected, confidence);
}

export const IT_KNOWLEDGE_STATS = {
  groups: KB.groups.length,
  records: KB.manifest.records,
  atomicChunks: KB.manifest.chunks.atomic,
  procedureChunks: KB.manifest.chunks.procedure,
  summaryChunks: KB.manifest.chunks.summary,
  entities: KB.manifest.entities,
  relations: KB.manifest.relations,
  evaluationCases: KB.manifest.evaluation_cases,
  edition: "6th Edition",
  effectiveDate: "21 NOV 2024",
  packageVersion: KB.manifest.version,
};
