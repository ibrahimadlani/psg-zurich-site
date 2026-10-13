import type { members } from "@/db/schema";
import type { MemberInterest } from "@/db/schema";

type ProfileInput = {
  birthDate?: string;
  interests?: MemberInterest[];
  psgTicketing?: (typeof members.$inferInsert)["psgTicketing"];
  photoConsent?: boolean | null;
};

/** Database values for the profile fields that were sent (photo answers are timestamped). */
export function profileValues(input: ProfileInput, now = new Date()) {
  return {
    ...(input.birthDate !== undefined ? { birthDate: input.birthDate || null } : {}),
    ...(input.interests !== undefined ? { interests: input.interests } : {}),
    ...(input.psgTicketing !== undefined ? { psgTicketing: input.psgTicketing } : {}),
    ...(input.photoConsent !== undefined
      ? { photoConsent: input.photoConsent, photoConsentAt: input.photoConsent === null ? null : now }
      : {}),
  };
}
