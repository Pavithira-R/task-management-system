import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import taskService from '../../services/taskService';
import CommentSection from '../../components/comments/CommentSection';
import AttachmentManager from '../../components/attachments/AttachmentManager';
import SubtaskChecklist from '../../components/tasks/SubtaskChecklist';
import { useToast } from '../../utils/ToastContext';

export default function TaskDetails() {
  const { user } = useAuth();
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // silent: refresh data (e.g. the activity trail) without showing the full-page loader
  const fetchTaskDetails = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await taskService.getTaskById(parseInt(id));
      // In taskService.getTaskById, response structure might be res.data or direct res
      const taskData = res.data || res;
      setTask(taskData);
    } catch (err) {
      console.error('Error fetching task details:', err);
      setError(err.response?.data?.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      await taskService.updateTaskStatus(task.id, newStatus);
      setTask(prev => ({ ...prev, status: newStatus }));
      // Reload details to get the newly appended TaskActivity log
      fetchTaskDetails({ silent: true });
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-[#E6F5F6] text-[#0D5A60] border-[#93CFD4]';
      case 'TODO':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const formatActivityAction = (action) => {
    switch (action) {
      case 'CREATED':
        return '🌱 Created';
      case 'UPDATED':
        return '✏️ Updated';
      case 'ASSIGNED':
        return '👤 Assigned';
      case 'COMMENTED':
        return '💬 Commented';
      case 'COMPLETED':
        return '✅ Completed';
      case 'DELETED':
        return '🗑️ Deleted';
      default:
        return 'ℹ️ Action';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-9 h-9 border-4 border-[#118B95]/30 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-gray-400 text-[13.5px] font-semibold">Loading task information...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !task) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-500 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
          <h2 className="text-[20px] font-bold text-indigo-950">Failed to load task</h2>
          <p className="text-gray-500 text-[14px] max-w-sm leading-relaxed">{error || 'Task could not be found.'}</p>
          <button 
            onClick={() => navigate('/tasks')}
            className="px-5 py-2.5 bg-[#118B95] hover:bg-[#0D5A60] text-white font-bold text-[13.5px] rounded-xl shadow-md shadow-indigo-100 cursor-pointer mt-2"
          >
            Back to Task List
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        
        {/* Navigation / Back breadcrumbs */}
        <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-400">
          <Link to="/tasks" className="hover:text-[#118B95]">Tasks</Link>
          <span>/</span>
          <span className="text-indigo-950 truncate max-w-[200px]">Task #{task.id}</span>
        </div>

        {/* Task Title banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold text-indigo-950 tracking-tight leading-tight mb-2 truncate">
              {task.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-gray-400 font-medium">Project:</span>
              <Link 
                to={`/projects/${task.projectId}`} 
                className="text-[12.5px] font-bold text-[#118B95] hover:text-indigo-800 transition-colors"
              >
                📁 {task.project?.name || `Project #${task.projectId}`}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-indigo-950">Stage:</span>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={user?.role === 'ADMIN'}
              className="text-[13px] font-bold text-indigo-800 bg-[#E6F5F6] border border-indigo-100 px-3 py-1.5 rounded-xl cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="BACKLOG">📝 Backlog</option>
              <option value="TODO">⏳ To Do</option>
              <option value="IN_PROGRESS">🔄 In Progress</option>
              <option value="COMPLETED">✅ Completed</option>
            </select>
          </div>
        </div>

        {/* Details Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main info (left columns) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Task Description */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-3">
              <h3 className="text-[15px] font-extrabold text-indigo-950 border-b border-gray-50 pb-2">📋 Task Description</h3>
              <p className="text-[13.5px] text-gray-600 leading-relaxed whitespace-pre-line">
                {task.description || 'No description provided for this task.'}
              </p>
            </div>

            {/* Checklist Section */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
              <SubtaskChecklist task={task} onChange={() => fetchTaskDetails({ silent: true })} />
            </div>

            {/* Attachments Section */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
              <AttachmentManager taskId={task.id} />
            </div>

            {/* Comments Section */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm">
              <CommentSection taskId={task.id} />
            </div>

          </div>

          {/* Sidebar Info (right column) */}
          <div className="flex flex-col gap-6">
            
            {/* Quick Metadata parameters */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-extrabold text-indigo-950 border-b border-gray-50 pb-1">⚙️ Properties</h3>
              
              <div className="flex justify-between items-center text-[13px] border-b border-gray-55/65 pb-2">
                <span className="text-gray-400 font-semibold">Priority</span>
                <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              <div className="flex justify-between items-center text-[13px] border-b border-gray-55/65 pb-2">
                <span className="text-gray-400 font-semibold">Status</span>
                <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center text-[13px] border-b border-gray-55/65 pb-2">
                <span className="text-gray-400 font-semibold">Due Date</span>
                <span className={`text-[12.5px] font-bold ${
                  task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                    ? 'text-rose-600 font-extrabold'
                    : 'text-indigo-950'
                }`}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Deadline'}
                </span>
              </div>

              <div className="flex justify-between items-center text-[13px] border-b border-gray-55/65 pb-2">
                <span className="text-gray-400 font-semibold">Creator</span>
                <span className="text-indigo-950 font-bold text-[12.5px]">
                  {task.creator?.name || 'System'}
                </span>
              </div>

              {/* Assignees list */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[13px] text-gray-400 font-semibold">Task Assignees</span>
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {task.assignees.map((a) => (
                      <div key={a.id} className={`flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2 ${a.user?.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                          {a.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[12.5px] font-bold text-indigo-950 truncate">
                          {a.user?.name}
                          {a.user?.status === 'INACTIVE' && (
                            <span className="text-[9.5px] font-bold text-gray-400 bg-gray-200/60 px-1.5 py-0.5 rounded ml-1.5">
                              Inactive
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-gray-400 italic">No users assigned.</span>
                )}
              </div>
            </div>

            {/* Audit Trail Activity Timeline */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
              <h3 className="text-[15px] font-extrabold text-indigo-950 border-b border-gray-50 pb-2">🕒 Audit Activity Trail</h3>
              
              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                {task.taskActivities && task.taskActivities.length > 0 ? (
                  task.taskActivities.map((act, index) => (
                    <div key={act.id} className="flex gap-3 items-start relative">
                      {/* Vertical line connecting timeline nodes */}
                      {index !== task.taskActivities.length - 1 && (
                        <span className="absolute left-[9px] top-6 w-[2px] h-[calc(100%+16px)] bg-gray-100" />
                      )}
                      
                      <div className="w-5 h-5 rounded-full border-2 border-[#118B95] bg-white flex items-center justify-center flex-shrink-0 z-10">
                        <span className="w-1.5 h-1.5 bg-[#118B95] rounded-full" />
                      </div>

                      <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11.5px] font-extrabold text-indigo-950">
                            {formatActivityAction(act.action)}
                          </span>
                          <span className="text-[9.5px] text-gray-400 font-semibold whitespace-nowrap">
                            {new Date(act.createdAt).toLocaleDateString()} at {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-500 leading-snug">
                          {act.description}
                        </p>
                        <span className="text-[10px] text-[#118B95] font-bold">
                          By: {act.user?.name}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-[12px] text-gray-400 italic">No activity logs recorded.</span>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
