"use client";

import { FileUp, Pencil, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Visibility = "public" | "members" | "admins";
const VISIBILITIES: Visibility[] = ["members", "public", "admins"];
const MAX_BYTES = 10 * 1024 * 1024;
const labelClass = "text-[13px] font-medium";

const segment = (on: boolean) =>
  cn(
    "h-9 flex-1 cursor-pointer rounded-[6px] px-2.5 text-[13px] transition-colors lg:h-8",
    on ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
  );

/** Title, category (with the ones already used as suggestions) and who may see it. */
function DocumentFields({
  values,
  onChange,
  categories,
}: {
  values: { title: string; category: string; visibility: Visibility };
  onChange: (values: { title: string; category: string; visibility: Visibility }) => void;
  categories: string[];
}) {
  const t = useTranslations("AdminDocuments");
  const id = useId();
  return (
    <>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-title`} className={labelClass}>
          {t("titleLabel")}
        </label>
        <input id={`${id}-title`} value={values.title} maxLength={200} onChange={(event) => onChange({ ...values, title: event.target.value })} className={adminInput} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-category`} className={labelClass}>
          {t("category")}
        </label>
        <input
          id={`${id}-category`}
          list={`${id}-categories`}
          value={values.category}
          maxLength={80}
          placeholder={t("categoryPlaceholder")}
          onChange={(event) => onChange({ ...values, category: event.target.value })}
          className={adminInput}
        />
        <datalist id={`${id}-categories`}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1.5">
        <span className={labelClass}>{t("visibility")}</span>
        <div role="radiogroup" aria-label={t("visibility")} className="flex gap-0.5 rounded-[8px] border bg-card p-0.5">
          {VISIBILITIES.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={values.visibility === value} onClick={() => onChange({ ...values, visibility: value })} className={segment(values.visibility === value)}>
              {t(`visibilities.${value}`)}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground">{t(`visibilityHints.${values.visibility}`)}</p>
      </div>
    </>
  );
}

/** "Add a document": pick a PDF or a picture, name it, choose who sees it. */
export function UploadDocumentButton({ categories }: { categories: string[] }) {
  const t = useTranslations("AdminDocuments");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [values, setValues] = useState({ title: "", category: "", visibility: "members" as Visibility });
  const [pending, startTransition] = useTransition();

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_BYTES) return void notify.error(t("tooLarge"));
    setFile(picked);
    // The file name, cleaned up, as a first title.
    if (!values.title) setValues((current) => ({ ...current, title: picked.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() }));
  };

  const submit = () =>
    startTransition(async () => {
      if (!file || !values.title.trim()) return;
      const form = new FormData();
      form.set("file", file);
      form.set("title", values.title.trim());
      form.set("category", values.category.trim());
      form.set("visibility", values.visibility);
      const response = await fetch("/api/v1/documents", { method: "POST", body: form });
      if (!response.ok) {
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        notify.error(t(code === "unsupported" ? "unsupported" : code === "too_large" ? "tooLarge" : "error"));
        return;
      }
      notify.success(t("uploaded"));
      setOpen(false);
      setFile(null);
      setValues({ title: "", category: "", visibility: "members" });
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("primary")}>
        <Upload aria-hidden />
        {t("new")}
      </button>
      <ResponsivePanel
        open={open}
        onOpenChange={setOpen}
        title={t("new")}
        description={t("newHint")}
        footer={
          <button type="button" disabled={pending || !file || !values.title.trim()} onClick={submit} className={adminButton("primary", "md", "w-full sm:w-auto")}>
            {pending ? t("uploading") : t("upload")}
          </button>
        }
      >
        <div className="space-y-5">
          {/* Drop zone (or tap to choose). */}
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pick(event.dataTransfer.files[0]);
            }}
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-[14px] border-2 border-dashed bg-card/60 px-4 py-8 text-center transition-colors hover:border-foreground/40"
          >
            <FileUp className="size-6 text-muted-foreground" aria-hidden />
            <span className="text-[15px] font-medium">{file ? file.name : t("drop")}</span>
            <span className="text-[12px] text-muted-foreground">{t("dropHint")}</span>
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <DocumentFields values={values} onChange={setValues} categories={categories} />
        </div>
      </ResponsivePanel>
    </>
  );
}

/** Rename / move / change visibility, or delete. */
export function DocumentActions({
  id,
  initial,
  categories,
}: {
  id: string;
  initial: { title: string; category: string; visibility: Visibility };
  categories: string[];
}) {
  const t = useTranslations("AdminDocuments");
  const router = useRouter();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/documents/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      if (!response.ok) return void notify.error(t("error"));
      notify.success(t("saved"));
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="flex shrink-0 gap-1">
      <button
        type="button"
        onClick={() => {
          setValues(initial);
          setOpen(true);
        }}
        className={adminButton("ghost", "icon")}
        title={t("edit")}
      >
        <Pencil aria-hidden />
        <span className="sr-only">{t("edit")}</span>
      </button>
      <button
        type="button"
        disabled={pending}
        title={t("delete")}
        className={adminButton("ghost", "icon", "text-destructive hover:text-destructive")}
        onClick={async () => {
          if ((await ask({ title: t("deleteTitle"), body: t("deleteBody", { title: initial.title }), confirmLabel: t("delete"), tone: "danger" })) === null) return;
          startTransition(async () => {
            const response = await fetch(`/api/v1/documents/${id}`, { method: "DELETE" });
            if (!response.ok) return void notify.error(t("error"));
            notify.success(t("deleted"));
            router.refresh();
          });
        }}
      >
        <Trash2 aria-hidden />
        <span className="sr-only">{t("delete")}</span>
      </button>
      <ResponsivePanel
        open={open}
        onOpenChange={setOpen}
        title={t("edit")}
        footer={
          <button type="button" disabled={pending || !values.title.trim()} onClick={save} className={adminButton("primary", "md", "w-full sm:w-auto")}>
            {t("save")}
          </button>
        }
      >
        <div className="space-y-5">
          <DocumentFields values={values} onChange={setValues} categories={categories} />
        </div>
      </ResponsivePanel>
    </div>
  );
}
