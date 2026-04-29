export const BADGES = [
  { id: 'body_positive',        emoji: '💛', label: 'Body Positive' },
  { id: 'lgbtq_friendly',       emoji: '🏳️‍🌈', label: 'LGBTQ+ Friendly' },
  { id: 'neurodivergent',       emoji: '🧠', label: 'Neurodivergent' },
  { id: 'disability_friendly',  emoji: '♿', label: 'Disability Friendly' },
  { id: 'boundaries_respected', emoji: '🤝', label: 'Boundaries Respected' },
  { id: 'open_to_all_cultures', emoji: '🌍', label: 'Open to All Cultures' },
  { id: 'introvert_friendly',   emoji: '🔇', label: 'Introvert Friendly' },
  { id: 'non_drinker_friendly', emoji: '🍃', label: 'Non-drinker Friendly' },
];

export function getBadge(id) {
  return BADGES.find(b => b.id === id);
}
