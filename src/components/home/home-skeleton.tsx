"use client";

import { LandingSkeleton, MemberHomeSkeleton } from "@/components/skeletons";
import { useSession } from "@/lib/auth-client";

/**
 * The home page's placeholder: the landing's shape for visitors, the dashboard's for members.
 * On a first visit the session is not known yet: the landing's (most first visits are visitors').
 */
export function HomeSkeleton() {
  const { data } = useSession();
  return data ? <MemberHomeSkeleton /> : <LandingSkeleton />;
}
