if (!Auth.isAuthenticated()) window.location.href = 'login.html';

async function joinQuiz() {
  const code = document.getElementById('code').value.trim().toUpperCase();
  const errorDiv = document.getElementById('error');

  if (!code) {
    errorDiv.textContent = 'Введите код комнаты';
    errorDiv.style.display = 'block';
    return;
  }
  errorDiv.style.display = 'none';

  try {
    // Относительный путь
    const res = await fetch(`/api/quiz/${code}`);
    if (res.status === 404) {
      errorDiv.textContent = '❌ Квиз с таким кодом не найден';
      errorDiv.style.display = 'block';
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      errorDiv.textContent = data.error || 'Ошибка';
      errorDiv.style.display = 'block';
      return;
    }
    const user = Auth.getUser();
    window.location.href = `player.html?code=${code}&userId=${user.id}&userName=${encodeURIComponent(user.name)}`;
  } catch (error) {
    errorDiv.textContent = 'Ошибка подключения к серверу';
    errorDiv.style.display = 'block';
  }
}