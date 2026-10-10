import { useState, useEffect, useRef } from 'react';
import labelService from '../../services/labelService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../utils/ToastContext';
import { LabelChip } from './LabelChips';
import { LABEL_COLORS, toLabelList } from '../../utils/labels';

/**
 * Shows a task's labels. Project managers can pick labels from the project,
 * create new ones and delete unused ones.
 */
export default function TaskLabelPicker({ task, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user?.role === 'PROJECT_MANAGER';

  const [selected, setSelected] = useState(toLabelList(task.labels));
  const [projectLabels, setProjectLabels] = useState([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef(null);

  // Re-sync when the parent reloads the task
  const [syncedLabels, setSyncedLabels] = useState(task.labels);
  if (task.labels !== syncedLabels) {
    setSyncedLabels(task.labels);
    setSelected(toLabelList(task.labels));
  }

  const togglePanel = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    try {
      const res = await labelService.getProjectLabels(task.projectId);
      if (res.success) setProjectLabels(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load labels');
    }
  };

  // Close the panel when clicking outside it
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const saveSelection = async (labels) => {
    const previous = selected;
    setSelected(labels);
    try {
      await labelService.setTaskLabels(task.id, labels.map((l) => l.id));
      onChange?.();
    } catch (err) {
      setSelected(previous);
      toast.error(err.response?.data?.message || 'Failed to update labels');
    }
  };

  const toggleLabel = (label) => {
    const isSelected = selected.some((l) => l.id === label.id);
    saveSelection(isSelected ? selected.filter((l) => l.id !== label.id) : [...selected, label]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;

    try {
      setBusy(true);
      const res = await labelService.createLabel(task.projectId, { name, color: newColor });
      if (res.success) {
        setProjectLabels((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName('');
        await saveSelection([...selected, res.data]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create label');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLabel = async (label) => {
    const usedOn = label._count?.tasks ?? 0;
    const warning = usedOn > 0 ? ` It is used on ${usedOn} task${usedOn === 1 ? '' : 's'}.` : '';
    if (!window.confirm(`Delete the label "${label.name}" from this project?${warning}`)) return;

    try {
      await labelService.deleteLabel(label.id);
      setProjectLabels((prev) => prev.filter((l) => l.id !== label.id));
      setSelected((prev) => prev.filter((l) => l.id !== label.id));
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete label');
    }
  };

  return (
    <div className="flex flex-col gap-2 relative" ref={panelRef}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-gray-400 font-semibold">Labels</span>
        {canEdit && (
          <button
            type="button"
            onClick={togglePanel}
            className="text-[11.5px] font-bold text-[#118B95] hover:text-[#0D5A60] cursor-pointer"
          >
            {open ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((label) => (
            <LabelChip key={label.id} label={label} onRemove={canEdit ? toggleLabel : undefined} />
          ))}
        </div>
      ) : (
        <span className="text-[12px] text-gray-400 italic">No labels.</span>
      )}

      {open && (
        <div className="absolute right-0 top-7 z-20 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-3 flex flex-col gap-3">
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {projectLabels.length === 0 ? (
              <span className="text-[12px] text-gray-400 italic px-1">No labels in this project yet.</span>
            ) : (
              projectLabels.map((label) => {
                const checked = selected.some((l) => l.id === label.id);
                return (
                  <div key={label.id} className="group flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLabel(label)}
                      className="w-3.5 h-3.5 accent-[#118B95] cursor-pointer"
                      aria-label={`Label ${label.name}`}
                    />
                    <span className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleLabel(label)}>
                      <LabelChip label={label} />
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLabel(label)}
                      className="text-[10.5px] font-bold text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete label from project"
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t border-gray-100 pt-3">
            <input
              type="text"
              value={newName}
              maxLength={30}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New label name..."
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-[#118B95]"
            />
            <div className="flex items-center gap-1.5">
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${newColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={!newName.trim() || busy}
              className="px-3 py-1.5 bg-[#118B95] hover:bg-[#0D5A60] text-white font-bold text-[12px] rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create & add label
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
