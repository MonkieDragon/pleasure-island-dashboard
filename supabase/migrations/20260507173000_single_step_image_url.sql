-- Steps: allow a single image only.
-- Convert `puzzle_steps.images` (jsonb) -> `image_url` (text).
-- Per current production state, `images` values are NULL, so this is safe.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'puzzle_steps'
      and column_name = 'images'
  ) then
    alter table public.puzzle_steps
      rename column images to image_url;

    alter table public.puzzle_steps
      alter column image_url type text
      using (
        case
          when image_url is null then null
          when jsonb_typeof(image_url) = 'string' then image_url #>> '{}'
          when jsonb_typeof(image_url) = 'array' then
            case
              when jsonb_array_length(image_url) = 0 then null
              when jsonb_typeof(image_url->0) = 'string' then image_url->>0
              else (image_url->0)::text
            end
          else image_url::text
        end
      );
  end if;
end $$;

alter table public.puzzle_steps
  add constraint puzzle_steps_image_url_not_blank_chk
  check (image_url is null or btrim(image_url) <> '')
  not valid;

