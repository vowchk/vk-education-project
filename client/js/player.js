if (!Auth.isAuthenticated()) window.location.href = 'login.html';

const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const userId = params.get('userId');
const userName = params.get('userName') || 'Игрок';
if (!code || !userId) window.location.href = 'dashboard.html';

document.getElementById('roomCode').textContent = code;

const socket = io(); // Подключается к текущему домену автоматически
let participantId = null;
let questionTimer = null;
let timeLeft = 0;

socket.emit('join_room', { roomId: code, userId, userName }, (res) => {
  if (res.success) participantId = res.participantId;
  else alert(res.error);
});

socket.on('question_started', (data) => {
  if (questionTimer) clearInterval(questionTimer);
  document.getElementById('waiting').classList.add('hidden');
  document.getElementById('questionBlock').classList.remove('hidden');
  document.getElementById('questionText').textContent = data.text;
  document.getElementById('questionImage').innerHTML = data.imageUrl ? `<img src="${data.imageUrl}">` : '';
  
  const submitBtn = document.getElementById('submitAnswerBtn');
  submitBtn.classList.add('hidden');
  timeLeft = data.timeLimit;
  updateTimerDisplay();
  
  questionTimer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(questionTimer);
      document.getElementById('options').innerHTML = '<p class="time-up">⏰ Время вышло!</p>';
      submitBtn.classList.add('hidden');
    }
  }, 1000);

  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';
  
  if (data.answerType === 'single') {
    data.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-option';
      btn.textContent = opt;
      btn.onclick = () => {
        if (timeLeft <= 0) return;
        clearInterval(questionTimer);
        socket.emit('submit_answer', { roomId: code, participantId, questionIndex: data.questionIndex, answerIdx: idx, timeLeft });
        optionsDiv.innerHTML = '<p class="success">✅ Ответ принят!</p>';
      };
      optionsDiv.appendChild(btn);
    });
  } else {
    data.options.forEach((opt, idx) => {
      const label = document.createElement('label');
      label.className = 'checkbox-option';
      label.innerHTML = `<input type="checkbox" value="${idx}" class="answer-checkbox"><span>${opt}</span>`;
      optionsDiv.appendChild(label);
    });
    submitBtn.classList.remove('hidden');
    submitBtn.onclick = () => {
      if (timeLeft <= 0) return;
      const selected = Array.from(optionsDiv.querySelectorAll('.answer-checkbox:checked')).map(cb => parseInt(cb.value));
      if (selected.length === 0) return alert('Выберите хотя бы один ответ');
      clearInterval(questionTimer);
      socket.emit('submit_answer', { roomId: code, participantId, questionIndex: data.questionIndex, answerIdx: selected, timeLeft });
      optionsDiv.innerHTML = '<p class="success">✅ Ответ принят!</p>';
      submitBtn.classList.add('hidden');
    };
  }
});

function updateTimerDisplay() {
  const timerDiv = document.getElementById('timer');
  timerDiv.textContent = `⏱️ ${timeLeft}с`;
  timerDiv.style.color = timeLeft <= 5 ? '#ef4444' : (timeLeft <= 10 ? '#f59e0b' : '#10b981');
}

socket.on('leaderboard_update', (players) => {
  document.getElementById('leaderboard').innerHTML = players.map((p, i) => 
    `<li class="${p.name === userName ? 'me' : ''}"><span>${i + 1}. ${p.name}</span><span><strong>${p.score}</strong></span></li>`
  ).join('');
});

socket.on('time_up', () => {
  const opts = document.getElementById('options');
  if (opts && !opts.querySelector('.time-up')) opts.innerHTML = '<p class="time-up"> Время вышло!</p>';
});

socket.on('quiz_finished', (data) => {
  if (questionTimer) clearInterval(questionTimer);
  document.getElementById('waiting').classList.add('hidden');
  document.getElementById('questionBlock').classList.add('hidden');
  document.querySelector('.leaderboard:not(.final-leaderboard)').classList.add('hidden');
  document.querySelector('.player-actions').classList.add('hidden');

  const clone = document.getElementById('final-screen-template').content.cloneNode(true);
  const podium = clone.querySelector('.podium-content');
  
  if (data.leaderboard.length > 0) {
    const colors = ['#fbbf24', '#9ca3af', '#cd7f32'];
    const medals = ['🥇', '🥈', '🥉'];
    podium.innerHTML = data.leaderboard.slice(0, 3).map((p, i) => `
      <div class="podium-place" style="background: ${colors[i]};">
        <div class="medal">${medals[i]}</div><div class="place-name">${p.name}</div><div class="place-score">${p.score}</div>
      </div>`).join('');
  } else {
    podium.innerHTML = '<p>Нет участников</p>';
  }
  
  clone.querySelector('.final-leaderboard-list').innerHTML = data.leaderboard.map((p, i) => 
    `<li class="${p.name === userName ? 'me' : ''}"><span>${i + 1}. ${p.name}</span><span><strong>${p.score}</strong></span></li>`
  ).join('');
  
  document.querySelector('.container').appendChild(clone);
  window.scrollTo(0, 0);
});