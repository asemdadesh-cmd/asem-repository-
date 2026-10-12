// Who you can play as (kept apart from avatar.ts so the lobby stays tiny).
export type AvatarId = 'him' | 'her' | 'captain';

export const AVATARS: Record<AvatarId, { file: string; height: number; female: boolean; label: string }> = {
  him: { file: 'asem.glb', height: 1.79, female: false, label: 'Navy suit' },
  her: { file: 'yasso.glb', height: 1.64, female: true, label: 'Rose blazer' },
  captain: { file: 'captain.glb', height: 1.69, female: true, label: 'Sailor' },
};
