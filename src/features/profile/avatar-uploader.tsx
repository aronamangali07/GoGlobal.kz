"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { setAvatar } from "./actions";

const MAX_BYTES = 10 * 1024 * 1024;

/** Сжимаем на телефоне до 512px WebP — быстрее грузится по мобильному интернету. */
async function toWebp(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // квадратная обрезка по центру
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.86),
  );
}

export function AvatarUploader({
  userId,
  initialPath,
  initialUrl,
  size = "lg",
}: {
  userId: string;
  initialPath: string | null;
  initialUrl: string | null;
  size?: "md" | "lg";
}) {
  const t = useTranslations("profile");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError(t("errors.avatarType"));
    if (file.size > MAX_BYTES) return setError(t("errors.avatarTooBig"));
    setBusy(true);
    try {
      const blob = await toWebp(file);
      const supabase = createClient();
      const newPath = `${userId}/avatar-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(newPath, blob, {
        contentType: "image/webp",
        cacheControl: "3600",
      });
      if (upErr) throw upErr;
      const res = await setAvatar(newPath);
      if (!res.ok) throw new Error(res.error);
      if (path) await supabase.storage.from("avatars").remove([path]);
      setPath(newPath);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async () => {
    if (!path) return;
    setBusy(true);
    const res = await setAvatar(null);
    if (res.ok) {
      await createClient().storage.from("avatars").remove([path]);
      setPath(null);
      setUrl(null);
    }
    setBusy(false);
  };

  const dim = size === "lg" ? "size-32" : "size-20";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={url ? t("avatarChange") : t("avatarUpload")}
        className={cn(
          "group relative shrink-0 overflow-hidden rounded-full border-2 border-dashed border-border-strong bg-surface-2",
          url && "border-solid border-primary",
          dim,
        )}
      >
        <AnimatePresence mode="wait">
          {url ? (
            <motion.img
              key={url}
              src={url}
              alt=""
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="size-full object-cover"
            />
          ) : (
            <motion.span key="empty" className="grid size-full place-items-center text-fg-subtle">
              <UserRound className="size-1/2" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
        <span className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
        </span>
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
      </button>

      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="max-w-xs text-center text-sm text-fg-muted sm:text-left">{t("avatarHint")}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
            <Camera className="size-4" aria-hidden />
            {url ? t("avatarChange") : t("avatarUpload")}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRemove} aria-label={t("avatarRemove")}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          )}
        </div>
        {error && <p className="text-[13px] text-danger" role="alert">{error}</p>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
