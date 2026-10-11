"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ComponentProps } from "react";
import { inputClass } from "@/components/auth/auth-ui";
import { cn } from "@/lib/utils";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useTranslations("Login");
  const [visible, setVisible] = useState(false);
  const label = visible ? t("hidePassword") : t("showPassword");

  return (
    <span className="relative block">
      <input {...props} type={visible ? "text" : "password"} className={cn(inputClass, "pr-[42px]", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        title={label}
        className="absolute top-[3px] right-[3px] flex size-8 cursor-pointer items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </span>
  );
}
