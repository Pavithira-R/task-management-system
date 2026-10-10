/**
 * LabelChips.jsx — Colored label tags for a task
 */
import { toLabelList } from '../../utils/labels';

export function LabelChip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 max-w-[140px] px-2 py-0.5 rounded-full border text-[10.5px] font-bold leading-4"
      style={{ backgroundColor: `${label.color}1A`, borderColor: `${label.color}66`, color: label.color }}
      title={label.name}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
      <span className="truncate">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(label);
          }}
          className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
          aria-label={`Remove label ${label.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export default function LabelChips({ labels, max = 3, className = '' }) {
  const list = toLabelList(labels);
  if (list.length === 0) return null;

  const shown = list.slice(0, max);
  const hidden = list.length - shown.length;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {hidden > 0 && (
        <span
          className="text-[10.5px] font-bold text-gray-400 dark:text-slate-400"
          title={list.slice(max).map((l) => l.name).join(', ')}
        >
          +{hidden}
        </span>
      )}
    </div>
  );
}
