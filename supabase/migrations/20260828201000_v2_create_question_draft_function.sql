-- Atomic, service-role-only creation of a question, immutable first version,
-- and server-only answer key.

create or replace function public.v2_create_question_draft(
  p_actor_id uuid,
  p_section text,
  p_domain_key text,
  p_skill_key text,
  p_subskill_key text,
  p_response_type text,
  p_authoring_difficulty text,
  p_expected_seconds integer,
  p_source_type text,
  p_source_reference text,
  p_rights_status text,
  p_generator_provider text,
  p_generator_model text,
  p_prompt_version text,
  p_stimulus text,
  p_stem text,
  p_choices jsonb,
  p_response_config jsonb,
  p_visual_assets jsonb,
  p_accessibility_text text,
  p_change_reason text,
  p_content_fingerprint text,
  p_correct_answer jsonb,
  p_explanation text,
  p_distractor_rationales jsonb,
  p_validation_evidence jsonb
)
returns table(question_id uuid, version_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  created_question_id uuid;
  created_version_id uuid;
begin
  insert into public.v2_questions (
    section, domain_key, skill_key, subskill_key, response_type,
    authoring_difficulty, expected_seconds, status, source_type,
    source_reference, rights_status, generator_provider, generator_model,
    prompt_version
  ) values (
    p_section, p_domain_key, p_skill_key, p_subskill_key, p_response_type,
    p_authoring_difficulty, p_expected_seconds, 'needs_review', p_source_type,
    p_source_reference, p_rights_status, p_generator_provider, p_generator_model,
    p_prompt_version
  ) returning id into created_question_id;

  insert into public.v2_question_versions (
    question_id, version_number, stimulus, stem, choices, response_config,
    visual_assets, accessibility_text, change_reason, content_fingerprint,
    created_by
  ) values (
    created_question_id, 1, p_stimulus, p_stem, p_choices, p_response_config,
    p_visual_assets, p_accessibility_text, p_change_reason,
    p_content_fingerprint, p_actor_id
  ) returning id into created_version_id;

  insert into public.v2_question_keys (
    question_version_id, correct_answer, explanation,
    distractor_rationales, validation_evidence
  ) values (
    created_version_id, p_correct_answer, p_explanation,
    p_distractor_rationales, p_validation_evidence
  );

  update public.v2_questions
  set current_version_id = created_version_id
  where id = created_question_id;

  return query select created_question_id, created_version_id;
end;
$$;

revoke all on function public.v2_create_question_draft(uuid,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) from public;
revoke all on function public.v2_create_question_draft(uuid,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) from anon;
revoke all on function public.v2_create_question_draft(uuid,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) from authenticated;
grant execute on function public.v2_create_question_draft(uuid,text,text,text,text,text,text,integer,text,text,text,text,text,text,text,text,jsonb,jsonb,jsonb,text,text,text,jsonb,text,jsonb,jsonb) to service_role;
