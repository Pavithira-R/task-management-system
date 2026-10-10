/**
 * searchService.js — Global search API query
 */
import api from './api';

export const searchService = {
  /**
   * Search tasks, projects and comments the user can access (plus people for admins)
   * @param {string} q - at least 2 characters
   */
  search: async (q) => {
    const response = await api.get('/search', { params: { q } });
    return response.data;
  },
};

export default searchService;
