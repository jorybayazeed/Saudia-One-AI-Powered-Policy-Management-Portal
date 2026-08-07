# دليل البحث السهل للشات بوت

## الحقول الأفضل للفهرسة
- `search_text`: النص الكامل للتضمين Embedding.
- `normalized_search_text`: للبحث بالكلمات بعد توحيد الحروف العربية.
- `keywords_ar`: كلمات مفتاحية مباشرة.
- `colloquial_aliases_ar`: صيغ عامية وبدائل كتابة.
- `sample_queries_ar`: أمثلة لأسئلة المستخدم.

## استراتيجية الاسترجاع الموصى بها
استخدم Hybrid Search: بحث دلالي بالـ embeddings + بحث كلمات BM25/Full-text. اجمع النتائج، ثم طبّق reranking.

## إعدادات أولية
- فهرس دلالي على `search_text`.
- فهرس كلمات على `normalized_search_text`, `keywords_ar`, و`colloquial_aliases_ar`.
- أعطِ تطابق `Record_ID` واسم النظام والكلمات المفتاحية وزنًا أعلى.
- استرجع 8-12 نتيجة أولية ثم أعد ترتيب أفضل 4-6 نتائج.
- لا تعتمد على embeddings وحدها عند البحث بكلمة واحدة مثل: باك اب، تكت، إدراك، KPI.
