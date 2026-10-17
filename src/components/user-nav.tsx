"use client";

import { ChevronDown, LifeBuoy, LogOut, Mail, Package, Receipt, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState } from "react";
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
import { useShopOpen } from "@/components/shop/use-shop-open";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import type { Role } from "@/db/schema";
import type { EventAccess } from "@/lib/dues";
import { hasRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function useSignOut() {
  const router = useRouter();
  return async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };
}

type AccountLink = { href: string; label: string; icon: LucideIcon };

/**
 * The account's links, in two groups (what is mine; help, settings and the back office), shared
 * by the header menu and the phone drawer. Sign out comes after them, in its own group.
 */
export function useAccountLinks(role: Role | null | undefined): AccountLink[][] {
  const t = useTranslations("Nav");
  const shopOpen = useShopOpen();
  return [
    [
      { href: "/member/messages", label: t("userMenu.messages"), icon: Mail },
      { href: "/member/payments", label: t("userMenu.payments"), icon: Receipt },
      ...(shopOpen ? [{ href: "/member/orders", label: t("userMenu.orders"), icon: Package }] : []),
    ],
    [
      { href: "/contact", label: t("support"), icon: LifeBuoy },
      { href: "/settings", label: t("settings"), icon: Settings },
      ...(hasRole(role, "moderator") ? [{ href: "/admin", label: t("admin"), icon: ShieldCheck }] : []),
    ],
  ];
}

/** Whether the signed-in "member" account is a member of the club (asked once per account). */
const membership = new Map<string, Promise<boolean>>();
function isClubMember(userId: string) {
  let known = membership.get(userId);
  if (!known) {
    known = fetch("/api/v1/menu")
      .then((response) => (response.ok ? (response.json() as Promise<{ data: { access: EventAccess } }>) : null))
      .then((body) => body?.data.access === "full" || body?.data.access === "unpaid")
      .catch(() => false);
    membership.set(userId, known);
  }
  return known;
}

/**
 * The title under the name: the committee's role, else Membre / Non-membre (an accepted
 * member, fee paid or not, against an account still waiting or never joined).
 */
function useAccountTitle(userId: string | null, role: Role | null | undefined) {
  const t = useTranslations("Nav.userMenu.titles");
  const [member, setMember] = useState<{ userId: string; value: boolean } | null>(null);
  const staff = role && role !== "member";
  useEffect(() => {
    if (!userId || staff) return;
    let live = true;
    void isClubMember(userId).then((value) => live && setMember({ userId, value }));
    return () => {
      live = false;
    };
  }, [userId, staff]);
  if (!userId) return null;
  if (staff) return t(role);
  if (member?.userId !== userId) return null;
  return member.value ? t("member") : t("nonMember");
}

export const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Sign-in button for visitors; for members, the account menu (styled as the language menu):
 * who is signed in, then their messages, payments and orders; support, settings, admin; sign out.
 */
export function UserNav() {
  const t = useTranslations("Nav");
  const tMember = useTranslations("MemberArea");
  const { data, isPending } = useSession();
  const handleSignOut = useSignOut();
  const pathname = usePathname();
  const groups = useAccountLinks(data?.user.role);
  const title = useAccountTitle(data?.user.id ?? null, data?.user.role);

  // Same footprint while the session loads, so the header doesn't jump.
  if (isPending) return <span aria-hidden className="ml-1 block h-11 w-36 rounded-[11px] bg-foreground/5" />;
  if (!data) return <SignInButton />;

  const { user } = data;
  const displayName = user.name || user.email;

  const item = (href: string) =>
    cn(
      "flex cursor-pointer items-center gap-2.5 rounded-[8px] py-2 pr-3 pl-2.5 text-[13px] [&_svg]:size-4 [&_svg]:text-muted-foreground",
      // The current page is shaded until another row is hovered or focused, as in the language menu.
      isCurrent(pathname, href) && "bg-foreground/5 font-semibold not-focus:group-has-[:focus]/account:bg-transparent",
    );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="group/trigger ml-1 inline-flex h-11 max-w-60 cursor-pointer items-center gap-2.5 rounded-[11px] py-1.5 pr-2.5 pl-1.5 text-left text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-foreground/5">
        <UserAvatar name={user.name} email={user.email} image={user.image} className="size-8 rounded-[7px]" />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold">{displayName}</span>
          <span className="block h-[14px] truncate text-[11px] text-muted-foreground">{title ?? ""}</span>
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        aria-label={t("userMenu.account")}
        className="group/account w-60 rounded-[12px] border-0 bg-card p-1.5 shadow-brand ring-1 ring-foreground/10 duration-150 ease-out data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97]"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 pt-2 pb-2.5 font-normal">
          <UserAvatar name={user.name} email={user.email} image={user.image} className="size-8 rounded-[8px] text-[11px]" />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[12px] text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        {groups.map((group, index) => (
          <Fragment key={index}>
            <DropdownMenuSeparator className="mx-1 my-1" />
            {group.map(({ href, label, icon: Icon }) => (
              <DropdownMenuItem key={href} asChild className={item(href)}>
                <Link href={href} prefetch={false}>
                  <Icon aria-hidden />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
        <DropdownMenuItem onSelect={handleSignOut} className={item("/__sign-out")}>
          <LogOut aria-hidden />
          {tMember("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
