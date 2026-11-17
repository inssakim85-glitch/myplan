-- MyPlan 데이터베이스 설정
-- Supabase 대시보드 → SQL Editor → New query 에 전체를 붙여넣고 Run 하세요. (여러 번 실행해도 안전합니다)

-- 1) 사용자별 데이터 저장 테이블
--    doc: schedule(일정·할 일) / goals(목표) / life(라이프 플랜) / finance(자산) / ipo(공모주) / settings(설정)
create table if not exists public.user_docs (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  doc        text        not null check (doc ~ '^[a-z_]{1,30}$'),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, doc)
);

-- 2) 행 수준 보안(RLS): 로그인한 본인 데이터만 읽고 쓸 수 있게
alter table public.user_docs enable row level security;

drop policy if exists "본인 데이터 조회" on public.user_docs;
drop policy if exists "본인 데이터 추가" on public.user_docs;
drop policy if exists "본인 데이터 수정" on public.user_docs;
drop policy if exists "본인 데이터 삭제" on public.user_docs;

create policy "본인 데이터 조회" on public.user_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "본인 데이터 추가" on public.user_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "본인 데이터 수정" on public.user_docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "본인 데이터 삭제" on public.user_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 3) 여러 기기 실시간 동기화 (PC에서 고치면 휴대폰에도 바로 반영)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_docs'
  ) then
    alter publication supabase_realtime add table public.user_docs;
  end if;
end $$;
