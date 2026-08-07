#!/usr/bin/env python3
from __future__ import annotations
import argparse, csv, json, re, sys, zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

GROUP_TITLES = {'DOC-METADATA': ('Document Metadata and Use Restrictions', 'Metadata'), 'CH-2': ('Basic Function of the IT Department', 'Topic'), 'SEC-1.2': ('Manual Approval and Amendment Requirements', 'Governance'), 'SEC-1.3': ('Edition History', 'Governance'), 'SEC-1.4': ('Effective Pages Record', 'Governance'), 'SEC-1.5': ('Manual Change Record', 'Governance'), 'SEC-1.6': ('Manual Purpose and Custodianship', 'Governance'), 'SEC-1.7': ('Document Control', 'Governance'), 'SEC-1.7.1': ('Record Keeping and Document Control References', 'Records'), 'SEC-1.7.2': ('Electronic Record Storage, Backup, Retention and Disposal', 'Records'), 'SEC-1.8': ('Abbreviations', 'Reference'), 'SEC-1.9': ('Definitions', 'Reference'), 'SEC-1.10': ('Normative References', 'Reference'), 'SEC-2.1': ('IT Quality Objectives', 'Quality'), 'SEC-2.1.1': ('KPI Framework and Requirements', 'Quality'), 'SEC-2.2': ('IT Organization Reporting Lines', 'Organization'), 'SEC-2.3': ('IT Personnel Responsibilities Reference', 'Organization'), 'SEC-2.4': ('Customer Complaints Handling', 'Process'), 'SEC-2.5': ('Freshdesk Ticketing System', 'System'), 'SEC-2.6': ('Training Management System (TMS)', 'System'), 'SEC-2.7': ('EDRAK Platform', 'System'), 'PROC-2.8': ('System Failure Response and Business Continuity', 'Procedure'), 'PROC-3.1': ('Freshdesk Ticket Troubleshooting and Closure', 'Procedure'), 'PROC-3.2': ('New Training Path Creation', 'Procedure'), 'PROC-4': ('EDRAK Routine Maintenance Policy', 'Procedure'), 'PROC-4.1': ('EDRAK Daily Routine Check and Backup', 'Checklist Procedure'), 'PROC-4.2': ('Monthly LMS Backup', 'Procedure'), 'FORM-5.1': ('IT Forms Index', 'Form'), 'FORM-5.2.1': ('EDRAK Routine Maintenance Card Structure', 'Form')}
ARABIC_TERMS = {'DOC-METADATA': 'دليل إجراءات تقنية المعلومات، الإصدار السادس، تاريخ السريان، أكاديمية السعودية', 'CH-2': 'مهام قسم تقنية المعلومات، إدارة الأجهزة والبرامج، الدعم الفني', 'SEC-1.2': 'اعتماد الدليل، تعديل الدليل، موافقة المدير العام، التعديلات المالية والتوظيف', 'SEC-1.3': 'سجل الإصدارات، تاريخ الإصدار، مراجعة الدليل', 'SEC-1.4': 'سجل الصفحات الفعالة، الصفحات المعتمدة', 'SEC-1.5': 'سجل التغييرات، تحديث الدليل، التعديلات', 'SEC-1.6': 'غرض الدليل، مسؤولية حفظ الدليل', 'SEC-1.7': 'ضبط الوثائق، التحكم في المستندات', 'SEC-1.7.1': 'حفظ السجلات، مراجع ضبط الوثائق', 'SEC-1.7.2': 'تخزين السجلات، النسخ الاحتياطي، مدة الاحتفاظ، إتلاف السجلات', 'SEC-1.8': 'الاختصارات، معاني الاختصارات', 'SEC-1.9': 'التعريفات، المصطلحات', 'SEC-1.10': 'المراجع، الوثائق المرجعية', 'SEC-2.1': 'أهداف الجودة، التزام الدعم الفني، قياس الجودة', 'SEC-2.1.1': 'مؤشرات الأداء، KPI، زمن الاستجابة، نسبة إغلاق التذاكر، الإجراءات التصحيحية', 'SEC-2.2': 'الهيكل التنظيمي، التسلسل الإداري، مدير تقنية المعلومات، أخصائي تقنية المعلومات', 'SEC-2.3': 'مهام ومسؤوليات موظفي تقنية المعلومات', 'SEC-2.4': 'شكاوى العملاء، معالجة الشكاوى، تحويل الشكوى', 'SEC-2.5': 'فريش ديسك، Freshdesk، تذاكر الدعم، فتح تذكرة، متابعة التذاكر، إغلاق التذكرة', 'SEC-2.6': 'نظام إدارة التدريب، TMS، المتدربون، المدربون، الشهادات، الفواتير', 'SEC-2.7': 'إدراك، EDRAK، منصة التعلم، غرفة الاتصالات، استضافة النظام', 'PROC-2.8': 'تعطل النظام، فشل النظام، استمرارية الأعمال، إدراك، فريش ديسك، تي إم إس، الخادم الاحتياطي، السيرفر الاحتياطي', 'PROC-3.1': 'تذكرة دعم، فريش ديسك، حل المشكلة، تحديد السبب، تطبيق الحل، إغلاق التذكرة، تصعيد المشكلة', 'PROC-3.2': 'إنشاء مسار جديد، طلب تدريب، نموذج إنشاء المسار، TMS، مراجعة المسار، قسم التدريب', 'PROC-4': 'صيانة إدراك، الفحص اليومي، بطاقة الصيانة، غرفة الاتصالات، فتح تذكرة', 'PROC-4.1': 'فحص إدراك اليومي، النسخ الاحتياطي، سيرفرات إدراك، درجة حرارة غرفة الاتصالات، SQL، القرص الخارجي', 'PROC-4.2': 'نسخ احتياطي شهري، LMS، H4، H3، نسخ تطبيق LMS', 'FORM-5.1': 'فهرس النماذج، نموذج صيانة إدراك', 'FORM-5.2.1': 'بطاقة صيانة إدراك، نموذج الصيانة، الحقول، التاريخ، التوقيع، الملاحظات'}
PARENT_MAP = {'REC-106': 'REC-105', 'REC-107': 'REC-105', 'REC-108': 'REC-105', 'REC-109': 'REC-105', 'REC-110': 'REC-105', 'REC-113': 'REC-112', 'REC-114': 'REC-112', 'REC-119': 'REC-118', 'REC-120': 'REC-118', 'REC-124': 'REC-123', 'REC-125': 'REC-123', 'REC-128': 'REC-127', 'REC-129': 'REC-127', 'REC-130': 'REC-127', 'REC-131': 'REC-127', 'REC-133': 'REC-132', 'REC-152': 'REC-151', 'REC-153': 'REC-151', 'REC-154': 'REC-151', 'REC-155': 'REC-151', 'REC-156': 'REC-151', 'REC-157': 'REC-151', 'REC-160': 'REC-159', 'REC-067': 'REC-066', 'REC-068': 'REC-066', 'REC-164': 'REC-162', 'REC-165': 'REC-162', 'REC-166': 'REC-162', 'REC-167': 'REC-162', 'REC-168': 'REC-162', 'REC-169': 'REC-162', 'REC-170': 'REC-162', 'REC-171': 'REC-162', 'REC-172': 'REC-162'}
PROCEDURE_SECTIONS = {"2.8","3.1","3.2","4","4.1","4.2"}
FORM_SECTIONS = {"5.1","5.2.1"}
EXPECTED_HEADERS = ['Document_Title', 'Document_Edition', 'Effective_Date', 'Record_ID', 'Record_Type', 'Chapter', 'Section', 'Source_Page', 'Item_Order', 'Title', 'Description', 'Responsible_Role', 'System_or_Asset', 'Frequency_or_Timing', 'Trigger_or_Condition', 'Target_or_Threshold', 'Evidence_or_Record', 'Storage_Location', 'Retention_Period', 'Reference_or_Recipient', 'Chunk_Text']

