import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import taskService from '../../services/taskService';
import projectService from '../../services/projectService';
import SubtaskProgress from '../../components/tasks/SubtaskProgress';

const COLUMNS = [
  { 
    id: 'BACKLOG', 
    title: 'Backlog',
    subtitle: 'Needs review / parked',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    accentColor: '#94A3B8',
    bgCol: 'bg-slate-100/50',
    borderCol: 'border-slate-300',
    headerBg: 'bg-slate-400',
    tagBg: 'bg-slate-200 text-slate-700',
    dropBorder: 'border-slate-500',
  },
  { 
    id: 'TODO', 
    title: 'To Do',
    subtitle: 'Not started yet',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    accentColor: '#64748B',
    bgCol: 'bg-slate-50/80',
    borderCol: 'border-slate-200',
    headerBg: 'bg-slate-500',
    tagBg: 'bg-slate-100 text-slate-600',
    dropBorder: 'border-slate-400',
  },
  { 
    id: 'IN_PROGRESS', 
    title: 'In Progress',
    subtitle: 'Currently active',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    accentColor: '#118B95',
    bgCol: 'bg-[#E6F5F6]/60',
    borderCol: 'border-[#93CFD4]',
    headerBg: 'bg-[#118B95]',
    tagBg: 'bg-[#BEE3E6] text-[#0D5A60]',
    dropBorder: 'border-[#118B95]',
  },
  { 
    id: 'COMPLETED', 
    title: 'Completed',
    subtitle: 'Successfully done',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accentColor: '#10B981',
    bgCol: 'bg-emerald-50/60',
    borderCol: 'border-emerald-200',
    headerBg: 'bg-emerald-500',
    tagBg: 'bg-emerald-100 text-emerald-700',
    dropBorder: 'border-emerald-400',
  }
];

