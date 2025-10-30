create table if not exists pets (
  token_id bigint primary key,
  fid bigint not null,
  persona jsonb,
  current_level int not null default 1,
  current_image_cid text,
  preview_cid text,
  updated_at timestamptz default now()
);

create table if not exists pet_history (
  token_id bigint not null,
  level int not null,
  image_cid text,
  preview_cid text,
  created_at timestamptz default now()
);

create index if not exists pets_fid_idx on pets(fid);
create index if not exists pet_history_token_idx on pet_history(token_id);
