import type { SupabaseClient } from '@supabase/supabase-js';

type StorageCleanupResult = {
  removed: string[];
  error: string | null;
};

/**
 * Keep exactly one flat object in a user's private KYC folder.
 * KYC routes store files at `<profileId>/<canonical-name>`; this removes older
 * extension variants such as `.jpg`, `.png`, or `.webp` after the new upload wins.
 */
export async function removeOtherUserStorageObjects(
  supabase: SupabaseClient,
  bucket: string,
  profileId: string,
  keepPath: string,
): Promise<StorageCleanupResult> {
  const { data, error: listError } = await supabase.storage.from(bucket).list(profileId, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (listError) {
    return { removed: [], error: listError.message };
  }

  const stalePaths = (data ?? [])
    .filter((item) => item.name && `${profileId}/${item.name}` !== keepPath)
    .map((item) => `${profileId}/${item.name}`);

  if (stalePaths.length === 0) {
    return { removed: [], error: null };
  }

  const { error: removeError } = await supabase.storage.from(bucket).remove(stalePaths);
  return {
    removed: removeError ? [] : stalePaths,
    error: removeError?.message ?? null,
  };
}
