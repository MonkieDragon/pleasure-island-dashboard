-- Allow a single optional image per chain.

alter table public.puzzle_chains
  add column if not exists image_url text;

alter table public.puzzle_chains
  add constraint puzzle_chains_image_url_not_blank_chk
  check (image_url is null or btrim(image_url) <> '')
  not valid;

