import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { containsProfanity } from "../lib/profanity";
import type { Post, PostStatus } from "../lib/types";

function fromRow(row: {
  id: string;
  author_id: string;
  author_name: string;
  headline: string;
  body: string;
  image_url: string | null;
  symbol: string | null;
  status: string;
  created_at: string;
}): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    headline: row.headline,
    body: row.body,
    imageUrl: row.image_url ?? undefined,
    symbol: row.symbol ?? undefined,
    status: row.status === "pending" ? "pending" : "published",
    createdAt: new Date(row.created_at).getTime(),
  };
}

const COLUMNS = "id, author_id, author_name, headline, body, image_url, symbol, status, created_at";

// Admin-authored posts, shown in the feed alongside real market news — real user-generated
// content, not fabricated headlines, so it comes straight from the posts table with no local
// fallback. RLS only returns published posts plus your own/pending-for-review ones, so
// "everything this hook has" is already exactly what you're allowed to see.
export function usePosts(user: User | null) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("posts").select(COLUMNS).order("created_at", { ascending: false });
    setPosts((data ?? []).map(fromRow));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPost = useCallback(
    async (headline: string, body: string, imageUrl?: string, symbol?: string): Promise<Post> => {
      if (!supabase || !user) throw new Error("Not signed in.");
      const authorName = (user.user_metadata as { display_name?: string } | undefined)?.display_name || user.email || "Staff";
      // A post with flagged language never goes straight to the public feed — it's held as
      // "pending" until an admin approves it.
      const status: PostStatus = containsProfanity(headline, body) ? "pending" : "published";
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          author_name: authorName,
          headline,
          body,
          image_url: imageUrl || null,
          symbol: symbol || null,
          status,
        })
        .select(COLUMNS)
        .single();
      if (error) throw error;
      const post = fromRow(data);
      setPosts((prev) => [post, ...prev]);
      return post;
    },
    [user]
  );

  const deletePost = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const approvePost = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("posts").update({ status: "published" }).eq("id", id);
    if (!error) setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "published" } : p)));
  }, []);

  return { posts, loading, createPost, deletePost, approvePost };
}
