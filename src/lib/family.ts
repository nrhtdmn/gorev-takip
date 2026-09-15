/** Sabit aile profilleri — her cihazda aynı kimlikler */
export const FAMILY_PROFILES = [
  { id: 'gizem', name: 'Gizem', color: '#9f1239' },
  { id: 'nurhat', name: 'Nurhat', color: '#1a5c4a' },
] as const

export type FamilyProfileId = (typeof FAMILY_PROFILES)[number]['id']

export function getFamilyProfile(id: string) {
  return FAMILY_PROFILES.find((p) => p.id === id) ?? null
}
