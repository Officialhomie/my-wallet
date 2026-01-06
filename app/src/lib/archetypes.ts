// Archetype definitions and timing profiles for Domain 2: Simulation Configuration

import { ArchetypeName, ArchetypeInfo, TimingProfile } from '@/types/domain-2';

export const ARCHETYPES: Record<ArchetypeName, ArchetypeInfo> = {
  whale: {
    name: 'whale',
    label: '🐋 Whale',
    description: 'Large, infrequent transactions. High gas, low frequency.',
    detailedDescription: 'Makes rare but significant transactions. Skips 85% of scheduled interactions to simulate infrequent activity. Best for testing large-value scenarios with minimal transaction count.',
    activeRate: '15%', // 100% - 85% skip rate
    characteristics: ['Very low frequency', 'High transaction values', 'Long delays (5-30min)', 'No burst behavior'],
    icon: '🐋',
  },
  trader: {
    name: 'trader',
    label: '📈 Active Trader',
    description: 'Many rapid transactions. Medium gas, high frequency.',
    detailedDescription: 'Highly active with rapid successive transactions. Executes 95% of scheduled interactions. Capable of burst activity (3-8 transactions in quick succession). Now accepts any contract function - no restrictions. Ideal for load testing and general contract interactions.',
    activeRate: '95%', // 100% - 5% skip rate
    characteristics: ['High frequency', 'Medium transaction values', 'Quick delays (8-60sec)', 'Burst behavior enabled', 'Accepts all functions'],
    icon: '📈',
  },
  casual: {
    name: 'casual',
    label: '👤 Casual',
    description: 'Moderate activity. Average gas and frequency.',
    detailedDescription: 'Balanced behavior with moderate activity. Executes 80% of scheduled interactions. Represents typical user behavior with occasional pauses. Good for realistic simulation.',
    activeRate: '80%', // 100% - 20% skip rate
    characteristics: ['Medium frequency', 'Low-medium values', 'Normal delays (30sec-5min)', 'Rare burst behavior'],
    icon: '👤',
  },
  lurker: {
    name: 'lurker',
    label: '👁️ Lurker',
    description: 'Mostly observes, rare actions. Low gas, very low frequency.',
    detailedDescription: 'Extremely passive behavior - only executes 5% of scheduled interactions. Represents users who mainly observe with very rare transactions. Not recommended for transaction testing.',
    activeRate: '5%', // 100% - 95% skip rate
    characteristics: ['Very low frequency', 'Minimal transaction values', 'Very long delays (30min-2hrs)', 'Rarely active'],
    icon: '👁️',
    warning: 'This archetype skips 95% of interactions. Use for passive behavior testing only.',
  },
  researcher: {
    name: 'researcher',
    label: '🔬 Researcher',
    description: 'Read-heavy behavior. Low gas, variable frequency.',
    detailedDescription: 'Analytical behavior with experimental interactions. Executes 70% of scheduled interactions. Tests edge cases and unusual parameter combinations. Good for testing contract edge cases.',
    activeRate: '70%', // 100% - 30% skip rate
    characteristics: ['Low-medium frequency', 'Very small values', 'Thoughtful delays (2-10min)', 'Experimental parameters'],
    icon: '🔬',
  },
  flexible: {
    name: 'flexible',
    label: '🔧 Flexible',
    description: 'Universal user - accepts any contract function.',
    detailedDescription: 'Highly versatile archetype that accepts ANY contract function without restrictions. Executes 90% of scheduled interactions. Perfect for testing custom contracts or functions that don\'t fit other archetypes. No function compatibility issues.',
    activeRate: '90%', // 100% - 10% skip rate
    characteristics: ['High frequency', 'Medium values', 'Normal delays (10sec-2min)', 'Accepts all functions', 'Burst behavior enabled'],
    icon: '🔧',
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
