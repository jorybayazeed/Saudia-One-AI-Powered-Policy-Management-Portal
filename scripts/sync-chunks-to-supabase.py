#!/usr/bin/env python3
import csv, json, os, pathlib, sys, urllib.request

repo_root = pathlib.Path(__file__).resolve().parents[1]
env_path = repo_root / '.env.local'
env = {}
if env_path.exists():
    for line in env_path.read_text(encoding='utf8').splitlines():
        line=line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k,v=line.split('=',1)
            env[k.strip()] = v.strip().strip('"')

SUPABASE_URL = env.get('VITE_SUPABASE_URL') or os.environ.get('VITE_SUPABASE_URL')
SERVICE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SUPABASE_URL or not SERVICE_KEY:
    print('Missing SUPABASE settings in .env.local or environment')
    sys.exit(1)

csv_path = repo_root / 'knowledge-source' / 'enriched_records.csv'
if not csv_path.exists():
    print('CSV not found:', csv_path)
    sys.exit(1)

headers = {'Content-Type':'application/json', 'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}', 'Prefer': 'resolution=merge-duplicates'}
endpoint = SUPABASE_URL.rstrip('/') + '/rest/v1/knowledge_chunks?on_conflict=id'

batch = []
BATCH_SIZE = 200

def send_batch(batch):
    if not batch: return
    # deduplicate by id to avoid PostgREST ON CONFLICT errors when same id appears multiple times in payload
    unique = {}
    for obj in batch:
        obj_id = obj.get('id')
        if obj_id is None:
            continue
        unique[obj_id] = obj
    payload = list(unique.values())
    data = json.dumps(payload).encode('utf8')
    req = urllib.request.Request(endpoint, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            resp = r.read().decode('utf8')
            print('Imported batch size', len(batch))
    except urllib.error.HTTPError as e:
        print('HTTPError', e.code, e.read().decode())
    except Exception as e:
        print('Error sending batch', e)

with open(csv_path, newline='', encoding='utf8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # build id from retrieval group and item order if present
        rg = (row.get('Retrieval_Group_ID') or row.get('Retrieval_Group_ID'.lower()) or '').strip()
        item = (row.get('Item_Order') or row.get('Item_Order'.lower()) or row.get('Item_Order'.upper()) or '').strip()
        if not rg:
            # fallback to Record_ID
            rg = (row.get('Record_ID') or row.get('Record_ID'.lower()) or '').strip()
        id_val = f"{rg}__{item}" if item else rg
        # ensure every object has the same keys (PostgREST requires consistent object keys)
        cols = [
            'id','document_title','document_edition','effective_date','record_id','record_type','chapter','section','source_page','item_order',
            'title','description','responsible_role','system_or_asset','frequency_or_timing','trigger_or_condition','target_or_threshold','evidence_or_record',
            'storage_location','retention_period','reference_or_recipient','chunk_text','retrieval_group_id','group_title','parent_record_id','sequence_path',
            'rag_category','arabic_search_terms','rag_chunk_text','record_status','arabic_keywords','arabic_colloquial_aliases','sample_user_queries_ar','normalized_search_text','hybrid_search_text'
        ]

        record = {}
        for c in cols:
            record[c] = None

        record['id'] = id_val
        record['document_title'] = row.get('Document_Title')
        record['document_edition'] = row.get('Document_Edition')
        record['effective_date'] = row.get('Effective_Date')
        record['record_id'] = row.get('Record_ID')
        record['record_type'] = row.get('Record_Type')
        record['chapter'] = row.get('Chapter')
        record['section'] = row.get('Section')
        record['source_page'] = row.get('Source_Page')
        record['item_order'] = int(row.get('Item_Order')) if row.get('Item_Order') and row.get('Item_Order').isdigit() else None
        record['title'] = row.get('Title')
        record['description'] = row.get('Description')
        record['responsible_role'] = row.get('Responsible_Role')
        record['system_or_asset'] = row.get('System_or_Asset')
        record['frequency_or_timing'] = row.get('Frequency_or_Timing')
        record['trigger_or_condition'] = row.get('Trigger_or_Condition')
        record['target_or_threshold'] = row.get('Target_or_Threshold')
        record['evidence_or_record'] = row.get('Evidence_or_Record')
        record['storage_location'] = row.get('Storage_Location')
        record['retention_period'] = row.get('Retention_Period')
        record['reference_or_recipient'] = row.get('Reference_or_Recipient')
        record['chunk_text'] = row.get('Chunk_Text')
        record['retrieval_group_id'] = row.get('Retrieval_Group_ID')
        record['group_title'] = row.get('Group_Title')
        record['parent_record_id'] = row.get('Parent_Record_ID')
        record['sequence_path'] = row.get('Sequence_Path')
        record['rag_category'] = row.get('RAG_Category')
        record['arabic_search_terms'] = row.get('Arabic_Search_Terms')
        record['rag_chunk_text'] = row.get('RAG_Chunk_Text')
        record['record_status'] = row.get('Record_Status')
        record['arabic_keywords'] = row.get('Arabic_Keywords')
        record['arabic_colloquial_aliases'] = row.get('Arabic_Colloquial_Aliases')
        record['sample_user_queries_ar'] = row.get('Sample_User_Queries_AR')
        record['normalized_search_text'] = row.get('Normalized_Search_Text')
        record['hybrid_search_text'] = row.get('Hybrid_Search_Text')

        batch.append(record)
        if len(batch) >= BATCH_SIZE:
            send_batch(batch)
            batch = []
    if batch:
        send_batch(batch)

print('Done')