def clean(v):
    return "" if v is None else str(v).strip()

def col_index(ref):
    m = re.match(r"[A-Z]+", ref.upper())
    if not m:
        raise ValueError(f"Invalid cell reference: {ref}")
    n = 0
    for ch in m.group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1

def read_xlsx_sheet(path, sheet_name):
    with zipfile.ZipFile(path) as zf:
        nsx = {"x":"http://schemas.openxmlformats.org/spreadsheetml/2006/main",
               "r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
        nsp = {"p":"http://schemas.openxmlformats.org/package/2006/relationships"}
        shared = []
        if "xl/sharedStrings.xml" in zf.namelist():
            root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.findall(".//x:t", nsx))
                      for si in root.findall("x:si", nsx)]
        wbroot = ET.fromstring(zf.read("xl/workbook.xml"))
        relroot = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        targets = {r.attrib["Id"]:r.attrib["Target"] for r in relroot.findall("p:Relationship", nsp)}
        target = None
        names = []
        for sh in wbroot.findall("x:sheets/x:sheet", nsx):
            names.append(sh.attrib.get("name",""))
            if sh.attrib.get("name") == sheet_name:
                rid = sh.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
                target = targets[rid].replace("\\","/")
        if target is None:
            raise ValueError(f"Sheet {sheet_name!r} not found. Available: {', '.join(names)}")
        sheet_path = target.lstrip("/") if target.startswith("/") else (target if target.startswith("xl/") else "xl/"+target)
        root = ET.fromstring(zf.read(sheet_path))
    rows = []
    for rn in root.findall(".//x:sheetData/x:row", nsx):
        cells, max_col = {}, -1
        for c in rn.findall("x:c", nsx):
            idx = col_index(c.attrib.get("r",""))
            max_col = max(max_col, idx)
            typ = c.attrib.get("t","")
            v = c.find("x:v", nsx)
            if typ == "inlineStr":
                text = "".join(t.text or "" for t in c.findall(".//x:is/x:t", nsx))
            elif v is None:
                text = ""
            else:
                raw = v.text or ""
                text = shared[int(raw)] if typ == "s" else ("TRUE" if typ=="b" and raw=="1" else "FALSE" if typ=="b" else raw)
            cells[idx] = text
        if max_col >= 0:
            row = [""]*(max_col+1)
            for i,val in cells.items():
                row[i] = val
            rows.append(row)
    return rows

