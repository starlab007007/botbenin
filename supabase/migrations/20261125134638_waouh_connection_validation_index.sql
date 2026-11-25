-- Avoid a full jobs-table scan for each source when reading its latest evidence.
create index if not exists waouh_collection_jobs_latest_finished_idx
 on public.waouh_collection_jobs(target_id,finished_at desc,id desc)
 where finished_at is not null and status<>'cancelled';
