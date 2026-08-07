# Saudia One — IT OPM Enterprise v1.8

A bilingual, local-first application grounded in **IT_OPM_RAG_Enterprise v3.0**.

## Version 1.8 highlights

- Preserves the existing v1.7 interface: the compiled CSS and `dist/index.html` are unchanged.
- Adds entity-first and intent-first routing for EDRAK, TMS, LMS, Freshdesk, backup, links, email, responsibilities, timing, and procedures.
- Uses conversation context for short follow-ups such as “What is the link?”, “Give me the email”, and “Who is responsible?”.
- Rejects mismatched entities instead of returning an unrelated but valid IT record.
- Improves Arabic, Jeddah colloquial Arabic, English, and mixed-language queries.
- Keeps answers grounded in approved `answer_text`, `answer_fields`, and `structured_steps` only.
- Preserves voice support, approved links, policy generation, conversation storage, source records, sections, and page references.


## الحسابات التجريبية:
```bash
admin@academy.demo / 123456
employee@academy.demo / 123456
academic@academy.demo / 123456
```

## Fast macOS launch

Right-click `تشغيل_البرنامج_على_ماك.command` and choose **Open**, or run:

```bash
chmod +x تشغيل_البرنامج_على_ماك.command
./تشغيل_البرنامج_على_ماك.command
```

Normal use serves the prebuilt `dist` folder and does not require `npm install`.

## Development

```bash
npm install --verbose
npm ci
npm run dev
```