def to_records(matrix):
    if not matrix:
        raise ValueError("Worksheet is empty")
    headers = [clean(x) for x in matrix[0]]
    missing = [h for h in EXPECTED_HEADERS if h not in headers]
    if missing:
        raise ValueError("Missing required columns: "+", ".join(missing))
    records = []
    for raw in matrix[1:]:
        raw = raw + [""]*max(0, len(headers)-len(raw))
        r = {h:clean(raw[i]) for i,h in enumerate(headers)}
        if r.get("Record_ID"):
            records.append(r)
    return headers, records

def group_id(r):
    sec, ch = clean(r.get("Section")), clean(r.get("Chapter"))
    if sec in PROCEDURE_SECTIONS: return "PROC-"+sec
    if sec in FORM_SECTIONS: return "FORM-"+sec
    if sec: return "SEC-"+sec
    if ch: return "CH-"+ch
    return "DOC-METADATA"

def uniq(values):
    out, seen = [], set()
    for v in values:
        v = clean(v)
        if v and v not in seen:
            seen.add(v); out.append(v)
    return ", ".join(out)

def category(r, gid):
    rt = clean(r.get("Record_Type")).lower()
    if gid.startswith("PROC-"): return "Procedure"
    if gid.startswith("FORM-"): return "Form"
    if any(x in rt for x in ("metadata","edition","change record","approval record")): return "Metadata/Governance"
    if "requirement" in rt or "policy" in rt: return "Requirement/Policy"
    if "system" in rt or "hosting" in rt: return "System Knowledge"
    if any(x in rt for x in ("record","storage","retention","disposal")): return "Records Management"
    return "Reference/Knowledge"

