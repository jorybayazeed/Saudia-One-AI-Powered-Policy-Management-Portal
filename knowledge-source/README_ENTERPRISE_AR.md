# IT OPM RAG — Enterprise Edition

تم بناء طبقة RAG قابلة للاختبار والتشغيل:

- 173 atomic chunks
- 29 procedure chunks
- 29 summary chunks
- 49 entities
- 355 relations
- 173 hard-negative sets
- 1067 evaluation cases

## الاستخدام
- Embeddings: `dense_text`
- BM25 والكلمات: `sparse_text`
- الإجابة: `answer_text` أو `answer_fields` فقط
- الاستشهاد: Record ID + Section + Source Page

## اختيار الطبقة
- من/متى/وين/كم: atomic
- كيف/الخطوات/الإجراء: procedure
- سؤال عام أو مبهم: summary ثم clarification

## القياس
نفّذ الاسترجاع على `evaluation_dataset.jsonl` ثم احفظ:
`{"eval_id":"...","retrieved_record_ids":[],"behavior":"answer|clarify|abstain","citation_record_ids":[]}`
في `predictions.jsonl`، وبعدها:
`python evaluate_retrieval.py evaluation_dataset.jsonl predictions.jsonl`
