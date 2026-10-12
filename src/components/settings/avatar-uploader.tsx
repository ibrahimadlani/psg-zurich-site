"use client";

import { Camera, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

const SIZE = 256;

/** Centre square of the picture, resized to 256 px, as WebP (PNG where the browser can't). */
async function toAvatarBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/webp", 0.85),
  );
}

/** Profile photo: pick, crop and shrink in the browser, upload; or remove it. */
export function AvatarUploader({ name, email, image }: { name: string; email: string; image: string | null }) {
  const t = useTranslations("Settings.profile");
  const router = useRouter();
  const { refetch } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(image);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      setFailed(false);
      try {
        const blob = await toAvatarBlob(file);
        const response = await fetch("/api/v1/me/avatar", { method: "PUT", body: blob });
        if (!response.ok) throw new Error(String(response.status));
        const { data } = (await response.json()) as { data: { image: string } };
        setCurrent(data.image);
        refetch();
        router.refresh();
      } catch {
        setFailed(true);
      }
    });

  const remove = () =>
    startTransition(async () => {
      setFailed(false);
      const response = await fetch("/api/v1/me/avatar", { method: "DELETE" });
      if (!response.ok) {
        setFailed(true);
        return;
      }
      setCurrent(null);
      refetch();
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <UserAvatar name={name} email={email} image={current} className="size-20 text-xl" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => input.current?.click()}>
            <Camera aria-hidden />
            {current ? t("changePhoto") : t("addPhoto")}
          </Button>
          {current ? (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>
              <Trash2 aria-hidden />
              {t("removePhoto")}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
        {failed ? <p className="text-sm text-destructive">{t("photoError")}</p> : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
    </div>
  );
}
