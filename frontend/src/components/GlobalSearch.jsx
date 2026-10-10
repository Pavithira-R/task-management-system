import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import searchService from '../services/searchService';

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

const STATUS_LABELS = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  BLOCKED: 'Blocked',
};

/**
 * Top-bar search across tasks, projects and comments (and people for admins).
 * Ctrl/Cmd+K focuses it; arrow keys + Enter pick a result; Escape closes.
 */
export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const requestId = useRef(0);

  // Debounced search; stale responses are ignored
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) return;

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await searchService.search(q);
        if (id === requestId.current && res.success) {
          setResults(res.data);
          setActiveIndex(0);
        }
      } catch {
        if (id === requestId.current) setResults({ tasks: [], projects: [], comments: [], people: [] });
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Ctrl/Cmd+K focuses the search box
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Flatten results into one navigable list, grouped in display order
  const items = useMemo(() => {
    if (!results) return [];
    return [
      ...results.tasks.map((t) => ({
        key: `task-${t.id}`,
        group: 'Tasks',
        icon: '✅',
        title: t.title,
        subtitle: `${t.project?.name ?? 'Project'} · ${STATUS_LABELS[t.status] ?? t.status}`,
        to: `/tasks/${t.id}`,
      })),
      ...results.projects.map((p) => ({
        key: `project-${p.id}`,
        group: 'Projects',
        icon: '📁',
        title: p.name,
        subtitle: p.status?.replace('_', ' ').toLowerCase(),
        to: `/projects/${p.id}`,
      })),
      ...results.comments.map((c) => ({
        key: `comment-${c.id}`,
        group: 'Comments',
        icon: '💬',
        title: c.content,
        subtitle: `${c.user?.name ?? 'Someone'} on "${c.task?.title}"`,
        to: `/tasks/${c.task?.id}`,
      })),
      ...(results.people || []).map((p) => ({
        key: `person-${p.id}`,
        group: 'People',
        icon: '👤',
        title: p.name,
        subtitle: `${p.email} · ${p.role.replace('_', ' ').toLowerCase()}${p.status === 'INACTIVE' ? ' · inactive' : ''}`,
        to: '/admin/users',
      })),
    ];
  }, [results]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setOpen(true);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      requestId.current++;
      setResults(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
  };

  const goTo = (item) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    inputRef.current?.blur();
    navigate(item.to);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      goTo(items[activeIndex]);
    }
  };

  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH;
  const placeholder = user?.role === 'ADMIN' ? 'Search tasks, projects, or people...' : 'Search tasks, projects, comments...';

  return (
    <div ref={containerRef} className="hidden md:flex items-center flex-1 max-w-md relative">
      <svg className="w-4 h-4 text-gray-400 absolute left-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full pl-10 pr-14 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm dark:text-white dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-[#118B95] focus:border-[#118B95] transition-all"
      />
      <kbd className="absolute right-3 text-[10px] font-semibold text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 rounded px-1.5 py-0.5 pointer-events-none">
        Ctrl K
      </kbd>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-30">
          {loading && !results ? (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-400">Searching...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-slate-400">No results for "{query.trim()}"</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1" role="listbox">
              {items.map((item, index) => {
                const showGroup = index === 0 || items[index - 1].group !== item.group;
                return (
                  <li key={item.key}>
                    {showGroup && (
                      <div className="px-4 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                        {item.group}
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goTo(item)}
                      className={`w-full text-left px-4 py-2 flex items-start gap-3 cursor-pointer ${
                        index === activeIndex ? 'bg-[#E6F5F6] dark:bg-slate-700' : ''
                      }`}
                    >
                      <span className="text-sm leading-5">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</span>
                        {item.subtitle && (
                          <span className="block text-xs text-gray-500 dark:text-slate-400 truncate">{item.subtitle}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
