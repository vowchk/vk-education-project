async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('error');

  // Сбрасываем ошибку перед новой попыткой
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';

  // Простая валидация на фронтенде
  if (!email || !password) {
    errorDiv.textContent = 'Пожалуйста, заполните все поля';
    errorDiv.style.display = 'block';
    return;
  }

  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    // Если сервер вернул ошибку (например, 401 Неверный пароль)
    if (!res.ok) {
      errorDiv.textContent = data.error || 'Ошибка входа';
      errorDiv.style.display = 'block';
      return; // Прерываем выполнение, не пускаем дальше
    }

    // Если всё успешно, сохраняем данные и переходим
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    window.location.href = 'dashboard.html';
    
  } catch (error) {
    console.error('Ошибка сети:', error);
    errorDiv.textContent = 'Ошибка соединения с сервером. Проверьте интернет.';
    errorDiv.style.display = 'block';
  }
}

// Позволяет нажать Enter в поле пароля для входа
document.getElementById('password').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    login();
  }
});