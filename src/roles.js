// The three roles, named after the Three Wise Monkeys:
//   blind -> "See No Evil"   (Mizaru)   - cannot see the screen
//   deaf  -> "Hear No Evil"  (Kikazaru) - cannot hear audio
//   mute  -> "Speak No Evil" (Iwazaru)  - cannot be heard on the voice call
export const ROLES = ['blind', 'deaf', 'mute'];

export const CAPABILITIES = {
  blind: { canSee: false, canHear: true, canBeHeard: true },
  deaf: { canSee: true, canHear: false, canBeHeard: true },
  mute: { canSee: true, canHear: true, canBeHeard: false },
};

// Which roles receive content sent over a given channel.
//   'visual' -> everyone who can see  (deaf + mute)
//   'audio'  -> everyone who can hear (blind + mute)
export function rolesForChannel(channel) {
  if (channel === 'visual') return ROLES.filter((r) => CAPABILITIES[r].canSee);
  if (channel === 'audio') return ROLES.filter((r) => CAPABILITIES[r].canHear);
  throw new Error(`Unknown channel: ${channel}`);
}
