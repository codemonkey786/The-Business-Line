import { supabase } from "./supabase";

const BUCKET = "avatars";

// Always the same path per user (upsert: true) so re-uploading replaces your old avatar
// instead of littering the bucket with one file per change. The cache-busting query param is
// necessary because the URL itself never changes, so the browser/CDN would otherwise keep
// showing the old image after a replace.
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase isn't configured yet.");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
