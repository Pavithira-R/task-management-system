/**
 * labels.js — Shared helpers for task labels
 */

// Preset colors offered when creating a label (mid-tones that read well on light and dark backgrounds)
export const LABEL_COLORS = ['#118B95', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#22C55E', '#64748B'];

// Accepts task.labels as returned by the API ([{ label: {...} }]) or a plain list of labels
export const toLabelList = (labels) => (labels || []).map((l) => l.label || l);