OPTIONAL_FIELDS = [
    ("Responsible role","Responsible_Role"),("System or asset","System_or_Asset"),
    ("Frequency or timing","Frequency_or_Timing"),("Trigger or condition","Trigger_or_Condition"),
    ("Target or threshold","Target_or_Threshold"),("Evidence or record","Evidence_or_Record"),
    ("Storage location","Storage_Location"),("Retention period","Retention_Period"),
    ("Reference or recipient","Reference_or_Recipient")
]

def record_chunk(r, gid, title):
    parts = [
        f"Document: {clean(r.get('Document_Title'))}", f"Edition: {clean(r.get('Document_Edition'))}",
        f"Effective date: {clean(r.get('Effective_Date'))}", f"Retrieval group: {gid}",
        f"Group title: {title}", f"Record ID: {clean(r.get('Record_ID'))}",
        f"Record type: {clean(r.get('Record_Type'))}"
    ]
    for label,key in (("Chapter","Chapter"),("Section","Section"),("Page","Source_Page"),("Sequence","Item_Order")):
        if clean(r.get(key)): parts.append(f"{label}: {clean(r[key])}")
    parent = PARENT_MAP.get(clean(r.get("Record_ID")),"")
    if parent: parts.append(f"Parent record: {parent}")
    parts += [f"Title: {clean(r.get('Title'))}", f"Content: {clean(r.get('Description'))}"]
    for label,key in OPTIONAL_FIELDS:
        if clean(r.get(key)): parts.append(f"{label}: {clean(r[key])}")
    if ARABIC_TERMS.get(gid): parts.append("Arabic search terms: "+ARABIC_TERMS[gid])
    return " | ".join(parts)

def grouped_chunk(gid, recs):
    title, gtype = GROUP_TITLES.get(gid, (gid,"Topic"))
    first = recs[0]
    chapters, sections, pages = uniq(r.get("Chapter") for r in recs), uniq(r.get("Section") for r in recs), uniq(r.get("Source_Page") for r in recs)
    systems, roles = uniq(r.get("System_or_Asset") for r in recs), uniq(r.get("Responsible_Role") for r in recs)
    ids = ", ".join(r["Record_ID"] for r in recs)
    lines = [f"# {title}","",f"Document: {first['Document_Title']}",f"Edition: {first['Document_Edition']}",
             f"Effective date: {first['Effective_Date']}",f"Retrieval group ID: {gid}",f"Group type: {gtype}"]
    for label,val in (("Chapter",chapters),("Section",sections),("Source page(s)",pages),("System(s) or asset(s)",systems),("Responsible role(s)",roles)):
        if val: lines.append(f"{label}: {val}")
    if ARABIC_TERMS.get(gid): lines += ["","## Arabic Search Terms","",ARABIC_TERMS[gid]]
    lines += ["","## Records",""]
    for r in recs:
        order = clean(r.get("Item_Order"))
        head = f"{order}. {r['Title']}" if order else f"- {r['Title']}"
        rid = r["Record_ID"]
        lines += [f"{head} [{rid}; {r['Record_Type']}]", f"  {r['Description']}"]
        meta = []
        for label,key in OPTIONAL_FIELDS:
            if clean(r.get(key)): meta.append(f"{label}: {r[key]}")
        if PARENT_MAP.get(rid): meta.append("Parent record: "+PARENT_MAP[rid])
        if meta: lines.append("  "+" | ".join(meta))
        lines.append("")
    lines += ["## Source Records","",ids,""]
    text = "\n".join(lines)
    return text, {
        "retrieval_group_id":gid,"group_title":title,"group_type":gtype,"chapter":chapters,
        "section":sections,"source_pages":pages,"source_record_ids":ids,"record_count":len(recs),
        "systems_or_assets":systems,"responsible_roles":roles,"arabic_search_terms":ARABIC_TERMS.get(gid,""),
        "status":"Active","text":text
    }

def safe_filename(gid, title):
    slug = re.sub(r"[^A-Za-z0-9._-]+","-",title).strip("-")
    return gid.replace(".","_")+"_"+slug+".md"

