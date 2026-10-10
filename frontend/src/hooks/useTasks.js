/**
 * useTasks.js — Custom hook for task data fetching, CRUD operations, search, filter & sort
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import taskService from '../services/taskService';
import { useToast } from '../utils/ToastContext';
import { toLabelList } from '../utils/labels';

export function useTasks() {
  const toast = useToast();

  // ── Raw data ─────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [labelFilter, setLabelFilter] = useState('ALL'); // 'ALL' | label name (case-insensitive)
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

  // ── Fetch all tasks ───────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getAllTasks();
      setTasks(data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load tasks.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Derived / filtered list ───────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    // Search by title
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.title?.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      list = list.filter((t) => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Label filter (by name, so same-named labels across projects match together)
    if (labelFilter !== 'ALL') {
      list = list.filter((t) => toLabelList(t.labels).some((l) => l.name.toLowerCase() === labelFilter));
    }

    // Sort
    list.sort((a, b) => {
      const da = new Date(a.createdAt);
      const db = new Date(b.createdAt);
      return sortOrder === 'newest' ? db - da : da - db;
    });

    return list;
  }, [tasks, searchQuery, statusFilter, priorityFilter, labelFilter, sortOrder]);

  // Distinct label names across the loaded tasks, for the label filter
  const availableLabels = useMemo(() => {
    const byName = new Map();
    tasks.forEach((t) =>
      toLabelList(t.labels).forEach((l) => {
        const key = l.name.toLowerCase();
        if (!byName.has(key)) byName.set(key, { key, name: l.name });
      })
    );
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTasks.slice(start, start + PAGE_SIZE);
  }, [filteredTasks, currentPage]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter((t) => t.status === 'COMPLETED').length,
    };
  }, [tasks]);

  // ── Create ────────────────────────────────────────────────────────────────
  const createTask = useCallback(
    async (payload) => {
      const data = await taskService.createTask(payload);
      await fetchTasks();
      toast.success('Task created successfully!');
      return data;
    },
    [fetchTasks, toast]
  );

  // ── Update ────────────────────────────────────────────────────────────────
  const updateTask = useCallback(
    async (id, payload) => {
      const data = await taskService.updateTask(id, payload);
      await fetchTasks();
      toast.success('Task updated successfully!');
      return data;
    },
    [fetchTasks, toast]
  );

  // ── Update Status ─────────────────────────────────────────────────────────
  const updateTaskStatus = useCallback(
    async (id, status) => {
      const data = await taskService.updateTaskStatus(id, status);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t))
      );
      toast.success('Status updated!');
      return data;
    },
    [toast]
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteTask = useCallback(
    async (id) => {
      await taskService.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success('Task deleted successfully!');
    },
    [toast]
  );

  return {
    // Data
    tasks,
    paginatedTasks,
    filteredTasks,
    loading,
    error,
    stats,

    // Filters & search
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    labelFilter,
    setLabelFilter,
    availableLabels,
    sortOrder,
    setSortOrder,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    PAGE_SIZE,

    // Actions
    fetchTasks,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}