const PRIORITY_CONFIG = {
  HIGH:   { badge: 'bg-rose-100 text-rose-700 border-rose-200',   bar: 'bg-rose-500',   dot: 'bg-rose-500',   label: 'High' },
  MEDIUM: { badge: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500',  dot: 'bg-amber-500',  label: 'Medium' },
  LOW:    { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400',  dot: 'bg-slate-400',  label: 'Low' },
};

export default function KanbanBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedSource, setSelectedSource] = useState('my-tasks');
  const [isLoading, setIsLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.getAllProjects();
        setProjects(response?.data || response || []);
      } catch (err) {
        console.error('Failed to load projects list:', err);
      }
    };
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      if (selectedSource === 'my-tasks') {
        const res = await taskService.getAllTasks();
        setTasks(res?.data || res || []);
      } else if (selectedSource.startsWith('project-')) {
        const projectId = parseInt(selectedSource.split('-')[1]);
        const res = await projectService.getProjectTasks(projectId);
        setTasks(res?.data || res || []);
      }
    } catch (err) {
      console.error('Error fetching tasks for Kanban:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedSource]);

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(taskId));
    setTimeout(() => { e.target.classList.add('opacity-40', 'scale-95'); }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-40', 'scale-95');
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) setDragOverColumn(columnId);
  };

  const handleDragLeave = () => setDragOverColumn(null);

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdStr = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskIdStr) return;
    const taskId = parseInt(taskIdStr);
    const taskToUpdate = tasks.find(t => t.id === taskId);
    if (!taskToUpdate || taskToUpdate.status === targetStatus) return;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));
    try {
      await taskService.updateTaskStatus(taskId, targetStatus);
    } catch (err) {
      console.error('Failed to update status on server:', err);
      fetchTasks();
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-64px)] bg-[#F7F8F9] dark:bg-slate-900 flex flex-col transition-colors duration-200">
        
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeUp relative z-50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#0D5A60] dark:bg-slate-800 flex items-center justify-center shadow-lg shadow-[#0D5A60]/20 dark:shadow-black/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-[#0D5A60] dark:text-white tracking-tight">Kanban Board</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium ml-13 pl-0.5">Drag and drop tasks to update their status in real-time.</p>
          </div>

          {/* Filter + Progress */}
          <div className="flex items-center gap-4">
            {/* Overall Progress Pill */}
            {!isLoading && totalTasks > 0 && (
              <div className="hidden sm:flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Progress</span>
                  <span className="text-lg font-black text-[#118B95] dark:text-[#2AA7B3]">{overallProgress}%</span>
                </div>
                <div className="w-24 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#118B95] to-[#2AA7B3] rounded-full transition-all duration-700"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Custom Filter Dropdown */}
            <div className="relative z-30">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-4 py-2.5 border border-gray-200 dark:border-slate-700 shadow-sm hover:border-[#118B95] dark:hover:border-[#2AA7B3] transition-colors duration-200"
              >
                <svg className="w-4 h-4 text-[#118B95] dark:text-[#2AA7B3] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                
                <span className="text-sm font-bold text-[#0D5A60] dark:text-[#E6F5F6] whitespace-nowrap">
                  {selectedSource === 'my-tasks' 
                    ? 'My Assigned Tasks' 
                    : projects.find(p => `project-${p.id}` === selectedSource)?.name || 'Project Tasks'}
                </span>
                
                <svg 
                  className={`w-4 h-4 text-[#118B95] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {/* Dropdown Menu Overlay & List */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50 animate-scaleIn origin-top-right">
                    <div className="max-h-60 overflow-y-auto py-1.5 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-600">
                      <button
                        onClick={() => { setSelectedSource('my-tasks'); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          selectedSource === 'my-tasks' 
                            ? 'bg-[#E6F5F6] text-[#118B95] dark:bg-slate-700 dark:text-[#2AA7B3]' 
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        My Assigned Tasks
                      </button>
                      
                      {projects.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700/50 mt-1 mb-1">
                          <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Projects</span>
                        </div>
                      )}
                      
                      {projects.map(p => {
                        const isSelected = selectedSource === `project-${p.id}`;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedSource(`project-${p.id}`); setIsDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-[#E6F5F6] text-[#118B95] dark:bg-slate-700 dark:text-[#2AA7B3]' 
                                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                            }`}
                          >
                            <div className="truncate">{p.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────────────────── */}
        {!isLoading && (
          <div className="px-6 pt-4 pb-2 flex gap-3 animate-fadeUp" style={{ animationDelay: '0.05s' }}>
            {COLUMNS.map(col => {
              const count = tasks.filter(t => t.status === col.id).length;
              return (
                <div key={col.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl px-4 py-2 border border-gray-100 dark:border-slate-700 shadow-sm transition-colors duration-200">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.headerBg}`} />
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{col.title}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white ml-1">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Columns ──────────────────────────────────────────────── */}
        <div className="flex-1 px-6 pb-6 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 min-h-0 animate-fadeUp" style={{ animationDelay: '0.1s' }}>
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            const isHovered = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                  isHovered
                    ? `${column.dropBorder} shadow-xl scale-[1.01] bg-white dark:bg-slate-800`
                    : `${column.borderCol} ${column.bgCol} dark:bg-slate-800/80 shadow-sm dark:border-slate-700`
                }`}
                style={{ minHeight: '520px' }}
              >
                {/* Column Header */}
                <div className="p-4 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${column.headerBg} shadow-sm`}>
                        {column.icon}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-gray-800 dark:text-white leading-none">{column.title}</h3>
                        <p className="text-xs text-gray-400 dark:text-slate-400 font-medium mt-0.5">{column.subtitle}</p>
                      </div>
                    </div>
                    <div className={`${column.tagBg} text-sm font-black w-8 h-8 rounded-xl flex items-center justify-center border`} style={{ borderColor: column.accentColor + '30' }}>
                      {columnTasks.length}
                    </div>
                  </div>
                  {/* Column Progress Bar */}
                  {totalTasks > 0 && (
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${totalTasks > 0 ? (columnTasks.length / totalTasks) * 100 : 0}%`, backgroundColor: column.accentColor }}
                      />
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/60 dark:bg-slate-700 mx-4" />

                {/* Cards container */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                      <div className="w-8 h-8 rounded-full border-4 border-[#BEE3E6] border-t-[#118B95] animate-spin" />
                      <span className="text-xs font-bold text-gray-400">Loading tasks...</span>
                    </div>
                  ) : columnTasks.length === 0 ? (
                      <div className={`flex-1 min-h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                      isHovered ? 'border-[#118B95] bg-[#E6F5F6]/50 dark:bg-slate-800/50 scale-[1.02]' : 'border-gray-300/60 dark:border-slate-700'
                    }`}>
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-gray-400">Drop tasks here</span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.LOW;
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
                      const assignees = task.assignments || [];

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing overflow-hidden group"
                        >
                          {/* Priority bar on top */}
                          <div className={`h-1 w-full ${priority.bar}`} />

                          <div className="p-4">
                            {/* Project tag + Priority badge */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              {task.project?.name && (
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 max-w-[120px] truncate">
                                  {task.project.name}
                                </span>
                              )}
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${priority.badge} ml-auto`}>
                                {priority.label}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-[#118B95] dark:group-hover:text-[#2AA7B3] transition-colors leading-snug line-clamp-2 mb-2">
                              {task.title}
                            </h4>

                            {/* Description */}
                            {task.description && (
                              <p className="text-xs text-gray-400 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3">
                                {task.description}
                              </p>
                            )}

                            {/* Checklist progress */}
                            <SubtaskProgress subtasks={task.subtasks} className="mb-3" />

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-700">
                              
                              {/* Assignee Avatars */}
                              <div className="flex -space-x-2">
                                {assignees.length > 0 ? (
                                  <>
                                    {assignees.slice(0, 3).map((a, i) => (
                                      <div
                                        key={i}
                                        title={a.user?.name}
                                        className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0D5A60] to-[#2AA7B3] border-2 border-white flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                                      >
                                        {getInitials(a.user?.name)}
                                      </div>
                                    ))}
                                    {assignees.length > 3 && (
                                      <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center text-[9px] font-black text-gray-500 dark:text-slate-400">
                                        +{assignees.length - 3}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Due Date */}
                              {task.dueDate && (
                                <span className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border ${
                                  isOverdue
                                    ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                    : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-700'
                                }`}>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {isOverdue && '⚠ '}
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
}
