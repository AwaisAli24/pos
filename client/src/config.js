// Central API configuration
// Change VITE_API_URL in .env.production before deploying to VPS
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE;
