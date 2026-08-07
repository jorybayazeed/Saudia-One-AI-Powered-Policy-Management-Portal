# حزمة IT OPM الجاهزة للإنتاج — RAG

تم تحسين **173 سجلًا** وإنشاء **5061 صياغة بحث** مرتبطة بالسجلات الصحيحة.

## أهم الملفات
- `records_production.jsonl`: السجلات الأساسية؛ استخدم `embedding_text` للـ embeddings و`answer_text` للإجابة.
- `query_expansions.jsonl`: عبارات عامية، كلمات مختصرة، وصياغات إنجليزية مرتبطة بكل سجل.
- `grouped_chunks_production.jsonl`: مجموعات إجراءات موسّعة للأسئلة التي تحتاج سياقًا كاملًا.
- `enriched_records_production.csv`: نسخة مسطحة للتحليل والاستيراد.
- `IT_OPM_RAG_Production.xlsx`: نسخة Excel منظمة.
- `retrieval_config.json`: إعدادات Hybrid Search المقترحة.

## قاعدة مهمة
لا تستخدم الكلمات العامية أو الأخطاء الإملائية كمصدر للإجابة. تستخدم فقط لاسترجاع `answer_text` المعتمد.

## حقول البحث
- `intent`
- `keywords_ar`
- `keywords_en`
- `colloquial_aliases_ar`
- `common_typos`
- `sample_queries`
- `normalized_search_text`
- `embedding_text`

## التدفق المقترح
1. طبّع الاستعلام العربي مع الاحتفاظ بالأصل.
2. نفّذ بحثًا دلاليًا في `embedding_text`.
3. نفّذ BM25/keyword search في العنوان والكلمات والتهجئات.
4. ادمج النتائج بـ RRF.
5. أعد ترتيب أفضل 10 نتائج.
6. أرسل أفضل 3–4 سجلات فقط للنموذج.
7. أجب من `answer_text` مع ذكر Record ID والصفحة.
