import { supabase } from "./supabase";

const BUCKET = "post-images";

// Uploads straight to the public post-images bucket — RLS on storage.objects restricts the
// actual write to admins, this is just the client call.
export async function uploadPostImage(file: File, userId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase isn't configured yet.");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
