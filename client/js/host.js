if (!Auth.isAuthenticated()) window.location.href = 'login.html';

const params = new URLSearchParams(window.location.search);
const code = params.get('code');
if (!code) window.location.href = 'dashboard.html';

document.getElementById('roomCode').textContent = code;

const socket = io(); // Подключается к текущему домену автоматически
let currentQ = 0;
let totalQuestions = 0;
let participantId = null;

// Относительный путь
fetch(`/api/quiz/${code}`)
  .then(res => res.json())
  .then(quiz => {
    totalQuestions = quiz.questions.length;
    document.getElementById('totalQuestions').textContent = totalQuestions;
    
    const user = Auth.getUser();
    socket.emit('join_room', { roomId: code, userId: user.id, userName: user.name }, (res) => {
      participantId = res.isOrganizer ? null : res.participantId;
    });
  });

socket.on('player_joined', (data) => {
  document.getElementById('playerCount').textContent = data.participants.length;
});

socket.on('leaderboard_update', (players) => {
  document.getElementById('leaderboard').innerHTML = players.map((p, i) =>
    `<li><span>${i + 1}. ${p.name}</span><span><strong>${p.score}</strong> баллов</span></li>`
  ).join('');
});

socket.on('quiz_finished', (data) => showFinalScreen(data.leaderboard));

function startQuestion() {
  socket.emit('start_question', { roomId: code, questionIndex: currentQ }, (response) => {
    if (response && response.finished) return;
    currentQ++;
    document.getElementById('finishEarlyBtn').style.display = 'inline-block';
    const btn = document.getElementById('startBtn');
    if (currentQ >= totalQuestions) {
      btn.textContent = '🏁 Завершить квиз и показать результаты';
      btn.classList.replace('btn-blue', 'btn-green');
      btn.onclick = finishQuiz;
    } else {
      btn.textContent = `▶ Запустить вопрос ${currentQ + 1}`;
    }
  });
}

function finishQuiz() {
  document.getElementById('startBtn').disabled = true;
  socket.emit('finish_quiz', { roomId: code });
}

function finishQuizEarly() {
  if (confirm('Завершить квиз досрочно?')) {
    document.getElementById('finishEarlyBtn').disabled = true;
    socket.emit('finish_quiz', { roomId: code });
  }
}

function showFinalScreen(leaderboard) {
  document.getElementById('roomInfo').style.display = 'none';
  const finalScreen = document.getElementById('finalScreen');
  finalScreen.classList.remove('hidden');
  
  document.querySelector('.final-results h1').textContent = leaderboard.length > 0 ? '🎉 Квиз завершён!' : '📋 Квиз завершён без участников';
  
  const podium = document.getElementById('podiumContent');
  if (leaderboard.length > 0) {
    const colors = ['#fbbf24', '#9ca3af', '#cd7f32'];
    const medals = ['🥇', '🥈', '🥉'];
    podium.innerHTML = leaderboard.slice(0, 3).map((p, i) => `
      <div class="podium-place" style="background: ${colors[i]};">
        <div class="medal">${medals[i]}</div>
        <div class="place-name">${p.name}</div>
        <div class="place-score">${p.score} баллов</div>
      </div>`).join('');
  } else {
    podium.innerHTML = '<p class="no-players">Нет участников</p>';
  }
  
  document.getElementById('finalLeaderboard').innerHTML = leaderboard.map((p, i) =>
    `<li><span>${i + 1}. ${p.name}</span><span><strong>${p.score}</strong> баллов</span></li>`
  ).join('') || '<li>Нет участников</li>';
  
  document.querySelector('.container > h1').textContent = '🏆 Результаты квиза';
  window.scrollTo(0, 0);
}