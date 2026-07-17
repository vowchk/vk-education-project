if (!Auth.isAuthenticated()) {
  window.location.href = 'login.html';
}

async function loadQuizzes() {
  console.log('🔍 Загрузка квизов...');
  console.log('Токен:', Auth.getToken() ? 'есть' : 'нет');
  console.log('Пользователь:', Auth.getUser());
  
  // Показываем загрузку, скрываем остальное
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('quizzesList').classList.add('hidden');
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('errorState').classList.add('hidden');
  
  try {
    const res = await apiRequest('/api/my-quizzes');
    console.log('Статус ответа:', res.status);
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка загрузки');
    }
    
    const quizzes = await res.json();
    console.log('Получено квизов:', quizzes.length);
    console.log('Квизы:', quizzes);
    
    // Скрываем загрузку
    document.getElementById('loading').classList.add('hidden');
    
    if (quizzes.length === 0) {
      console.log(' Квизов нет, показываем пустое состояние');
      document.getElementById('emptyState').classList.remove('hidden');
      return;
    }
    
    console.log(`✅ Отображаем ${quizzes.length} квизов`);
    
    const listDiv = document.getElementById('quizzesList');
    listDiv.classList.remove('hidden');
    
    listDiv.innerHTML = quizzes.map(quiz => {
      const statusText = getStatusText(quiz.status);
      const statusIcon = getStatusIcon(quiz.status);
      const participantsCount = quiz._count ? quiz._count.participants : quiz.participants.length;
      const questionsCount = quiz.questions ? quiz.questions.length : 0;
      
      return `
        <div class="quiz-card">
          <div class="quiz-header">
            <h3>${quiz.title}</h3>
            <span class="quiz-status ${quiz.status}">${statusIcon} ${statusText}</span>
          </div>
          
          <div class="quiz-info">
            <div class="quiz-info-item">
              <span class="label">Код комнаты:</span>
              <span class="value code">${quiz.code}</span>
              <button onclick="copyCode('${quiz.code}')" class="btn-copy" title="Копировать">📋</button>
            </div>
            <div class="quiz-info-item">
              <span class="label">Вопросов:</span>
              <span class="value">${questionsCount}</span>
            </div>
            <div class="quiz-info-item">
              <span class="label">Участников:</span>
              <span class="value">${participantsCount}</span>
            </div>
            <div class="quiz-info-item">
              <span class="label">Создан:</span>
              <span class="value">${formatDate(quiz.createdAt)}</span>
            </div>
          </div>
          
          <div class="quiz-actions">
            <a href="host.html?code=${quiz.code}" class="btn btn-blue btn-small">
              ${quiz.status === 'finished' ? '📊 Посмотреть результаты' : ' Открыть комнату'}
            </a>
            ${quiz.status !== 'finished' ? `
              <button onclick="deleteQuiz('${quiz.code}')" class="btn btn-red btn-small">
                🗑️ Удалить
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ Ошибка загрузки квизов:', error);
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('errorState').classList.remove('hidden');
    document.getElementById('errorMessage').textContent = error.message;
  }
}

function getStatusText(status) {
  const statuses = {
    'waiting': 'Ожидание',
    'active': 'Активен',
    'finished': 'Завершён'
  };
  return statuses[status] || status;
}

function getStatusIcon(status) {
  const icons = {
    'waiting': '⏳',
    'active': '🎮',
    'finished': '✅'
  };
  return icons[status] || '📋';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `Код ${code} скопирован!`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }).catch(err => {
    console.error('Не удалось скопировать:', err);
    alert('Код: ' + code);
  });
}

async function deleteQuiz(code) {
  if (!confirm(`Вы уверены, что хотите удалить квиз "${code}"?`)) {
    return;
  }
  
  try {
    const res = await apiRequest(`/api/quiz/${code}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка удаления');
    }
    
    console.log('✅ Квиз удален');
    loadQuizzes(); // Перезагружаем список
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    alert('Ошибка удаления: ' + error.message);
  }
}

// Загружаем квизы при открытии страницы
loadQuizzes();