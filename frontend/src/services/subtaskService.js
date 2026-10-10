/**
 * subtaskService.js — Task checklist (subtask) API queries
 */
import api from './api';

export const subtaskService = {
  /**
   * Get all checklist items for a task
   */
  getSubtasks: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  },

  /**
   * Add a checklist item to a task
   * @param {number} taskId
   * @param {string} title
   */
  addSubtask: async (taskId, title) => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
  },

  /**
   * Rename and/or tick a checklist item
   * @param {number} subtaskId
   * @param {{ title?: string, isCompleted?: boolean }} changes
   */
  updateSubtask: async (subtaskId, changes) => {
    const response = await api.patch(`/subtasks/${subtaskId}`, changes);
    return response.data;
  },

  /**
   * Delete a checklist item
   */
  deleteSubtask: async (subtaskId) => {
    const response = await api.delete(`/subtasks/${subtaskId}`);
    return response.data;
  },
};

export default subtaskService;
