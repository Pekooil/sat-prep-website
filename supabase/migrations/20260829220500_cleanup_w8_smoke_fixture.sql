-- Remove only disposable W8 lifecycle smoke fixtures created before the test
-- was changed to reuse approved questions. Production data never uses either
-- marker. Immutable content triggers are restored in the same transaction.

alter table public.v2_question_audit_log disable trigger v2_question_audit_log_immutable;
alter table public.v2_question_reviews disable trigger v2_question_reviews_immutable;
alter table public.v2_question_keys disable trigger v2_question_keys_immutable;
alter table public.v2_question_versions disable trigger v2_question_versions_immutable;

delete from public.v2_question_audit_log audit
using public.v2_questions question
where audit.question_id = question.id
  and question.source_reference like 'w8-lifecycle-smoke-%';

delete from public.v2_question_reviews review
using public.v2_question_versions version, public.v2_questions question
where review.question_version_id = version.id
  and version.question_id = question.id
  and question.source_reference like 'w8-lifecycle-smoke-%';

delete from public.v2_question_keys key
using public.v2_question_versions version, public.v2_questions question
where key.question_version_id = version.id
  and version.question_id = question.id
  and question.source_reference like 'w8-lifecycle-smoke-%';

delete from public.v2_question_versions version
using public.v2_questions question
where version.question_id = question.id
  and question.source_reference like 'w8-lifecycle-smoke-%';

delete from public.v2_question_metrics metrics
using public.v2_questions question
where metrics.question_id = question.id
  and question.source_reference like 'w8-lifecycle-smoke-%';

delete from public.v2_questions
where source_reference like 'w8-lifecycle-smoke-%';

alter table public.v2_question_versions enable trigger v2_question_versions_immutable;
alter table public.v2_question_keys enable trigger v2_question_keys_immutable;
alter table public.v2_question_reviews enable trigger v2_question_reviews_immutable;
alter table public.v2_question_audit_log enable trigger v2_question_audit_log_immutable;

delete from auth.users
where raw_user_meta_data->>'purpose' = 'saturnpath-v2-w8-review-evidence';
