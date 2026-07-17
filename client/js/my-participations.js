if (!Auth.isAuthenticated()) {
  window.location.href = 'login.html';
}

async function loadParticipations() {
  try {
    const res = await apiRequest('/api/my-participations');
    const participations = await res.json();

    if (!res.ok) {
      throw new Error(participations.error || 'Ошибка загрузки');
    }

    const listDiv = document.getElementById('participationsList');
    const emptyState = document.getElementById('emptyState');

    if (participations.length === 0) {
      listDiv.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    listDiv.innerHTML = participations.map(part => `
      <div class="quiz-card">
        <h3>${part.quiz.title}</h3>
        <p>Организатор: ${part.quiz.host.name}</p>
        <p>Ваш счёт: <strong>${part.score}</strong> баллов</p>
        <p>Дата: ${new Date(part.quiz.createdAt).toLocaleDateString('ru-RU')}</p>
        <p>Статус квиза: ${getStatusText(part.quiz.status)}</p>
      </div>
    `).join('');
  } catch (error) {
    console.error('Ошибка загрузки участий:', error);
    alert('Ошибка загрузки участий');
  }
}

function getStatusText(status) {
  const statuses = {
    'waiting': '⏳ Ожидание',
    'active': '🎮 Активен',
    'finished': '✅ Завершён'
  };
  return statuses[status] || status;
}

loadParticipations();