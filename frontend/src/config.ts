// Centralized API configuration
// All components should import from here instead of hardcoding URLs

const DEFAULT_API_URL = 'http://localhost:8000';

export const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export const WS_URL = API_BASE.replace('http', 'ws') + '/ws';
