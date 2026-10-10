import { useState } from 'react';
import subtaskService from '../../services/subtaskService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../utils/ToastContext';

/**
 * Checklist of subtasks for a task, with a progress bar.
 * PMs in the project and collaborators assigned to the task can edit it; everyone else sees it read-only.
 */
export default function SubtaskChecklist({ task, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(task.subtasks || []);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Re-sync when the parent reloads the task
  const [syncedSubtasks, setSyncedSubtasks] = useState(task.subtasks);
  if (task.subtasks !== syncedSubtasks) {
    setSyncedSubtasks(task.subtasks);
    setItems(task.subtasks || []);
  }

  const isAssignee = task.assignees?.some((a) => (a.user?.id ?? a.userId) === user?.id);
  const canEdit = user?.role === 'PROJECT_MANAGER' || (user?.role === 'COLLABORATOR' && isAssignee);

  const doneCount = items.filter((s) => s.isCompleted).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || saving) return;

    try {
      setSaving(true);
      const res = await subtaskService.addSubtask(task.id, title);
      if (res.success) {
        setItems((prev) => [...prev, res.data]);
        setNewTitle('');
        onChange?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add checklist item');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    const next = !item.isCompleted;
    // Optimistic update so ticking feels instant
    setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, isCompleted: next } : s)));
    try {
      await subtaskService.updateSubtask(item.id, { isCompleted: next });
      onChange?.();
    } catch (err) {
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, isCompleted: item.isCompleted } : s)));
      toast.error(err.response?.data?.message || 'Failed to update checklist item');
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleRename = async (item) => {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title || title === item.title) return;

    try {
      const res = await subtaskService.updateSubtask(item.id, { title });
      if (res.success) {
        setItems((prev) => prev.map((s) => (s.id === item.id ? res.data : s)));
        onChange?.();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename checklist item');
    }
  };

  const handleDelete = async (item) => {
    try {
      await subtaskService.deleteSubtask(item.id);
      setItems((prev) => prev.filter((s) => s.id !== item.id));
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete checklist item');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-50 pb-2">
        <h3 className="text-[15px] font-extrabold text-indigo-950">☑️ Checklist</h3>
        {items.length > 0 && (
          <span className="text-[12px] font-bold text-gray-400">
            {doneCount}/{items.length} done
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${percent === 100 ? 'bg-emerald-500' : 'bg-[#118B95]'}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[12px] font-extrabold text-indigo-950 w-9 text-right">{percent}%</span>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[12.5px] text-gray-400 italic">
          {canEdit ? 'Break this task into smaller steps.' : 'No checklist items yet.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={item.isCompleted}
                onChange={() => handleToggle(item)}
                disabled={!canEdit}
                className="w-4 h-4 accent-[#118B95] cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                aria-label={`Mark "${item.title}" as ${item.isCompleted ? 'not done' : 'done'}`}
              />

              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  maxLength={200}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleRename(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(item);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#118B95]"
                />
              ) : (
                <span
                  onDoubleClick={() => canEdit && startEditing(item)}
                  className={`flex-1 min-w-0 text-[13px] break-words ${
                    item.isCompleted ? 'line-through text-gray-400' : 'text-indigo-950 font-semibold'
                  }`}
                >
                  {item.title}
                </span>
              )}

              {canEdit && editingId !== item.id && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="text-[10.5px] font-bold text-gray-400 hover:text-[#118B95] cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="text-[10.5px] font-bold text-gray-400 hover:text-rose-600 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            maxLength={200}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a checklist item..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-[#118B95]"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || saving}
            className="px-4 py-2 bg-[#118B95] hover:bg-[#0D5A60] text-white font-bold text-[13px] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
