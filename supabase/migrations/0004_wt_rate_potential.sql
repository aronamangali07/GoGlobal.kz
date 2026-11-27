-- W&T: поле «потенциально до $/час» (ставка с чаевыми) — нужно калькулятору заработка
update public.programs
set offer_schema = (
  select jsonb_agg(f order by ord)
  from (
    select f, ord from jsonb_array_elements(offer_schema) with ordinality as e(f, ord)
    union all
    select '{"key":"rate_potential","label":"С чаевыми — до","type":"money","unit":"$/час","group":"money"}'::jsonb, 8.5
  ) s
)
where slug = 'work-and-travel'
  and not offer_schema @> '[{"key":"rate_potential"}]'::jsonb;
