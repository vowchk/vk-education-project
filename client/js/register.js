async function register() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error');

  // Сбрасываем ошибку
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';

  // Валидация
  if (!name || !email || !password) {
    errorDiv.textContent = 'Пожалуйста, заполните все поля';
    errorDiv.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = 'Пароль должен содержать минимум 6 символов';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    // Если сервер вернул ошибку (например, email уже занят)
    if (!res.ok) {
      errorDiv.textContent = data.error || 'Ошибка регистрации';
      errorDiv.style.display = 'block';
      return; // Прерываем выполнение
    }

    // Если всё успешно
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Ошибка сети:', error);
    errorDiv.textContent = 'Ошибка соединения с сервером. Проверьте интернет.';
    errorDiv.style.display = 'block';
  }
}

// Позволяет нажать Enter в поле пароля для регистрации
document.getElementById('password').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    register();
  }
});