const Auth = {
  getToken() { return localStorage.getItem('token'); },
  setToken(token) { localStorage.setItem('token', token); },
  getUser() { 
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null; 
  },
  setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },
  isAuthenticated() { return !!this.getToken(); },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  }
};

async function apiRequest(url, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Просто используем относительный путь, браузер сам разберется
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    Auth.logout();
    throw new Error('Требуется авторизация');
  }
  return response;
}