/**
 * SubtaskProgress.jsx — Compact "3/5" checklist progress bar for task cards
 */
export default function SubtaskProgress({ subtasks, className = '' }) {
  if (!subtasks || subtasks.length === 0) return null;

  const done = subtasks.filter((s) => s.isCompleted).length;
  const total = subtasks.length;
  const percent = Math.round((done / total) * 100);
  const complete = done === total;

  return (
    <div className={`flex items-center gap-2 ${className}`} title={`Checklist: ${done} of ${total} done`}>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-[#118B95]'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-[10.5px] font-bold whitespace-nowrap ${complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'}`}>
        ☑ {done}/{total}
      </span>
    </div>
  );
}
