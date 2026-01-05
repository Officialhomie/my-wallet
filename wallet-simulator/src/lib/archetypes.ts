// Archetype definitions and timing profiles for Domain 2: Simulation Configuration

import { ArchetypeName, ArchetypeInfo, TimingProfile } from '@/types/domain-2';

export const ARCHETYPES: Record<ArchetypeName, ArchetypeInfo> = {
  whale: {
    name: 'whale',
    label: '🐋 Whale',
    description: 'Large, infrequent transactions. High gas, low frequency.',
    icon: '🐋',
  },
  trader: {
    name: 'trader',
    label: '📈 Active Trader',
    description: 'Many rapid transactions. Medium gas, high frequency.',
    icon: '📈',
  },
  casual: {
    name: 'casual',
    label: '👤 Casual',
    description: 'Moderate activity. Average gas and frequency.',
    icon: '👤',
  },
  lurker: {
    name: 'lurker',
    label: '👁️ Lurker',
    description: 'Mostly observes, rare actions. Low gas, very low frequency.',
    icon: '👁️',
  },
  researcher: {
    name: 'researcher',
    label: '🔬 Researcher',
    description: 'Read-heavy behavior. Low gas, variable frequency.',
    icon: '🔬',
  },
};

export interface TimingProfileInfo {
  label: string;
  delays: [number, number]; // [min, max] seconds between transactions
}

export const TIMING_PROFILES: Record<TimingProfile, TimingProfileInfo> = {
  instant: { label: 'Instant', delays: [0, 0] },
  fast: { label: 'Fast', delays: [0.1, 0.5] },
  normal: { label: 'Normal', delays: [0.5, 3] },
  slow: { label: 'Slow', delays: [2, 10] },
  variable: { label: 'Variable', delays: [0.1, 15] },
};
