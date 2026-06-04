import { describe, it, expect } from 'vitest';
import { ROLES, CAPABILITIES, rolesForChannel } from '../src/roles.js';

describe('roles', () => {
  it('defines exactly the three monkey roles', () => {
    expect(ROLES).toEqual(['blind', 'deaf', 'mute']);
  });

  it('gives each role the correct sensory capabilities', () => {
    expect(CAPABILITIES.blind).toEqual({ canSee: false, canHear: true, canBeHeard: true });
    expect(CAPABILITIES.deaf).toEqual({ canSee: true, canHear: false, canBeHeard: true });
    expect(CAPABILITIES.mute).toEqual({ canSee: true, canHear: true, canBeHeard: false });
  });

  describe('rolesForChannel', () => {
    it('routes visual content to the sighted roles (deaf + mute)', () => {
      expect(rolesForChannel('visual')).toEqual(['deaf', 'mute']);
    });

    it('routes audio content to the hearing roles (blind + mute)', () => {
      expect(rolesForChannel('audio')).toEqual(['blind', 'mute']);
    });

    it('never routes visual content to the blind player', () => {
      expect(rolesForChannel('visual')).not.toContain('blind');
    });

    it('never routes audio content to the deaf player', () => {
      expect(rolesForChannel('audio')).not.toContain('deaf');
    });

    it('throws on an unknown channel', () => {
      expect(() => rolesForChannel('smell')).toThrow();
    });
  });
});
