import { getBadge } from './badgeConfig';

export default function BadgeDisplay({ badges = [] }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map(id => {
        const badge = getBadge(id);
        if (!badge) return null;
        return (
          <span
            key={id}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-xs font-medium"
          >
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
          </span>
        );
      })}
    </div>
  );
}