def build(src, out, sheet):
    headers, records = to_records(read_xlsx_sheet(src, sheet))
    out.mkdir(parents=True, exist_ok=True)
    md = out/"markdown"; md.mkdir(exist_ok=True)
    extra = ["Retrieval_Group_ID","Group_Title","Parent_Record_ID","Sequence_Path","RAG_Category",
             "Arabic_Search_Terms","RAG_Chunk_Text","Record_Status"]
    groups, order, enriched = defaultdict(list), [], []
    for r in records:
        gid = group_id(r)
        if gid not in groups: order.append(gid)
        groups[gid].append(r)
        title = GROUP_TITLES.get(gid,(gid,"Topic"))[0]
        e = dict(r)
        e.update({"Retrieval_Group_ID":gid,"Group_Title":title,"Parent_Record_ID":PARENT_MAP.get(r["Record_ID"],""),
                  "Sequence_Path":r.get("Item_Order",""),"RAG_Category":category(r,gid),
                  "Arabic_Search_Terms":ARABIC_TERMS.get(gid,""),"RAG_Chunk_Text":record_chunk(r,gid,title),
                  "Record_Status":"Active"})
        enriched.append(e)
    with (out/"enriched_records.csv").open("w",encoding="utf-8-sig",newline="") as f:
        w = csv.DictWriter(f, fieldnames=headers+extra); w.writeheader(); w.writerows(enriched)
    with (out/"records.jsonl").open("w",encoding="utf-8") as f:
        for r in enriched:
            obj = {"id":r["Record_ID"],"text":r["RAG_Chunk_Text"],"metadata":{
                "record_id":r["Record_ID"],"record_type":r["Record_Type"],"retrieval_group_id":r["Retrieval_Group_ID"],
                "group_title":r["Group_Title"],"parent_record_id":r["Parent_Record_ID"],"sequence_path":r["Sequence_Path"],
                "chapter":r["Chapter"],"section":r["Section"],"source_page":r["Source_Page"],
                "system_or_asset":r["System_or_Asset"],"status":r["Record_Status"]}}
            f.write(json.dumps(obj,ensure_ascii=False)+"\n")
    manifest_groups = []
    with (out/"grouped_chunks.jsonl").open("w",encoding="utf-8") as f:
        for gid in order:
            text,obj = grouped_chunk(gid,groups[gid])
            name = safe_filename(gid,obj["group_title"])
            (md/name).write_text(text,encoding="utf-8")
            obj["markdown_file"]="markdown/"+name
            f.write(json.dumps(obj,ensure_ascii=False)+"\n")
            manifest_groups.append({k:obj[k] for k in ("retrieval_group_id","group_title","group_type","record_count","markdown_file")})
    manifest = {"source_file":src.name,"source_sheet":sheet,"record_count":len(records),"group_count":len(order),
                "active_edition":records[0].get("Document_Edition","") if records else "",
                "effective_date":records[0].get("Effective_Date","") if records else "",
                "recommended_strategy":{"procedure_questions":"Retrieve grouped_chunks first.",
                    "narrow_factual_questions":"Retrieve records.jsonl and expand by retrieval_group_id.",
                    "answer_citations":"Include Record_ID, Section and Source_Page.",
                    "fallback":"لم أجد إجراءً معتمدًا يغطي هذه الحالة."},
                "groups":manifest_groups}
    (out/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Created {len(records)} record chunks and {len(order)} grouped chunks in {out.resolve()}")

def main():
    p=argparse.ArgumentParser(description="Build IT OPM RAG chunks from the reviewed Excel dataset.")
    p.add_argument("input_xlsx",type=Path); p.add_argument("output_folder",type=Path)
    p.add_argument("--sheet",default="Reviewed Dataset")
    a=p.parse_args()
    if not a.input_xlsx.exists():
        print(f"Input file not found: {a.input_xlsx}",file=sys.stderr); return 2
    try: build(a.input_xlsx,a.output_folder,a.sheet)
    except Exception as exc:
        print(f"Error: {exc}",file=sys.stderr); return 1
    return 0

if __name__=="__main__":
    raise SystemExit(main())
