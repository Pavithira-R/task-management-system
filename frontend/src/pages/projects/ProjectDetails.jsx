import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import projectService from '../../services/projectService';
import { useAuth } from '../../context/AuthContext';
import AttachmentManager from '../../components/attachments/AttachmentManager';
import SubtaskProgress from '../../components/tasks/SubtaskProgress';
import { useToast } from '../../utils/ToastContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  // Confirm Modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const res = await projectService.getProjectById(parseInt(id));
      if (res.success) {
        setProject(res.data.project);
        setAnalytics(res.data.analytics);
      }

      const tasksRes = await projectService.getProjectTasks(parseInt(id));
      if (tasksRes.success) {
        setTasks(tasksRes.data);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      const res = await projectService.addProjectMember(parseInt(id), {
        userId: parseInt(selectedUserId),
        role: 'COLLABORATOR',
      });

      if (res.success) {
        setSelectedUserId('');
        setSelectedUserName('');
        setDropdownSearch('');
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add project member');
    }
  };

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return;
    try {
      const res = await projectService.removeProjectMember(parseInt(id), memberToRemove);
      if (res.success) {
        setConfirmModalOpen(false);
        setMemberToRemove(null);
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleRemoveMember = (memberId) => {
    setMemberToRemove(memberId);
    setConfirmModalOpen(true);
  };

  const handleUpdateDeadline = async (e) => {
    const newDeadline = e.target.value;
    try {
      const res = await projectService.updateProject(parseInt(id), { endDate: newDeadline || null });
      if (res.success) {
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update project deadline');
    }
  };

  const isProjectOwner = user?.role === 'PROJECT_MANAGER' && project?.owner?.id === user?.id;
  const canCreateTask = user?.role === 'PROJECT_MANAGER' && project?.members?.some(m => m.userId === user?.id);
  const activeMembers = project?.members ? project.members.filter(m => m.user?.status === 'ACTIVE') : [];

  useEffect(() => {
    if (!isProjectOwner) return;

    if (dropdownSearch.trim().length < 2) {
      setAllUsers([]);
      return;
    }

    const fetchCollaborators = async () => {
      try {
        const res = await projectService.getSearchableUsers(dropdownSearch);
        if (res.success) {
          setAllUsers(res.data);
        }
      } catch (err) {
        console.error('Error fetching collaborators:', err);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchCollaborators();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [isProjectOwner, dropdownSearch]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-gray-400 font-medium text-[15px]">Loading workspace details...</div>
      </DashboardLayout>
    );
  }

  if (accessDenied) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeUp">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-indigo-950 mb-2">Access Denied</h2>
          <p className="text-gray-500 font-medium max-w-md mb-6">
            You don't have access to this project. Please contact the project owner or administrator to request access.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="px-6 py-2.5 bg-[#118B95] hover:bg-[#0D5A60] text-white font-bold rounded-xl transition-all"
          >
            Return to Workspaces
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="text-center py-20 text-red-500 font-bold text-[15px]">Project not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6 animate-fadeUp">
        
        {/* Breadcrumb Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <button 
              onClick={() => navigate('/projects')}
              className="text-[13px] font-bold text-[#118B95] hover:text-indigo-800 mb-1 flex items-center gap-1 cursor-pointer"
            >
              ← Back to workspaces
            </button>
            <h1 className="text-[26px] font-extrabold text-indigo-950 tracking-tight">{project.name}</h1>
            <p className="text-[14px] text-gray-500 font-medium max-w-xl">{project.description || 'No description.'}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Deadline:</span>
              {isProjectOwner ? (
                <input 
                  type="date"
                  value={project.endDate ? project.endDate.split('T')[0] : ''}
                  onChange={handleUpdateDeadline}
                  className="border border-gray-200 rounded-md px-2 py-1 text-[12px] text-indigo-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#118B95] cursor-pointer"
                />
              ) : (
                <span className="text-[13px] font-semibold text-indigo-900">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No Deadline'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            {canCreateTask && (
              <button
                onClick={() => navigate(`/tasks/create?projectId=${project.id}`)}
                className="px-4.5 py-2.5 bg-[#118B95] hover:bg-[#0D5A60] text-white font-bold text-[13.5px] rounded-xl cursor-pointer shadow-sm transition-all"
              >
                + Create Task
              </button>
            )}
          </div>
        </div>

        {/* Progress Metrics Panel */}
        {analytics && (
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-4 mt-2">
            <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm text-center">
              <span className="text-gray-400 font-bold text-[11px] uppercase tracking-wider block">Total Tasks</span>
              <p className="text-[24px] font-extrabold text-indigo-950 mt-1">{analytics.totalTasks}</p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 text-center">
              <span className="text-emerald-700 font-bold text-[11px] uppercase tracking-wider block">Completed</span>
              <p className="text-[24px] font-extrabold text-emerald-800 mt-1">{analytics.completedTasks}</p>
            </div>
            <div className="bg-[#E6F5F6]/50 p-4 rounded-xl border border-indigo-100/50 text-center">
              <span className="text-[#0D5A60] font-bold text-[11px] uppercase tracking-wider block">In Progress</span>
              <p className="text-[24px] font-extrabold text-indigo-800 mt-1">{analytics.inProgressTasks}</p>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50 text-center">
              <span className="text-amber-700 font-bold text-[11px] uppercase tracking-wider block">Pending</span>
              <p className="text-[24px] font-extrabold text-amber-800 mt-1">{analytics.pendingTasks}</p>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100/50 text-center">
              <span className="text-rose-700 font-bold text-[11px] uppercase tracking-wider block">Overdue ⚠️</span>
              <p className="text-[24px] font-extrabold text-rose-800 mt-1">{analytics.overdueTasks}</p>
            </div>
            <div className="bg-[#118B95] p-4 rounded-xl text-center text-white">
              <span className="text-indigo-200 font-bold text-[11px] uppercase tracking-wider block">Completed %</span>
              <p className="text-[24px] font-extrabold mt-1">{analytics.completionPercentage}%</p>
            </div>
          </section>
        )}

        {/* Project Layout Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
          
          {/* Left Column: Tasks and Attachments */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Main Tasks List */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-indigo-950">Workspace Tasks</h3>
              <span className="text-[12px] text-gray-400 font-bold">{tasks.length} total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-6 py-4">Task Details</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tasks.map((task) => (
                    <tr 
                      key={task.id} 
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-indigo-950 text-[13.5px]">{task.title}</div>
                        <div className="text-gray-400 text-[12px] truncate max-w-xs">{task.description || 'No description.'}</div>
                        <SubtaskProgress subtasks={task.subtasks} className="mt-1.5 max-w-[200px]" />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-[#E6F5F6] text-[#0D5A60]'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold ${
                          task.priority === 'HIGH'
                            ? 'text-rose-600'
                            : task.priority === 'MEDIUM'
                            ? 'text-[#118B95]'
                            : 'text-gray-500'
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[12px] font-semibold text-gray-500">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No limit'}
                      </td>
                    </tr>
                  ))}

                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-semibold text-[14px]">
                        📝 No tasks created for this project workspace yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            
          {/* Project Attachments */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <AttachmentManager projectId={project.id} />
            </div>
          </div>

          {/* Members Sidebar Panel */}
          <div className="flex flex-col gap-6">
            
            {/* Project Members List */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div className="border-b border-gray-50 pb-3 flex justify-between items-center">
                <h3 className="text-[15px] font-bold text-indigo-950">Project Members</h3>
                <span className="text-[12px] text-[#118B95] font-bold">({activeMembers.length})</span>
              </div>

              <div className="flex flex-col gap-3">
                {activeMembers.map((m) => (
                  <div key={m.id} className="flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 text-[#0D5A60] font-bold text-[12px] flex items-center justify-center flex-shrink-0">
                        {(m.user?.name?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-indigo-950 truncate leading-snug">{m.user?.name}</p>
                        <span className="text-[10px] text-[#2AA7B3] font-bold uppercase tracking-wider block">
                          {m.role}
                        </span>
                      </div>
                    </div>

                    {isProjectOwner && m.userId !== project.owner?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-[11px] font-bold text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {activeMembers.length === 0 && (
                  <p className="text-[12px] text-gray-400 italic">No active members found.</p>
                )}
              </div>

              {/* Add Member Form (Admins & Owners only) */}
              {isProjectOwner && (
                <form onSubmit={handleAddMember} className="border-t border-gray-50 pt-4 flex flex-col gap-3">
                  <h4 className="text-[13px] font-bold text-indigo-950">Link Team Member</h4>
                  

                  <div className="relative">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Select Collaborator</label>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] bg-white cursor-pointer flex justify-between items-center"
                    >
                      <span className={selectedUserId ? 'text-indigo-950 font-semibold' : 'text-gray-400'}>
                        {selectedUserId 
                          ? selectedUserName || 'Unknown User' 
                          : '-- Choose Collaborator --'}
                      </span>
                      <span className="text-gray-400 text-[10px]">▼</span>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Search name or email..."
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#118B95] bg-white"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          
                          {dropdownSearch.trim().length < 2 ? (
                            <div className="px-3 py-4 text-center text-[12px] text-gray-500 italic">Type at least 2 characters to search...</div>
                          ) : (
                            <>
                              {allUsers
                                .filter(u => !project.members.some(pm => pm.userId === u.id))
                                .filter(u => 
                                  u.name.toLowerCase().includes(dropdownSearch.toLowerCase()) || 
                                  u.email.toLowerCase().includes(dropdownSearch.toLowerCase())
                                )
                                .map(u => (
                                  <div 
                                    key={u.id}
                                    onClick={() => {
                                      setSelectedUserId(u.id);
                                      setSelectedUserName(u.name);
                                      setIsDropdownOpen(false);
                                      setDropdownSearch('');
                                    }}
                                    className="px-3 py-2 hover:bg-[#E6F5F6] cursor-pointer border-b border-gray-50 last:border-0"
                                  >
                                    <div className="font-bold text-indigo-950 text-[13px]">{u.name}</div>
                                    <div className="text-[11px] text-gray-500">{u.email}</div>
                                  </div>
                                ))}

                              {allUsers.filter(u => !project.members.some(pm => pm.userId === u.id)).length === 0 && (
                                <div className="px-3 py-4 text-center text-[12px] text-gray-500 italic">No available collaborators found.</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#118B95] hover:bg-[#0D5A60] text-white rounded-xl text-[12px] font-bold cursor-pointer mt-1"
                  >
                    + Add to Workspace
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

      </div>
      
      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Remove Member"
        message="Are you sure you want to remove this member from the project?"
        confirmText="Remove"
        isDestructive={true}
        onConfirm={handleRemoveConfirm}
        onCancel={() => {
          setConfirmModalOpen(false);
          setMemberToRemove(null);
        }}
      />
    </DashboardLayout>
  );
}
