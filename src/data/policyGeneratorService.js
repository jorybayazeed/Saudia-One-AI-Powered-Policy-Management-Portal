const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? "";
const OPENAI_ENDPOINT = import.meta.env.VITE_OPENAI_ENDPOINT?.replace(/\/$/, "") ?? "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL ?? "gpt-4o-mini";
const IT_OPM = (title, titleAr, groupId, page, recordIds) => ({
    title, titleAr, groupId, page, recordIds,
});
const TOPICS = [
    {
        id: "support-ticket",
        terms: ["freshdesk", "ticket", "helpdesk", "support", "تذكره", "تذكرة", "تكت", "تيكت", "بلاغ", "دعم فني", "فريش ديسك", "فريشدسك"],
        title: "IT Support Ticket Management Policy",
        titleAr: "سياسة إدارة تذاكر الدعم الفني",
        purpose: "establish a controlled and traceable method for receiving, classifying, assigning, resolving, verifying, escalating, and closing information-technology support requests",
        purposeAr: "وضع منهجية منضبطة وقابلة للتتبع لاستقبال طلبات دعم تقنية المعلومات وتصنيفها وإسنادها ومعالجتها والتحقق منها وتصعيدها وإغلاقها",
        scope: "all employees, trainees, contractors, IT support personnel, academy systems, and approved support channels",
        scopeAr: "جميع الموظفين والمتدربين والمتعاقدين وموظفي الدعم التقني وأنظمة الأكاديمية وقنوات الدعم المعتمدة",
        controls: [
            "All support requests shall be registered through the approved Freshdesk channel before work is tracked or closed.",
            "Tickets shall contain sufficient issue details, affected service, requester contact information, priority, owner, actions taken, and closure evidence.",
            "The assigned IT specialist shall investigate the cause, apply the approved solution, verify recovery with the requester when applicable, and update the ticket before closure.",
            "Unresolved, recurring, security-related, or vendor-dependent issues shall be escalated to the appropriate authority without closing the original ticket.",
            "Ticket records shall be protected from unauthorized alteration and retained under the approved record-control requirements."
        ],
        controlsAr: [
            "يجب تسجيل جميع طلبات الدعم عبر قناة Freshdesk المعتمدة قبل متابعة العمل أو إغلاق الطلب.",
            "يجب أن تتضمن التذكرة وصفًا كافيًا للمشكلة والخدمة المتأثرة وبيانات مقدم الطلب والأولوية والمسؤول والإجراءات المنفذة ودليل الإغلاق.",
            "يتولى أخصائي تقنية المعلومات المكلّف تحديد السبب وتطبيق الحل المعتمد والتحقق من عودة الخدمة مع المستفيد عند الحاجة وتحديث التذكرة قبل إغلاقها.",
            "يجب تصعيد المشكلات غير المحلولة أو المتكررة أو المتعلقة بالأمن أو التي تتطلب دعم المورّد إلى الجهة المناسبة دون إغلاق التذكرة الأصلية.",
            "تُحمى سجلات التذاكر من التعديل غير المصرح به وتُحتفظ بها وفق متطلبات ضبط السجلات المعتمدة."
        ],
        roles: ["Requester: provide accurate information and respond to clarification requests.", "IT Specialist: investigate, document, resolve, verify, and close tickets.", "IT Management: oversee priorities, escalations, performance, and exceptions."],
        rolesAr: ["مقدم الطلب: تقديم معلومات دقيقة والاستجابة لطلبات التوضيح.", "أخصائي تقنية المعلومات: التحقيق والتوثيق والمعالجة والتحقق وإغلاق التذاكر.", "إدارة تقنية المعلومات: الإشراف على الأولويات والتصعيد والأداء والاستثناءات."],
        records: ["Freshdesk ticket", "diagnostic notes", "communications", "resolution evidence", "closure confirmation", "performance reports"],
        recordsAr: ["تذكرة Freshdesk", "ملاحظات التشخيص", "المراسلات", "دليل المعالجة", "تأكيد الإغلاق", "تقارير الأداء"],
        kpis: ["Average response time", "ticket closure rate", "reopened-ticket rate", "backlog by priority", "requester confirmation rate"],
        kpisAr: ["متوسط زمن الاستجابة", "معدل إغلاق التذاكر", "نسبة التذاكر المعاد فتحها", "التذاكر المتراكمة حسب الأولوية", "نسبة تأكيد المستفيد"],
        keywords: ["Freshdesk", "IT support", "ticket", "incident", "request", "escalation", "closure", "SLA"],
        keywordsAr: ["فريش ديسك", "الدعم الفني", "تذكرة", "بلاغ", "طلب", "تصعيد", "إغلاق", "زمن الاستجابة"],
        references: [
            IT_OPM("Freshdesk Ticketing System", "نظام تذاكر Freshdesk", "SEC-2.5", "27", ["REC-080", "REC-083", "REC-086", "REC-087"]),
            IT_OPM("Freshdesk Ticket Troubleshooting and Closure", "معالجة تذاكر Freshdesk وإغلاقها", "PROC-3.1", "30", ["REC-114", "REC-115", "REC-116", "REC-117", "REC-118", "REC-119", "REC-121"]),
            IT_OPM("IT KPI Framework", "إطار مؤشرات أداء تقنية المعلومات", "SEC-2.1.1", "21", ["REC-069", "REC-070"]),
        ],
    },
    {
        id: "backup-recovery",
        terms: ["backup", "restore", "recovery", "retention", "باك اب", "باكاب", "نسخ احتياطي", "استعاده", "استعادة", "استرجاع", "حفظ البيانات"],
        title: "Data Backup and Recovery Policy",
        titleAr: "سياسة النسخ الاحتياطي واستعادة البيانات",
        purpose: "define accountable, secure, testable, and documented controls for backing up and restoring academy information and systems",
        purposeAr: "تحديد ضوابط مسؤولة وآمنة وقابلة للاختبار وموثقة لنسخ معلومات وأنظمة الأكاديمية احتياطيًا واستعادتها",
        scope: "academy information systems, databases, configurations, application files, locally hosted platforms, backup media, and personnel assigned to backup or restoration activities",
        scopeAr: "أنظمة معلومات الأكاديمية وقواعد البيانات والإعدادات وملفات التطبيقات والمنصات المستضافة محليًا ووسائط النسخ الاحتياطي والأشخاص المكلّفين بالنسخ أو الاستعادة",
        controls: [
            "System owners shall define backup frequency, scope, retention, protection, and restoration objectives according to business criticality.",
            "Backup jobs shall be monitored and failures shall be recorded, investigated, corrected, and rerun when required.",
            "Backup copies shall be protected through access control, integrity checks, and separation from the primary system.",
            "Restoration tests shall be performed at an approved frequency and documented with the result, evidence, owner, and corrective action.",
            "Daily and monthly routines already approved in the active IT OPM shall remain in force unless formally amended."
        ],
        controlsAr: [
            "يحدد مالكو الأنظمة تكرار النسخ ونطاقه ومدة الاحتفاظ والحماية وأهداف الاستعادة وفق أهمية الأعمال.",
            "تتم مراقبة مهام النسخ الاحتياطي، وتُسجل حالات الفشل وتُحقق وتُصحح وتُعاد المهمة عند الحاجة.",
            "تُحمى النسخ الاحتياطية بضوابط الوصول وفحوصات السلامة والفصل عن النظام الأساسي.",
            "تُنفذ اختبارات الاستعادة وفق تكرار معتمد وتوثق النتيجة والأدلة والمسؤول والإجراء التصحيحي.",
            "تظل الإجراءات اليومية والشهرية المعتمدة في دليل IT OPM الفعّال سارية ما لم تُعدل رسميًا."
        ],
        roles: ["System Owner: approve backup and recovery objectives.", "IT Specialist: execute, monitor, document, test, and remediate backup jobs.", "IT Management: approve exceptions and review recovery readiness."],
        rolesAr: ["مالك النظام: اعتماد أهداف النسخ والاستعادة.", "أخصائي تقنية المعلومات: التنفيذ والمراقبة والتوثيق والاختبار ومعالجة الإخفاقات.", "إدارة تقنية المعلومات: اعتماد الاستثناءات ومراجعة جاهزية الاستعادة."],
        records: ["backup logs", "failure reports", "restore-test records", "media inventories", "access logs", "exception approvals"],
        recordsAr: ["سجلات النسخ", "تقارير الإخفاق", "سجلات اختبار الاستعادة", "حصر الوسائط", "سجلات الوصول", "اعتمادات الاستثناء"],
        kpis: ["backup success rate", "restore-test success rate", "unresolved backup failures", "recovery time achieved"],
        kpisAr: ["نسبة نجاح النسخ", "نسبة نجاح اختبارات الاستعادة", "إخفاقات النسخ غير المعالجة", "زمن الاستعادة المحقق"],
        keywords: ["backup", "recovery", "restore", "retention", "RPO", "RTO", "integrity", "EDRAK", "LMS"],
        keywordsAr: ["نسخ احتياطي", "استعادة", "استرجاع", "احتفاظ", "سلامة البيانات", "إدراك", "نظام إدارة التعلم"],
        references: [
            IT_OPM("EDRAK Daily Routine Check and Backup", "الفحص اليومي والنسخ الاحتياطي لنظام EDRAK", "PROC-4.1", "33", ["REC-139", "REC-140", "REC-141", "REC-142", "REC-143"]),
            IT_OPM("Monthly LMS Backup", "النسخ الاحتياطي الشهري لنظام LMS", "PROC-4.2", "35", ["REC-145", "REC-146", "REC-147"]),
            IT_OPM("Electronic Record Storage, Backup, Retention and Disposal", "تخزين السجلات الإلكترونية ونسخها واحتفاظها وإتلافها", "SEC-1.7.2", "15", ["REC-040", "REC-041", "REC-042"]),
        ],
    },
    {
        id: "business-continuity",
        terms: ["business continuity", "disaster recovery", "system failure", "outage", "continuity", "تعطل", "استمراريه", "استمرارية", "كارثه", "كوارث", "خادم احتياطي", "النظام طاح"],
        title: "IT System Failure and Business Continuity Procedure",
        titleAr: "إجراء تعطل أنظمة تقنية المعلومات واستمرارية الأعمال",
        purpose: "provide a controlled response to system failures that restores service safely, preserves evidence, coordinates vendors, and maintains critical academy operations",
        purposeAr: "توفير استجابة منضبطة لتعطل الأنظمة بما يعيد الخدمة بأمان ويحفظ الأدلة وينسق مع المورّدين ويحافظ على عمليات الأكاديمية الحرجة",
        scope: "critical academy systems, locally hosted platforms, supporting infrastructure, responsible IT personnel, service owners, and external vendors",
        scopeAr: "أنظمة الأكاديمية الحرجة والمنصات المستضافة محليًا والبنية التحتية الداعمة وموظفي تقنية المعلومات المسؤولين ومالكي الخدمات والمورّدين الخارجيين",
        controls: [
            "Failures shall be recorded immediately with the affected service, time, symptoms, impact, owner, and current status.",
            "The assigned specialist shall troubleshoot and apply the required corrective action as soon as possible.",
            "Vendor support shall be engaged when internal capability or authorization is insufficient.",
            "Approved continuity arrangements shall be activated when the defined threshold is reached, including EDRAK backup-server use when troubleshooting exceeds one day.",
            "Return to normal operation shall be verified, documented, and communicated before the incident is closed."
        ],
        controlsAr: [
            "يُسجل التعطل فورًا مع الخدمة المتأثرة والوقت والأعراض والأثر والمسؤول والحالة الحالية.",
            "يتولى الأخصائي المكلّف استكشاف الخلل وتطبيق الإجراء التصحيحي المطلوب بأسرع ما يمكن.",
            "يُطلب دعم المورّد عندما لا تتوافر القدرة أو الصلاحية الداخلية الكافية.",
            "تُفعّل ترتيبات الاستمرارية المعتمدة عند بلوغ الحد المحدد، بما في ذلك استخدام خادم EDRAK الاحتياطي إذا تجاوز استكشاف العطل يومًا واحدًا.",
            "يتم التحقق من العودة إلى التشغيل الطبيعي وتوثيقها وإبلاغ الأطراف المعنية قبل إغلاق الحادث."
        ],
        roles: ["IT Specialist: diagnose, recover, document, and coordinate technical support.", "Service Owner: confirm business impact and restored service.", "IT Management: authorize continuity actions and major escalations.", "Vendor: provide specialized support under the applicable agreement."],
        rolesAr: ["أخصائي تقنية المعلومات: التشخيص والاستعادة والتوثيق وتنسيق الدعم الفني.", "مالك الخدمة: تأكيد أثر الأعمال وعودة الخدمة.", "إدارة تقنية المعلومات: اعتماد إجراءات الاستمرارية والتصعيدات الرئيسية.", "المورّد: تقديم الدعم المتخصص وفق الاتفاقية المطبقة."],
        records: ["incident record", "timeline", "diagnostic evidence", "vendor communications", "recovery validation", "lessons learned"],
        recordsAr: ["سجل الحادث", "التسلسل الزمني", "أدلة التشخيص", "مراسلات المورّد", "التحقق من الاستعادة", "الدروس المستفادة"],
        kpis: ["time to acknowledge", "time to restore", "continuity activation time", "repeat-failure rate", "post-incident action closure"],
        kpisAr: ["زمن الإقرار بالحادث", "زمن استعادة الخدمة", "زمن تفعيل الاستمرارية", "نسبة تكرار التعطل", "إغلاق إجراءات ما بعد الحادث"],
        keywords: ["system failure", "outage", "business continuity", "disaster recovery", "vendor", "backup server", "EDRAK"],
        keywordsAr: ["تعطل النظام", "انقطاع الخدمة", "استمرارية الأعمال", "التعافي من الكوارث", "المورّد", "الخادم الاحتياطي", "إدراك"],
        references: [
            IT_OPM("System Failure Response and Business Continuity", "الاستجابة لتعطل الأنظمة واستمرارية الأعمال", "PROC-2.8", "27", ["REC-105", "REC-106", "REC-107", "REC-108", "REC-109", "REC-110"]),
        ],
    },
    {
        id: "access-security",
        terms: ["password", "access", "account", "identity", "mfa", "privileged", "كلمه مرور", "كلمة مرور", "باسورد", "صلاحيات", "صلاحية", "دخول", "حساب", "مصادقه", "مصادقة"],
        title: "Information-System Access Control Standard",
        titleAr: "معيار التحكم في الوصول إلى أنظمة المعلومات",
        purpose: "define consistent controls for requesting, approving, provisioning, reviewing, changing, and removing access to academy information systems",
        purposeAr: "تحديد ضوابط موحدة لطلب الوصول إلى أنظمة معلومات الأكاديمية واعتماده ومنحه ومراجعته وتغييره وإلغائه",
        scope: "all user, service, administrative, shared, temporary, vendor, and privileged accounts used to access academy information or technology resources",
        scopeAr: "جميع حسابات المستخدمين والخدمات والإدارة والحسابات المشتركة والمؤقتة وحسابات المورّدين والحسابات ذات الصلاحيات المرتفعة المستخدمة للوصول إلى معلومات الأكاديمية أو مواردها التقنية",
        controls: [
            "Access shall be based on approved business need, least privilege, role separation, and identifiable accountability.",
            "Requests shall identify the user, system, required role, justification, owner approval, start date, and expiry date when temporary.",
            "Privileged and remote access shall receive additional authorization, stronger authentication, logging, and periodic review.",
            "Access shall be reviewed at an approved frequency and removed promptly after role change, contract end, inactivity, or identified risk.",
            "Authentication secrets shall not be shared, exposed in tickets, or stored in unapproved locations."
        ],
        controlsAr: [
            "يُمنح الوصول بناءً على حاجة عمل معتمدة وبأقل صلاحية لازمة مع فصل الأدوار وإمكانية تحديد المسؤولية.",
            "يحدد الطلب المستخدم والنظام والدور المطلوب والمبرر واعتماد المالك وتاريخ البدء وتاريخ الانتهاء إذا كان الوصول مؤقتًا.",
            "يخضع الوصول ذو الصلاحيات المرتفعة والوصول عن بُعد لاعتماد إضافي ومصادقة أقوى وتسجيل ومراجعة دورية.",
            "تُراجع الصلاحيات وفق تكرار معتمد وتُلغى فورًا بعد تغيير الدور أو انتهاء العقد أو عدم النشاط أو ظهور مخاطر.",
            "لا يجوز مشاركة أسرار المصادقة أو إظهارها في التذاكر أو تخزينها في مواقع غير معتمدة."
        ],
        roles: ["Requester and line manager: justify and approve business need.", "System Owner: approve role and access scope.", "IT: provision, record, review, modify, and revoke access.", "User: protect credentials and report suspected compromise."],
        rolesAr: ["مقدم الطلب والمدير المباشر: تبرير حاجة العمل واعتمادها.", "مالك النظام: اعتماد الدور ونطاق الوصول.", "تقنية المعلومات: منح الصلاحيات وتسجيلها ومراجعتها وتعديلها وإلغاؤها.", "المستخدم: حماية بيانات الدخول والإبلاغ عن الاشتباه في اختراقها."],
        records: ["access request", "approval", "provisioning evidence", "access review", "revocation record", "privileged-access log"],
        recordsAr: ["طلب الوصول", "الاعتماد", "دليل منح الصلاحية", "مراجعة الوصول", "سجل الإلغاء", "سجل الوصول ذي الصلاحيات المرتفعة"],
        kpis: ["access requests completed within target", "overdue access reviews", "orphaned accounts", "privileged-access exceptions"],
        kpisAr: ["طلبات الوصول المنجزة ضمن المستهدف", "مراجعات الصلاحيات المتأخرة", "الحسابات غير المرتبطة بمستخدم نشط", "استثناءات الوصول ذي الصلاحيات المرتفعة"],
        keywords: ["access control", "identity", "account", "password", "MFA", "least privilege", "privileged access"],
        keywordsAr: ["التحكم في الوصول", "الهوية", "الحساب", "كلمة المرور", "المصادقة متعددة العوامل", "أقل صلاحية", "الوصول المميز"],
    },
    {
        id: "cyber-incident",
        terms: ["cyber", "security incident", "phishing", "malware", "breach", "ransomware", "امن سيبراني", "أمن سيبراني", "حادث امني", "اختراق", "تصيد", "فيروس", "برمجيات خبيثه", "فديه", "فدية"],
        title: "Cybersecurity Incident Response Policy",
        titleAr: "سياسة الاستجابة لحوادث الأمن السيبراني",
        purpose: "establish a coordinated method to identify, report, assess, contain, preserve evidence, eradicate, recover from, and learn from cybersecurity incidents",
        purposeAr: "وضع منهجية منسقة لاكتشاف حوادث الأمن السيبراني والإبلاغ عنها وتقييمها واحتوائها وحفظ أدلتها واستئصال أسبابها والتعافي منها والاستفادة من دروسها",
        scope: "academy information, systems, networks, accounts, devices, cloud services, third parties, employees, contractors, and trainees",
        scopeAr: "معلومات الأكاديمية وأنظمتها وشبكاتها وحساباتها وأجهزتها وخدماتها السحابية والأطراف الثالثة والموظفين والمتعاقدين والمتدربين",
        controls: [
            "Suspected incidents shall be reported immediately through the approved channel without deleting, altering, or forwarding potential evidence.",
            "Incidents shall be classified by impact, urgency, affected information, service criticality, and legal or contractual obligations.",
            "Containment actions shall be authorized, proportionate, documented, and designed to limit harm while preserving evidence.",
            "Recovery shall include validation, monitoring, stakeholder communication, and confirmation that the root cause has been addressed.",
            "A post-incident review shall assign corrective actions, owners, due dates, and follow-up verification."
        ],
        controlsAr: [
            "يجب الإبلاغ فورًا عن الحوادث المشتبه بها عبر القناة المعتمدة دون حذف الأدلة المحتملة أو تعديلها أو إعادة إرسالها.",
            "تُصنف الحوادث حسب الأثر والاستعجال والمعلومات المتأثرة وأهمية الخدمة والالتزامات النظامية أو التعاقدية.",
            "تكون إجراءات الاحتواء معتمدة ومتناسبة وموثقة وتهدف إلى الحد من الضرر مع الحفاظ على الأدلة.",
            "تشمل الاستعادة التحقق والمراقبة والتواصل مع أصحاب العلاقة والتأكد من معالجة السبب الجذري.",
            "تُنفذ مراجعة بعد الحادث تحدد الإجراءات التصحيحية والمسؤولين والمواعيد والتحقق اللاحق."
        ],
        roles: ["All users: report suspected incidents and preserve evidence.", "IT/Security: triage, investigate, contain, recover, and document.", "Management: approve major decisions and communications.", "Legal/Compliance: assess notification and evidence obligations when applicable."],
        rolesAr: ["جميع المستخدمين: الإبلاغ عن الحوادث المشتبه بها والحفاظ على الأدلة.", "تقنية المعلومات/الأمن: الفرز والتحقيق والاحتواء والاستعادة والتوثيق.", "الإدارة: اعتماد القرارات والاتصالات الرئيسية.", "الشؤون القانونية/الامتثال: تقييم التزامات الإشعار والأدلة عند انطباقها."],
        records: ["incident report", "classification", "timeline", "evidence register", "communications", "recovery validation", "lessons learned"],
        recordsAr: ["بلاغ الحادث", "التصنيف", "التسلسل الزمني", "سجل الأدلة", "الاتصالات", "التحقق من الاستعادة", "الدروس المستفادة"],
        kpis: ["time to report", "time to contain", "time to recover", "repeat-incident rate", "corrective actions overdue"],
        kpisAr: ["زمن الإبلاغ", "زمن الاحتواء", "زمن الاستعادة", "نسبة تكرار الحوادث", "الإجراءات التصحيحية المتأخرة"],
        keywords: ["cybersecurity", "incident response", "phishing", "malware", "breach", "containment", "evidence", "recovery"],
        keywordsAr: ["الأمن السيبراني", "الاستجابة للحوادث", "التصيد", "البرمجيات الخبيثة", "الاختراق", "الاحتواء", "الأدلة", "التعافي"],
    },
    {
        id: "acceptable-use",
        terms: ["acceptable use", "email use", "internet use", "device use", "removable media", "استخدام مقبول", "استخدام البريد", "استخدام الانترنت", "استخدام الاجهزه", "فلاش", "وسائط قابله"],
        title: "Acceptable Use of Information Technology Resources Policy",
        titleAr: "سياسة الاستخدام المقبول لموارد تقنية المعلومات",
        purpose: "set clear and practical rules for responsible, secure, lawful, and business-appropriate use of academy technology resources",
        purposeAr: "وضع قواعد واضحة وعملية للاستخدام المسؤول والآمن والنظامي والملائم للعمل لموارد تقنية المعلومات في الأكاديمية",
        scope: "all users and all academy-provided or academy-connected accounts, devices, networks, internet services, email, storage, applications, and removable media",
        scopeAr: "جميع المستخدمين والحسابات والأجهزة والشبكات وخدمات الإنترنت والبريد والتخزين والتطبيقات والوسائط القابلة للإزالة المقدمة من الأكاديمية أو المتصلة بها",
        controls: [
            "Technology resources shall be used primarily for authorized academy activities and in a manner that protects confidentiality, integrity, availability, reputation, and legal compliance.",
            "Users shall not bypass security controls, install unapproved software, share accounts, expose confidential information, or use academy resources for unlawful or harmful activity.",
            "Suspicious messages, unexpected authentication requests, lost devices, and suspected compromise shall be reported promptly.",
            "Sensitive information shall be stored and shared only through approved services and with recipients who have a valid need to know.",
            "Monitoring may be performed for security, operational, compliance, and support purposes in accordance with approved authority."
        ],
        controlsAr: [
            "تُستخدم الموارد التقنية أساسًا لأعمال الأكاديمية المصرح بها وبطريقة تحمي السرية والسلامة والتوافر والسمعة والامتثال النظامي.",
            "يحظر تجاوز ضوابط الأمن أو تثبيت برامج غير معتمدة أو مشاركة الحسابات أو كشف المعلومات السرية أو استخدام موارد الأكاديمية في نشاط غير نظامي أو ضار.",
            "يجب الإبلاغ سريعًا عن الرسائل المشبوهة وطلبات المصادقة غير المتوقعة والأجهزة المفقودة والاشتباه في الاختراق.",
            "تُخزن المعلومات الحساسة وتُشارك فقط عبر الخدمات المعتمدة ومع من لديه حاجة عمل صحيحة للاطلاع.",
            "يجوز إجراء المراقبة لأغراض الأمن والتشغيل والامتثال والدعم وفق الصلاحية المعتمدة."
        ],
        roles: ["Users: comply, protect resources, and report concerns.", "Managers: reinforce appropriate use and report violations.", "IT: implement controls, support users, monitor approved services, and preserve evidence."],
        rolesAr: ["المستخدمون: الالتزام وحماية الموارد والإبلاغ عن المخاوف.", "المديرون: تعزيز الاستخدام المناسب والإبلاغ عن المخالفات.", "تقنية المعلومات: تطبيق الضوابط ودعم المستخدمين ومراقبة الخدمات المعتمدة وحفظ الأدلة."],
        records: ["user acknowledgment", "approved exceptions", "security alerts", "incident tickets", "investigation records"],
        recordsAr: ["إقرار المستخدم", "الاستثناءات المعتمدة", "تنبيهات الأمن", "تذاكر الحوادث", "سجلات التحقيق"],
        kpis: ["acknowledgment completion", "policy violations", "phishing reports", "unapproved software findings"],
        kpisAr: ["اكتمال الإقرار", "مخالفات السياسة", "بلاغات التصيد", "حالات البرامج غير المعتمدة"],
        keywords: ["acceptable use", "email", "internet", "device", "software", "removable media", "monitoring"],
        keywordsAr: ["الاستخدام المقبول", "البريد", "الإنترنت", "الأجهزة", "البرامج", "الوسائط القابلة للإزالة", "المراقبة"],
    },
    {
        id: "change-management",
        terms: ["change management", "release", "deployment", "patch", "update", "تغيير", "اداره التغيير", "إدارة التغيير", "تحديث نظام", "نشر", "اصدار", "إصدار", "ترقيه", "ترقية"],
        title: "Information Technology Change Management Procedure",
        titleAr: "إجراء إدارة التغيير في تقنية المعلومات",
        purpose: "ensure that technology changes are requested, assessed, approved, tested, scheduled, implemented, verified, communicated, and closed in a controlled manner",
        purposeAr: "ضمان طلب التغييرات التقنية وتقييمها واعتمادها واختبارها وجدولتها وتنفيذها والتحقق منها والتواصل بشأنها وإغلاقها بطريقة منضبطة",
        scope: "changes to production systems, infrastructure, configurations, integrations, applications, security controls, databases, and vendor-managed services",
        scopeAr: "التغييرات على أنظمة الإنتاج والبنية التحتية والإعدادات والتكاملات والتطبيقات وضوابط الأمن وقواعد البيانات والخدمات المدارة من المورّدين",
        controls: [
            "Every production change shall have an identifiable request, owner, business justification, affected services, risk assessment, test evidence, implementation plan, rollback plan, approvals, and planned window.",
            "Emergency changes shall be limited to urgent service or security needs, receive expedited authorization, and undergo retrospective review.",
            "Implementation shall be monitored and deviations, failures, or rollback actions shall be recorded immediately.",
            "The change shall be closed only after technical validation, business confirmation when applicable, documentation update, and completion of follow-up actions.",
            "Unauthorized changes shall be investigated and treated as control failures."
        ],
        controlsAr: [
            "يجب أن يكون لكل تغيير في بيئة الإنتاج طلب محدد ومسؤول ومبرر عمل وخدمات متأثرة وتقييم مخاطر وأدلة اختبار وخطة تنفيذ وخطة تراجع واعتمادات ونافذة زمنية مخططة.",
            "تقتصر التغييرات الطارئة على احتياجات الخدمة أو الأمن العاجلة وتحصل على اعتماد سريع وتخضع لمراجعة لاحقة.",
            "تتم مراقبة التنفيذ وتُسجل فورًا أي انحرافات أو إخفاقات أو إجراءات تراجع.",
            "لا يُغلق التغيير إلا بعد التحقق الفني وتأكيد الأعمال عند الحاجة وتحديث الوثائق واستكمال إجراءات المتابعة.",
            "تُحقق التغييرات غير المصرح بها وتُعامل كإخفاقات رقابية."
        ],
        roles: ["Requester: define need and impact.", "Change Owner: plan, test, coordinate, implement, and close.", "Approver: assess risk and authorize.", "Service Owner: confirm service impact and acceptance."],
        rolesAr: ["مقدم الطلب: تحديد الحاجة والأثر.", "مالك التغيير: التخطيط والاختبار والتنسيق والتنفيذ والإغلاق.", "المعتمد: تقييم المخاطر ومنح الاعتماد.", "مالك الخدمة: تأكيد أثر الخدمة وقبولها."],
        records: ["change request", "risk assessment", "test evidence", "approval", "implementation log", "rollback evidence", "closure review"],
        recordsAr: ["طلب التغيير", "تقييم المخاطر", "أدلة الاختبار", "الاعتماد", "سجل التنفيذ", "دليل التراجع", "مراجعة الإغلاق"],
        kpis: ["change success rate", "emergency-change rate", "failed changes", "unauthorized changes", "changes closed with complete evidence"],
        kpisAr: ["نسبة نجاح التغييرات", "نسبة التغييرات الطارئة", "التغييرات الفاشلة", "التغييرات غير المصرح بها", "التغييرات المغلقة بأدلة مكتملة"],
        keywords: ["change management", "release", "deployment", "testing", "approval", "rollback", "emergency change"],
        keywordsAr: ["إدارة التغيير", "الإصدار", "النشر", "الاختبار", "الاعتماد", "التراجع", "التغيير الطارئ"],
    },
    {
        id: "generic-it",
        terms: ["it", "technology", "information system", "تقنيه المعلومات", "تقنية المعلومات", "نظام معلومات", "سياسه تقنيه", "سياسة تقنية"],
        title: "Information Technology Governance Policy",
        titleAr: "سياسة حوكمة تقنية المعلومات",
        purpose: "define clear governance, accountability, control, documentation, service, risk, and continual-improvement expectations for academy technology activities",
        purposeAr: "تحديد توقعات واضحة للحوكمة والمساءلة والضبط والتوثيق والخدمة والمخاطر والتحسين المستمر لأنشطة تقنية المعلومات في الأكاديمية",
        scope: "all academy technology services, information systems, infrastructure, data, users, service owners, IT personnel, contractors, and relevant vendors",
        scopeAr: "جميع خدمات التقنية وأنظمة المعلومات والبنية التحتية والبيانات والمستخدمين ومالكي الخدمات وموظفي تقنية المعلومات والمتعاقدين والمورّدين ذوي العلاقة في الأكاديمية",
        controls: [
            "Technology activities shall have defined ownership, authorization, documented procedures, appropriate segregation of duties, and auditable records.",
            "Risks shall be identified and treated according to business impact, information sensitivity, service criticality, and applicable obligations.",
            "Operational work shall use approved service, incident, change, backup, access, and continuity controls as applicable.",
            "Exceptions shall be documented, risk-assessed, time-bound, approved by the proper authority, and reviewed before expiry.",
            "Performance, incidents, findings, and corrective actions shall be monitored and reported to support continual improvement."
        ],
        controlsAr: [
            "يجب أن يكون للأنشطة التقنية ملكية وصلاحيات وإجراءات موثقة وفصل مناسب للمهام وسجلات قابلة للتدقيق.",
            "تُحدد المخاطر وتُعالج وفق أثر الأعمال وحساسية المعلومات وأهمية الخدمة والالتزامات المطبقة.",
            "تستخدم الأعمال التشغيلية ضوابط الخدمة والحوادث والتغيير والنسخ الاحتياطي والوصول والاستمرارية المعتمدة بحسب انطباقها.",
            "تُوثق الاستثناءات وتُقيّم مخاطرها وتكون محددة المدة ومعتمدة من الجهة المختصة وتُراجع قبل انتهائها.",
            "تُراقب مؤشرات الأداء والحوادث والملاحظات والإجراءات التصحيحية ويُرفع عنها التقارير دعمًا للتحسين المستمر."
        ],
        roles: ["Executive/Department Management: approve direction and resources.", "IT Management: establish controls and monitor performance.", "System and Service Owners: define requirements and accept risk.", "Users and Suppliers: comply with approved controls and report issues."],
        rolesAr: ["الإدارة التنفيذية/إدارة القسم: اعتماد التوجه والموارد.", "إدارة تقنية المعلومات: وضع الضوابط ومراقبة الأداء.", "مالكو الأنظمة والخدمات: تحديد المتطلبات وقبول المخاطر.", "المستخدمون والمورّدون: الالتزام بالضوابط المعتمدة والإبلاغ عن المشكلات."],
        records: ["approvals", "risk assessments", "service records", "incident and change records", "performance reports", "corrective-action logs"],
        recordsAr: ["الاعتمادات", "تقييمات المخاطر", "سجلات الخدمة", "سجلات الحوادث والتغييرات", "تقارير الأداء", "سجلات الإجراءات التصحيحية"],
        kpis: ["service performance", "open high-risk issues", "overdue corrective actions", "control exceptions", "user satisfaction"],
        kpisAr: ["أداء الخدمة", "المخاطر العالية المفتوحة", "الإجراءات التصحيحية المتأخرة", "الاستثناءات الرقابية", "رضا المستخدمين"],
        keywords: ["IT governance", "risk", "service management", "controls", "records", "compliance", "continual improvement"],
        keywordsAr: ["حوكمة تقنية المعلومات", "المخاطر", "إدارة الخدمات", "الضوابط", "السجلات", "الامتثال", "التحسين المستمر"],
    },
];
function normalize(value) {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
        .replace(/[إأآٱ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
export function detectGeneratorLanguage(value) {
    const ar = (value.match(/[\u0600-\u06ff]/g) ?? []).length;
    const en = (value.match(/[a-z]/gi) ?? []).length;
    return ar >= en ? "ar" : "en";
}
function scoreTopic(prompt, topic) {
    const q = normalize(prompt);
    return topic.terms.reduce((score, term) => {
        const n = normalize(term);
        if (!n)
            return score;
        if (q === n)
            return score + 6;
        if (q.includes(n))
            return score + (n.includes(" ") ? 3 : 2);
        return score;
    }, 0);
}
function inferDocumentType(prompt, topic) {
    const q = normalize(prompt);
    if (["procedure", "manual", "steps", "workflow", "اجراء", "خطوات", "دليل اجرائي", "كيفيه"].some(v => q.includes(normalize(v))))
        return "Office Procedure Manual";
    if (["standard", "baseline", "معيار", "ضابط", "متطلبات فنيه"].some(v => q.includes(normalize(v))))
        return "Standard";
    if (["guideline", "guide", "ارشادات", "ارشاد", "دليل استخدام"].some(v => q.includes(normalize(v))))
        return "Guideline";
    if (["framework", "strategy", "اطار", "استراتيجيه"].some(v => q.includes(normalize(v))))
        return "Framework";
    if (["support-ticket", "business-continuity", "change-management"].includes(topic.id))
        return "Office Procedure Manual";
    if (topic.id === "access-security")
        return "Standard";
    return "Policy";
}
function titlesForDocumentType(topic, documentType) {
    const englishSuffix = {
        Policy: "Policy",
        "Office Procedure Manual": "Procedure",
        Standard: "Standard",
        Guideline: "Guideline",
        Framework: "Framework",
    };
    const arabicPrefix = {
        Policy: "سياسة",
        "Office Procedure Manual": "إجراء",
        Standard: "معيار",
        Guideline: "دليل إرشادي",
        Framework: "إطار",
    };
    const suffix = englishSuffix[documentType] ?? "Policy";
    const prefix = arabicPrefix[documentType] ?? "سياسة";
    const englishBase = topic.title
        .replace(/\s+(Policy|Procedure|Standard|Guideline|Framework)$/i, "")
        .trim();
    const arabicBase = topic.titleAr
        .replace(/^(سياسة|إجراء|معيار|دليل إرشادي|إطار)\s+/, "")
        .trim();
    return { title: `${englishBase} ${suffix}`, titleAr: `${prefix} ${arabicBase}` };
}
function section(title, lines) {
    return `${title}\n${lines.map((line, i) => `${i + 1}. ${line}`).join("\n")}`;
}
function bulletSection(title, lines) {
    return `${title}\n${lines.map(line => `• ${line}`).join("\n")}`;
}
function referencesText(references, lang) {
    if (!references.length)
        return [lang === "ar" ? "لا توجد مراجع داخلية معتمدة مرتبطة تلقائيًا بهذه المسودة؛ يجب على المراجع إضافة المراجع المطبقة قبل الاعتماد." : "No approved internal reference was automatically linked to this draft; the reviewer must add applicable references before approval."];
    return references.map(ref => lang === "ar"
        ? `${ref.titleAr} — ${ref.groupId}، صفحة ${ref.page}، السجلات: ${ref.recordIds.join("، ")}`
        : `${ref.title} — ${ref.groupId}, page ${ref.page}, records: ${ref.recordIds.join(", ")}`);
}
function extractPromptDetails(prompt) {
    const normalized = prompt.trim();
    const language = detectGeneratorLanguage(normalized);
    const english = language === "en" ? normalized : normalized;
    const arabic = language === "ar" ? normalized : "";
    const inferTitle = (value) => {
        const cleaned = value.replace(/\b(create|write|draft|policy|procedure|standard|guideline|manual|for|the|an|a)\b/gi, "").trim();
        if (!cleaned)
            return "Policy Draft";
        return cleaned.replace(/^\w/, c => c.toUpperCase());
    };
    const title = inferTitle(english);
    const titleAr = language === "ar" ? title : `سياسة ${title}`;
    const purpose = english ? `address the operational and governance needs described in the request: ${english}` : "address the requested governance requirement";
    const purposeAr = arabic ? `تتناول الاحتياجات التشغيلية والحوكمية الواردة في الطلب: ${arabic}` : "تتناول متطلبات الحوكمة المطلوبة";
    const scope = english ? `all relevant users, systems, teams, and processes involved in ${english.toLowerCase()}` : "جميع المستخدمين والأنظمة والفرق والعمليات ذات الصلة";
    const scopeAr = arabic ? `جميع المستخدمين والأنظمة والفرق والعمليات المعنية بـ ${arabic}` : "جميع المستخدمين والأنظمة والفرق والعمليات ذات الصلة";
    const clauses = english
        .split(/\.|,|;|\n/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 6);
    const controls = clauses.length
        ? clauses.map((clause, index) => `${index + 1}. ${clause}`)
        : [
            "The process shall be documented, approved, assigned to an accountable owner, and reviewed on a defined schedule.",
            "The control owner shall monitor execution, record evidence, and ensure corrective action when the requirement is not met.",
        ];
    const controlsAr = arabic
        ? clauses.map((clause, index) => `${index + 1}. ${clause}`)
        : [
            "يجب توثيق العملية واعتمادها وتعيين مسؤول مسؤول عنها ومراجعتها وفق جدول محدد.",
            "يجب على صاحب الضبط متابعة التنفيذ وتسجيل الأدلة واتخاذ الإجراءات التصحيحية عند عدم الالتزام بالمتطلب.",
        ];
    const roles = [
        "Process owner: define the requirement, approve the control, and ensure implementation.",
        "Relevant users: follow the procedure, record required evidence, and escalate issues promptly.",
        "Management: review performance, approve exceptions, and ensure accountability.",
    ];
    const rolesAr = [
        "مالك العملية: تحديد المتطلب واعتماد الضبط وضمان التنفيذ.",
        "المستخدمون المعنيون: الالتزام بالإجراء وتسجيل الأدلة المطلوبة وتصعيد المشكلات فورًا.",
        "الإدارة: مراجعة الأداء واعتماد الاستثناءات وضمان المساءلة.",
    ];
    const records = ["approved procedure", "evidence log", "review record", "exception approval"];
    const recordsAr = ["الإجراء المعتمد", "سجل الأدلة", "سجل المراجعة", "اعتماد الاستثناء"];
    const kpis = ["adherence rate", "evidence completeness", "review cycle time", "exception closure rate"];
    const kpisAr = ["معدل الالتزام", "اكتمال الأدلة", "زمن دورة المراجعة", "معدل إغلاق الاستثناءات"];
    const keywords = ["policy", "governance", "control", "evidence", "review"];
    const keywordsAr = ["سياسة", "حوكمة", "ضبط", "أدلة", "مراجعة"];
    return {
        title,
        titleAr,
        purpose,
        purposeAr,
        scope,
        scopeAr,
        controls,
        controlsAr,
        roles,
        rolesAr,
        records,
        recordsAr,
        kpis,
        kpisAr,
        keywords,
        keywordsAr,
    };
}
export function buildPromptAwareDraft(prompt, lang) {
    const details = extractPromptDetails(prompt);
    const documentType = /procedure|procedure|workflow|steps|process/i.test(prompt) ? "Office Procedure Manual" : /standard|standard/i.test(prompt) ? "Standard" : /guideline|guide/i.test(prompt) ? "Guideline" : /framework/i.test(prompt) ? "Framework" : "Policy";
    const description = `A policy draft tailored to the request: ${prompt}`;
    const descriptionAr = `مسودة سياسة مصممة وفق الطلب: ${prompt}`;
    const content = [
        "DRAFT — FOR REVIEW AND APPROVAL",
        "",
        "1. Purpose",
        details.purpose,
        "",
        "2. Scope",
        details.scope,
        "",
        "3. Roles and Responsibilities",
        ...details.roles,
        "",
        "4. Policy Requirements",
        ...details.controls,
        "",
        "5. Records and Evidence",
        ...details.records,
        "",
        "6. Monitoring and Performance Indicators",
        ...details.kpis,
        "",
        "7. Exceptions and Escalation",
        "Exceptions must be documented, approved, limited in time, and reviewed before expiry.",
        "Escalations must be routed through the approved authority and tracked until closure.",
        "",
        "8. Review and Approval",
        "This draft must be reviewed by the responsible owner before publication and approval.",
    ].join("\n");
    const contentAr = [
        "مسودة — للمراجعة والاعتماد",
        "",
        "1. الغرض",
        details.purposeAr,
        "",
        "2. النطاق",
        details.scopeAr,
        "",
        "3. الأدوار والمسؤوليات",
        ...details.rolesAr,
        "",
        "4. متطلبات السياسة",
        ...details.controlsAr,
        "",
        "5. السجلات والأدلة",
        ...details.recordsAr,
        "",
        "6. المتابعة ومؤشرات الأداء",
        ...details.kpisAr,
        "",
        "7. الاستثناءات والتصعيد",
        "يجب توثيق الاستثناءات واعتمادها وتحديد مدتها ومراجعتها قبل انتهائها.",
        "يجب توجيه التصعيدات عبر الجهة المعتمدة وتسجيلها حتى الإغلاق.",
        "",
        "8. المراجعة والاعتماد",
        "يجب مراجعة هذه المسودة من قبل المالك المسؤول قبل النشر والاعتماد.",
    ].join("\n");
    return {
        detectedLanguage: lang,
        topicId: "prompt-aware",
        title: details.title,
        titleAr: details.titleAr,
        description,
        descriptionAr,
        department: "Information Technology",
        documentType,
        content,
        contentAr,
        keywords: details.keywords,
        keywordsAr: details.keywordsAr,
        references: [],
        reviewNotes: [
            "This draft was generated from the user's prompt and should be reviewed for fit, scope, and approval authority.",
            "Add authoritative references and local controls where the policy must align with the active IT OPM.",
        ],
        reviewNotesAr: [
            "تمت هذه المسودة من الطلب المقدم ويجب مراجعتها من حيث الملاءمة والنطاق والجهة المعتمدة.",
            "أضف المراجع الضابطة المحلية واللوائح المعتمدة عند الحاجة لمطابقة دليل IT OPM الفعّال.",
        ],
        generatedByAI: "openai",
    };
}
function buildEnglish(topic, docType) {
    const operational = docType === "Office Procedure Manual";
    const procedureLines = operational ? [
        "Register the request, event, or required activity in the approved record or service channel.",
        "Confirm scope, affected service, owner, urgency, dependencies, authorization, and required evidence.",
        "Assess risk and select the approved action, including escalation, vendor support, continuity, or rollback when applicable.",
        "Execute the action in a controlled manner and record timestamps, decisions, technical evidence, and communications.",
        "Verify the outcome with the service owner or requester, complete corrective actions, update records, and close only when acceptance criteria are met."
    ] : [
        "Applicable departments shall translate this policy into approved operating procedures and forms.",
        "The responsible owner shall identify implementation actions, accountable roles, target dates, evidence, and residual risks.",
        "Control exceptions require documented justification, risk assessment, authority approval, an expiry date, and follow-up review."
    ];
    return [
        "DRAFT — FOR REVIEW AND APPROVAL",
        "This document is AI-assisted and must be reviewed by the document owner, Information Technology management, Quality/Compliance, and the approving authority before use.",
        "",
        "1. Purpose",
        `This ${docType.toLowerCase()} is established to ${topic.purpose}.`,
        "",
        "2. Scope",
        `This document applies to ${topic.scope}.`,
        "",
        bulletSection("3. Definitions", [
            "Approved channel: a system, form, mailbox, or workflow formally authorized for the activity.",
            "Evidence: a record that demonstrates the activity, decision, approval, result, or exception.",
            "Owner: the role accountable for maintaining the control and confirming that required actions are completed.",
            "Exception: a time-bound, approved departure from a stated requirement after documented risk assessment."
        ]),
        "",
        bulletSection("4. Roles and Responsibilities", topic.roles),
        "",
        section("5. Policy Requirements", topic.controls),
        "",
        section(operational ? "6. Operating Procedure" : "6. Implementation and Control", procedureLines),
        "",
        bulletSection("7. Records and Evidence", topic.records),
        "",
        bulletSection("8. Monitoring and Performance Indicators", topic.kpis),
        "",
        section("9. Compliance, Exceptions and Escalation", [
            "Non-compliance, control failure, or material risk shall be reported through the approved management or support channel.",
            "Exceptions shall be documented, risk-assessed, approved by the proper authority, limited in time, and reviewed before expiry.",
            "Repeated or high-impact failures shall be escalated and tracked through corrective action until independently verified as complete."
        ]),
        "",
        section("10. Review, Approval and Document Control", [
            "The document owner shall review this document at least annually or after a major incident, system change, audit finding, legal requirement, or organizational change.",
            "Only the approved edition published in the controlled policy library is authoritative.",
            "Changes shall be recorded with edition, date, description, owner, reviewer, and approver."
        ]),
        "",
        bulletSection("11. References", referencesText(topic.references ?? [], "en")),
        "",
        "12. Approval Fields",
        "Document Owner: ____________________    Reviewer: ____________________",
        "Approving Authority: ________________    Effective Date: ________________",
    ].join("\n");
}
function buildArabic(topic, docType) {
    const operational = docType === "Office Procedure Manual";
    const docTypeAr = {
        Policy: "السياسة",
        "Office Procedure Manual": "الإجراء",
        Guideline: "الدليل الإرشادي",
        Standard: "المعيار",
        Framework: "الإطار",
    };
    const procedureLines = operational ? [
        "تسجيل الطلب أو الحدث أو النشاط المطلوب في السجل أو قناة الخدمة المعتمدة.",
        "تأكيد النطاق والخدمة المتأثرة والمسؤول والاستعجال والاعتماد والتبعيات والأدلة المطلوبة.",
        "تقييم المخاطر واختيار الإجراء المعتمد، بما في ذلك التصعيد أو دعم المورّد أو الاستمرارية أو التراجع عند انطباقه.",
        "تنفيذ الإجراء بطريقة منضبطة وتسجيل الأوقات والقرارات والأدلة الفنية والاتصالات.",
        "التحقق من النتيجة مع مالك الخدمة أو مقدم الطلب واستكمال الإجراءات التصحيحية وتحديث السجلات وعدم الإغلاق إلا بعد تحقق معايير القبول."
    ] : [
        "تحول الأقسام المعنية هذه السياسة إلى إجراءات ونماذج تشغيلية معتمدة.",
        "يحدد المسؤول إجراءات التنفيذ والأدوار والمواعيد والأدلة والمخاطر المتبقية.",
        "تتطلب الاستثناءات مبررًا موثقًا وتقييم مخاطر واعتمادًا من الجهة المختصة وتاريخ انتهاء ومراجعة متابعة."
    ];
    return [
        "مسودة — للمراجعة والاعتماد",
        "تم إعداد هذه الوثيقة بمساعدة آلية، ويجب مراجعتها من مالك الوثيقة وإدارة تقنية المعلومات والجودة/الامتثال والجهة صاحبة الاعتماد قبل استخدامها.",
        "",
        "1. الغرض",
        `تهدف ${docTypeAr[docType] ?? "الوثيقة"} إلى ${topic.purposeAr}.`,
        "",
        "2. النطاق",
        `تطبق هذه الوثيقة على ${topic.scopeAr}.`,
        "",
        bulletSection("3. التعريفات", [
            "القناة المعتمدة: نظام أو نموذج أو بريد أو مسار عمل مصرح به رسميًا لتنفيذ النشاط.",
            "الدليل: سجل يثبت النشاط أو القرار أو الاعتماد أو النتيجة أو الاستثناء.",
            "المسؤول: الدور الذي يتحمل مسؤولية المحافظة على الضابط والتأكد من استكمال الإجراءات المطلوبة.",
            "الاستثناء: خروج معتمد ومحدد المدة عن متطلب بعد تقييم المخاطر وتوثيقها."
        ]),
        "",
        bulletSection("4. الأدوار والمسؤوليات", topic.rolesAr),
        "",
        section("5. متطلبات السياسة", topic.controlsAr),
        "",
        section(operational ? "6. الإجراء التشغيلي" : "6. التنفيذ والضبط", procedureLines),
        "",
        bulletSection("7. السجلات والأدلة", topic.recordsAr),
        "",
        bulletSection("8. المتابعة ومؤشرات الأداء", topic.kpisAr),
        "",
        section("9. الامتثال والاستثناءات والتصعيد", [
            "يُبلغ عن عدم الامتثال أو إخفاق الضابط أو المخاطر الجوهرية عبر قناة الإدارة أو الدعم المعتمدة.",
            "تُوثق الاستثناءات وتُقيّم مخاطرها وتعتمد من الجهة المختصة وتكون محددة المدة وتُراجع قبل انتهائها.",
            "تُصعد الإخفاقات المتكررة أو عالية الأثر وتُتابع من خلال إجراء تصحيحي حتى التحقق المستقل من اكتمالها."
        ]),
        "",
        section("10. المراجعة والاعتماد وضبط الوثيقة", [
            "يراجع مالك الوثيقة هذه الوثيقة سنويًا على الأقل أو بعد حادث كبير أو تغيير جوهري في النظام أو ملاحظة تدقيق أو متطلب نظامي أو تغيير تنظيمي.",
            "يُعد الإصدار المعتمد والمنشور في مكتبة السياسات المضبوطة هو النسخة الرسمية الوحيدة.",
            "تُسجل التغييرات مع رقم الإصدار والتاريخ والوصف والمالك والمراجع والمعتمد."
        ]),
        "",
        bulletSection("11. المراجع", referencesText(topic.references ?? [], "ar")),
        "",
        "12. حقول الاعتماد",
        "مالك الوثيقة: ____________________    المراجع: ____________________",
        "الجهة المعتمدة: __________________    تاريخ النفاذ: ________________",
    ].join("\n");
}
async function openAIPolicyPrompt(prompt) {
    const systemInstructions = `You are a bilingual policy assistant for Saudia Academy. Generate a detailed bilingual policy draft in Arabic and English based on the user's request. Output valid JSON only, with the following keys: detectedLanguage, topicId, title, titleAr, description, descriptionAr, department, documentType, content, contentAr, keywords, keywordsAr, references, reviewNotes, reviewNotesAr. references should be an array of objects with title, titleAr, groupId, page, recordIds. Do not include markdown formatting or explanation outside the JSON.`;
    const userInstructions = `Create a bilingual policy or procedure draft for the request: "${prompt}". Use the active IT OPM style and include structured sections such as purpose, scope, responsibilities, controls, records, KPIs, exceptions, document control, and review requirements. Preferences: department remains Information Technology unless clearly asked otherwise. Document type should be one of Policy, Guideline, Standard, Framework, or Office Procedure Manual.`;
    const response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            temperature: 0.7,
            max_tokens: 1800,
            messages: [
                { role: "system", content: systemInstructions },
                { role: "user", content: userInstructions },
            ],
        }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || "OpenAI request failed");
    }
    const text = String(data.choices?.[0]?.message?.content ?? "");
    return text;
}
function parseJsonString(value) {
    const jsonMatch = value.match(/\{[\s\S]*\}$/);
    const candidate = jsonMatch ? jsonMatch[0] : value;
    try {
        return JSON.parse(candidate);
    }
    catch {
        const cleaned = candidate.replace(/\n```[\s\S]*?```/g, "").trim();
        return JSON.parse(cleaned);
    }
}
function validateOpenAIResult(value) {
    if (!value || typeof value !== "object")
        return false;
    const obj = value;
    return typeof obj.detectedLanguage === "string"
        && typeof obj.topicId === "string"
        && typeof obj.title === "string"
        && typeof obj.titleAr === "string"
        && typeof obj.description === "string"
        && typeof obj.descriptionAr === "string"
        && typeof obj.department === "string"
        && typeof obj.documentType === "string"
        && typeof obj.content === "string"
        && typeof obj.contentAr === "string"
        && Array.isArray(obj.keywords)
        && Array.isArray(obj.keywordsAr)
        && Array.isArray(obj.references)
        && Array.isArray(obj.reviewNotes)
        && Array.isArray(obj.reviewNotesAr);
}
function localPolicyDraft(prompt) {
    const detectedLanguage = detectGeneratorLanguage(prompt);
    const ranked = TOPICS.map(topic => ({ topic, score: scoreTopic(prompt, topic) })).sort((a, b) => b.score - a.score);
    const topic = ranked[0]?.score > 0 ? ranked[0].topic : TOPICS.find(t => t.id === "generic-it");
    const documentType = inferDocumentType(prompt, topic);
    const references = topic.references ?? [];
    const adaptedTitles = titlesForDocumentType(topic, documentType);
    const description = `A bilingual ${documentType.toLowerCase()} draft for Saudia Academy that ${topic.purpose}. The draft includes governance, responsibilities, controls, operating steps, records, KPIs, exceptions, document control, and review requirements.`;
    const descriptionAr = `مسودة ثنائية اللغة من نوع ${documentType === "Policy" ? "سياسة" : documentType === "Standard" ? "معيار" : documentType === "Guideline" ? "دليل إرشادي" : documentType === "Framework" ? "إطار" : "إجراء تشغيلي"} لأكاديمية السعودية، تهدف إلى ${topic.purposeAr}، وتشمل الحوكمة والمسؤوليات والضوابط والخطوات التشغيلية والسجلات ومؤشرات الأداء والاستثناءات وضبط الوثيقة ومتطلبات المراجعة.`;
    return {
        detectedLanguage,
        topicId: topic.id,
        title: adaptedTitles.title,
        titleAr: adaptedTitles.titleAr,
        description,
        descriptionAr,
        department: "Information Technology",
        documentType,
        content: buildEnglish(topic, documentType),
        contentAr: buildArabic(topic, documentType),
        keywords: topic.keywords,
        keywordsAr: topic.keywordsAr,
        references,
        reviewNotes: [
            "This is an AI-assisted draft, not an approved policy.",
            references.length ? "Existing IT OPM controls are cited; verify every imported requirement against the active source before approval." : "No IT OPM source was linked automatically; add authoritative references before approval.",
            "Complete owners, approval authority, dates, retention periods, classifications, and measurable targets before publication.",
        ],
        reviewNotesAr: [
            "هذه مسودة أُعدت بمساعدة آلية وليست سياسة معتمدة.",
            references.length ? "تمت الإشارة إلى ضوابط من دليل IT OPM؛ يجب التحقق من كل متطلب مستورد مقابل المصدر الفعّال قبل الاعتماد." : "لم يُربط مصدر من دليل IT OPM تلقائيًا؛ يجب إضافة المراجع الرسمية قبل الاعتماد.",
            "يجب استكمال المالك وجهة الاعتماد والتواريخ ومدد الاحتفاظ والتصنيفات والمستهدفات القابلة للقياس قبل النشر.",
        ],
        generatedByAI: "local",
    };
}
export async function generatePolicyDraft(prompt) {
    const lang = detectGeneratorLanguage(prompt);
    if (OPENAI_API_KEY) {
        try {
            const raw = await openAIPolicyPrompt(prompt);
            const payload = parseJsonString(raw);
            if (validateOpenAIResult(payload)) {
                return { ...payload, generatedByAI: "openai" };
            }
        }
        catch (error) {
            console.warn("OpenAI policy generation failed, falling back to prompt-aware draft.", error);
        }
    }
    return buildPromptAwareDraft(prompt, lang);
}
export const POLICY_GENERATOR_EXAMPLES = {
    en: [
        "IT support ticket management procedure using Freshdesk, escalation, verification, and closure",
        "Data backup and recovery policy covering daily and monthly backups and restore testing",
        "Cybersecurity incident response policy for phishing, malware, containment, recovery, and evidence",
        "Information-system access control standard covering approvals, privileged access, MFA, and reviews",
    ],
    ar: [
        "إجراء إدارة تذاكر الدعم الفني عبر فريش ديسك مع التصعيد والتحقق والإغلاق",
        "سياسة النسخ الاحتياطي واستعادة البيانات تشمل النسخ اليومي والشهري واختبار الاستعادة",
        "سياسة الاستجابة لحوادث الأمن السيبراني تشمل التصيد والبرمجيات الخبيثة والاحتواء والتعافي والأدلة",
        "معيار التحكم في صلاحيات الأنظمة يشمل الاعتمادات والوصول المميز والمصادقة والمراجعات",
    ],
};
