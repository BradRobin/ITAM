-- ITAM profile avatars bucket for Supabase Storage
-- Run this in the Supabase SQL Editor (Dashboard -> SQL -> New query)

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for avatar images (bucket is already public; this is explicit)
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Public read ITAM avatars'
    ) then
        create policy "Public read ITAM avatars"
        on storage.objects
        for select
        to public
        using (bucket_id = 'avatars');
    end if;
end $$;
