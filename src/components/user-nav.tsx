"use client";

import { ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignInButton } from "@/components/sign-in-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { Link, useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { hasRole } from "@/lib/roles";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };
}

/** Sign-in button for visitors, account menu (avatar + name) for signed-in members. */
export function UserNav() {
  const t = useTranslations("Nav");
  const tMember = useTranslations("MemberArea");
  const { data, isPending } = useSession();
  const handleSignOut = useSignOut();

  // Same footprint while the session loads, so the header doesn't jump.
  if (isPending) return <span aria-hidden className="ml-1.5 block h-8 w-32 rounded-[7px] bg-foreground/5" />;
  if (!data) return <SignInButton />;

  const { user } = data;
  const displayName = user.name || user.email;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="ml-1.5 inline-flex h-8 max-w-52 cursor-pointer items-center gap-2 rounded-[7px] pr-1.5 pl-0.5 text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-foreground/5">
        <UserAvatar name={user.name} email={user.email} image={user.image} />
        <span className="truncate text-[13px] font-semibold">{displayName}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
          <UserAvatar name={user.name} email={user.email} image={user.image} className="size-9 text-[11px]" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/espace-membre">
            <UserRound aria-hidden />
            {t("memberArea")}
          </Link>
        </DropdownMenuItem>
        {hasRole(user.role, "admin") ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboard aria-hidden />
              {t("admin")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut aria-hidden />
          {tMember("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
