import json, sys
from collections import defaultdict
def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(x) for x in f if x.strip()]
gold={x["eval_id"]:x for x in read_jsonl(sys.argv[1])}
pred={x["eval_id"]:x for x in read_jsonl(sys.argv[2])}
n=len(gold); hit1=hit5=0; rr=0.0; behavior=0; citation=0; answer_cases=0
by_type=defaultdict(lambda:[0,0])
for eid,g in gold.items():
    p=pred.get(eid,{})
    got=p.get("retrieved_record_ids",[])
    exp=g.get("expected_record_ids",[])
    if exp:
        answer_cases+=1
        ranks=[got.index(x)+1 for x in exp if x in got]
        if ranks:
            rr+=1/min(ranks)
            if min(ranks)==1: hit1+=1
            if min(ranks)<=5: hit5+=1
        if set(p.get("citation_record_ids",[])) & set(exp): citation+=1
    ok=p.get("behavior")==g.get("expected_behavior")
    behavior+=int(ok)
    by_type[g.get("query_type","unknown")][0]+=int(ok)
    by_type[g.get("query_type","unknown")][1]+=1
print(json.dumps({
 "total":n,"answer_cases":answer_cases,
 "Recall@1":hit1/max(answer_cases,1),"Recall@5":hit5/max(answer_cases,1),
 "MRR":rr/max(answer_cases,1),"behavior_accuracy":behavior/max(n,1),
 "citation_accuracy":citation/max(answer_cases,1),
 "behavior_by_query_type":{k:v[0]/v[1] for k,v in by_type.items()}
},ensure_ascii=False,indent=2))
