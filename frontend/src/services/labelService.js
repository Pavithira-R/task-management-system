/**
 * labelService.js — Project label (tag) API queries
 */
import api from './api';

export const labelService = {
  /**
   * Get all labels defined in a project
   */
  getProjectLabels: async (projectId) => {
    const response = await api.get(`/projects/${projectId}/labels`);
    return response.data;
  },

  /**
   * Create a label in a project
   * @param {number} projectId
   * @param {{ name: string, color?: string }} payload
   */
  createLabel: async (projectId, payload) => {
    const response = await api.post(`/projects/${projectId}/labels`, payload);
    return response.data;
  },

  /**
   * Rename or recolor a label
   */
  updateLabel: async (labelId, payload) => {
    const response = await api.patch(`/labels/${labelId}`, payload);
    return response.data;
  },

  /**
   * Delete a label (also removes it from every task)
   */
  deleteLabel: async (labelId) => {
    const response = await api.delete(`/labels/${labelId}`);
    return response.data;
  },

  /**
   * Replace the set of labels on a task
   * @param {number} taskId
   * @param {number[]} labelIds
   */
  setTaskLabels: async (taskId, labelIds) => {
    const response = await api.put(`/tasks/${taskId}/labels`, { labelIds });
    return response.data;
  },
};

export default labelService;
