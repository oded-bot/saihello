import { BADGES } from './badgeConfig';

export default function BadgePicker({ selected = [], onChange, compact = false }) {
  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter(b => b !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Was beschreibt dich oder was bist du offen für?
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Optional — du kannst jederzeit ändern</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {BADGES.map(({ id, emoji, label }) => {
          const active = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                  : 'bg-white dark:bg-dark-elevated border-gray-200 dark:border-dark-separator text-gray-600 dark:text-gray-300'
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-violet-600 font-medium">{selected.length} ausgewählt</p>
      )}
    </div>
  );
}
