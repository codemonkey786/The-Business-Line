import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Clock, ImagePlus, Newspaper, X } from "lucide-react";
import { StockSearch } from "./StockSearch";
import { uploadPostImage } from "../lib/postImages";
import { parsePostBody, type ImageAlign } from "../lib/postContent";
import type { Post } from "../lib/types";

interface Props {
  userId: string;
  // Present when editing an already-published post instead of writing a new one.
  post?: Post;
  onCreate: (headline: string, body: string, imageUrl?: string, symbol?: string, credits?: string) => Promise<Post>;
  onUpdate?: (id: string, headline: string, body: string, imageUrl?: string, symbol?: string, credits?: string) => Promise<void>;
  onClose: () => void;
}

function imageClassFor(align: ImageAlign): string {
  const base = "max-h-40 rounded-lg my-2 object-contain cursor-pointer";
  if (align === "left") return `${base} float-left mr-3 max-w-[45%]`;
  if (align === "right") return `${base} float-right ml-3 max-w-[45%]`;
  return `${base} block max-w-full mx-auto`;
}

// Rebuilds the editor's DOM (text + <br> + <img> nodes) from a post's stored "![](url)"-marker
// body — the exact inverse of serializeEditor below, so hydrating an existing post for editing
// round-trips losslessly through the same format new posts are already saved in.
function blocksToEditorHtml(body: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return parsePostBody(body)
    .map((b) => {
      if (b.type === "image") {
        const safeUrl = b.url.replace(/"/g, "&quot;");
        return `<img src="${safeUrl}" data-url="${safeUrl}" data-align="${b.align}" contenteditable="false" class="${imageClassFor(b.align)}" />`;
      }
      return b.text.split("\n").map(escape).join("<br>");
    })
    .join("<br>");
}

export function PostComposer({ userId, post, onCreate, onUpdate, onClose }: Props) {
  const [headline, setHeadline] = useState(post?.headline ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [imageUrl, setImageUrl] = useState(post?.imageUrl ?? "");
  const [symbol, setSymbol] = useState<string | null>(post?.symbol ?? null);
  const [credits, setCredits] = useState(post?.credits ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [alignToolbar, setAlignToolbar] = useState<{ img: HTMLImageElement; top: number; left: number } | null>(null);
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // contentEditable isn't a controlled input — its initial content has to be set directly on
  // the DOM node once, not passed as a React prop, or React's own re-render would wipe out
  // whatever the browser does with typed/pasted content in between.
  useEffect(() => {
    if (post && bodyRef.current) {
      bodyRef.current.innerHTML = blocksToEditorHtml(post.body);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadPostImage(file, userId);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // Reads the body editor's DOM (text, <br>, and <img> nodes) back into the same
  // "![](url)"-marker plain-text format the reader already knows how to parse.
  function syncBodyFromEditor() {
    const el = bodyRef.current;
    if (!el) return;
    setBody(serializeEditor(el));
  }

  function serializeEditor(node: Node): string {
    let out = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? "";
      } else if (child.nodeName === "BR") {
        out += "\n";
      } else if (child.nodeName === "IMG") {
        const imgEl = child as HTMLImageElement;
        const url = imgEl.dataset.url ?? imgEl.src;
        const align = imgEl.dataset.align === "left" || imgEl.dataset.align === "right" ? imgEl.dataset.align : "";
        out += `![${align}](${url})`;
      } else {
        out += serializeEditor(child) + "\n";
      }
    });
    return out;
  }

  // Keeps the last real cursor position inside the body editor so a click on the toolbar
  // button (which steals focus/selection) still inserts the image where the user was typing.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && bodyRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function insertHtmlAtSavedSelection(html: string) {
    const el = bodyRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
    document.execCommand("insertHTML", false, html);
    savedRangeRef.current = null;
  }

  // Shows a genuine scaled-down thumbnail right where you're writing instead of a raw URL —
  // an actual <img> node inserted into the editor, not just text.
  async function handleInlineFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setInsertingImage(true);
    try {
      const url = await uploadPostImage(file, userId);
      const safeUrl = url.replace(/"/g, "&quot;");
      insertHtmlAtSavedSelection(
        `<br><img src="${safeUrl}" data-url="${safeUrl}" data-align="center" contenteditable="false" class="${imageClassFor("center")}" /><br>`
      );
      syncBodyFromEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setInsertingImage(false);
    }
  }

  // Pasting an article from a news site (or anywhere rich-text) hands the browser's default
  // paste handler that source page's actual HTML — its own fonts, colors, heading sizes, links,
  // sometimes whole layout chrome — which then renders straight into this dark editor and reads
  // as "glitching" (invisible black-on-black text, huge headings, broken spacing). Stripping to
  // plain text and rebuilding only paragraph breaks keeps the words and drops everything else.
  function handleBodyPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = text
      .split(/\n{2,}/)
      .map((para) => para.split("\n").map(escape).join("<br>"))
      .join("<br><br>");
    document.execCommand("insertHTML", false, html);
    syncBodyFromEditor();
  }

  function handleBodyKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br>");
      syncBodyFromEditor();
    }
  }

  // Clicking an inserted image pops a small floating toolbar above it to pick its alignment.
  function handleBodyClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      const rect = target.getBoundingClientRect();
      setAlignToolbar({ img: target as HTMLImageElement, top: rect.top - 44, left: rect.left + rect.width / 2 });
    } else {
      setAlignToolbar(null);
    }
  }

  function setImageAlign(align: ImageAlign) {
    if (!alignToolbar) return;
    alignToolbar.img.dataset.align = align;
    alignToolbar.img.className = imageClassFor(align);
    syncBodyFromEditor();
    setAlignToolbar(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!headline.trim() || !body.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      if (post && onUpdate) {
        await onUpdate(post.id, headline.trim(), body.trim(), imageUrl.trim() || undefined, symbol ?? undefined, credits.trim() || undefined);
        onClose();
      } else {
        const created = await onCreate(headline.trim(), body.trim(), imageUrl.trim() || undefined, symbol ?? undefined, credits.trim() || undefined);
        if (created.status === "pending") {
          setPending(true);
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
      <div className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-[var(--color-border-soft)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--color-amber)]/15">
            <Newspaper size={16} className="text-[var(--color-amber)]" />
          </div>
          <p className="font-semibold text-[15px]">{post ? "Edit Post" : "New Post"}</p>
        </div>
        <button onClick={onClose} className="text-[var(--color-ink)] hover:text-[var(--color-amber)] transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-8">
          {pending ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--color-amber)]/15">
                <Clock size={20} className="text-[var(--color-amber)]" />
              </div>
              <p className="font-semibold text-[15px]">Sent for review</p>
              <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                This post contains language that needs review, so it isn't public yet. An admin needs to approve it first — you can check
                its status anytime on your Profile page.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all mt-1"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              <input
                required
                autoFocus
                maxLength={140}
                placeholder="Headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="display-bold w-full bg-transparent text-3xl md:text-4xl leading-tight text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] outline-none pb-3 border-b border-[var(--color-border-soft)] focus:border-[var(--color-amber)]/50 transition-colors"
              />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[var(--color-ink)]">Body</label>
                  <button
                    type="button"
                    onMouseDown={saveSelection}
                    onClick={() => inlineFileInputRef.current?.click()}
                    disabled={insertingImage}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-amber)] transition-colors disabled:opacity-50"
                  >
                    <ImagePlus size={12} />
                    {insertingImage ? "Uploading…" : "Insert Image"}
                  </button>
                  <input ref={inlineFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInlineFile} />
                </div>
                <div
                  ref={bodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncBodyFromEditor}
                  onKeyDown={handleBodyKeyDown}
                  onPaste={handleBodyPaste}
                  onClick={handleBodyClick}
                  data-placeholder="Write the post… use Insert Image to drop a photo between paragraphs"
                  className="post-body-editor w-full min-h-[50vh] px-3 py-2.5 rounded-lg bg-white/[0.06] border border-[var(--color-border)] text-base leading-relaxed text-[var(--color-ink)] outline-none focus:bg-white/[0.09] focus:border-[var(--color-amber)]/50 transition-colors whitespace-pre-wrap"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-ink)] mb-1.5 block">
                  Tag a stock. A live mini chart of that stock will show up at the top of your article.
                </label>
                {symbol ? (
                  <div className="inline-flex items-center gap-1.5 bg-white/[0.08] border border-[var(--color-border)] rounded-full pl-3 pr-1.5 py-1">
                    <span className="text-xs font-bold text-[var(--color-ink)]">{symbol}</span>
                    <button
                      type="button"
                      onClick={() => setSymbol(null)}
                      className="w-4 h-4 flex items-center justify-center rounded-full text-[var(--color-ink)] hover:text-[var(--color-amber)]"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <StockSearch compact onSelect={(s) => setSymbol(s)} />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-ink)] mb-1.5 block">Cover image (optional)</label>
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold bg-white/[0.06] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-white/[0.1] hover:border-[var(--color-amber)]/50 transition-colors disabled:opacity-50"
                    >
                      <ImagePlus size={14} />
                      {uploading ? "Uploading…" : "Upload Image"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    <input
                      type="url"
                      placeholder="…or paste an image URL"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-[var(--color-border)] text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] outline-none focus:bg-white/[0.09] focus:border-[var(--color-amber)]/50 transition-colors"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--color-ink)] mb-1.5 block">
                  Sources &amp; Credits (optional) — shown at the bottom of the article
                </label>
                <textarea
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                  rows={3}
                  placeholder={"Source: Reuters — https://reuters.com\nImage: NASA / Getty Images"}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-[var(--color-border)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] outline-none focus:bg-white/[0.09] focus:border-[var(--color-amber)]/50 transition-colors resize-none"
                />
              </div>

              {error && <p className="text-xs text-[var(--color-down)]">{error}</p>}

              <button
                type="submit"
                disabled={submitting || uploading || insertingImage || !headline.trim() || !body.trim()}
                className="w-full py-3 rounded-lg text-sm font-semibold text-black bg-[var(--color-amber)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
              >
                {post ? (submitting ? "Saving…" : "Save Changes") : submitting ? "Posting…" : "Post"}
              </button>
            </form>
          )}
        </div>
      </div>

      {alignToolbar && (
        <div
          className="fixed z-[60] flex items-center gap-0.5 bg-[var(--color-surface-2)] border border-[var(--color-border-soft)] rounded-full px-1 py-1 shadow-lg -translate-x-1/2"
          style={{ top: alignToolbar.top, left: alignToolbar.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setImageAlign("left")}
            title="Align left"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.08] transition-colors"
          >
            <AlignLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setImageAlign("center")}
            title="Center"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.08] transition-colors"
          >
            <AlignCenter size={14} />
          </button>
          <button
            type="button"
            onClick={() => setImageAlign("right")}
            title="Align right"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-white/[0.08] transition-colors"
          >
            <AlignRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
