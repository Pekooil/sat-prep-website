-- SaturnPath V2 constrained detail for the mistake classification "Other".

alter table public.v2_attempts
  add column mistake_classification_detail text
    check (
      mistake_classification_detail is null
      or char_length(mistake_classification_detail) between 1 and 120
    );

create or replace function public.v2_classify_attempt_v2(
  p_user_id uuid,
  p_attempt_id uuid,
  p_classification text,
  p_detail text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.v2_attempts%rowtype;
  v_detail text;
begin
  v_detail := nullif(trim(p_detail), '');
  if p_classification = 'other' and v_detail is null then
    raise exception using errcode = 'P0001', message = 'classification_detail_required';
  end if;
  if p_classification <> 'other' and v_detail is not null then
    raise exception using errcode = 'P0001', message = 'classification_detail_not_allowed';
  end if;
  if char_length(v_detail) > 120 then
    raise exception using errcode = 'P0001', message = 'classification_detail_too_long';
  end if;

  select * into v_attempt
  from public.v2_attempts
  where id = p_attempt_id and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'attempt_not_found';
  end if;
  if v_attempt.classification_idempotency_key is not null then
    if v_attempt.classification_idempotency_key = p_idempotency_key
       and v_attempt.mistake_classification = p_classification
       and v_attempt.mistake_classification_detail is not distinct from v_detail then
      return to_jsonb(v_attempt);
    end if;
    raise exception using errcode = 'P0001', message = 'classification_conflict';
  end if;

  update public.v2_attempts
  set mistake_classification = p_classification,
      mistake_classification_detail = v_detail,
      classified_at = now(),
      classification_idempotency_key = p_idempotency_key
  where id = p_attempt_id
  returning * into v_attempt;

  return to_jsonb(v_attempt);
end;
$$;

revoke all on function public.v2_classify_attempt_v2(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.v2_classify_attempt_v2(uuid, uuid, text, text, text)
  to service_role;
