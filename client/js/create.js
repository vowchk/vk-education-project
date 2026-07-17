if (!Auth.isAuthenticated()) window.location.href = 'login.html';

function addQuestion() {
  const template = document.getElementById('question-template');
  const clone = template.content.cloneNode(true);
  const questionItem = clone.querySelector('.question-item');
  const questionId = 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  
  clone.querySelector('.remove-btn').addEventListener('click', function() {
    this.closest('.question-item').remove();
  });
  
  const fileInput = clone.querySelector('.question-image');
  const fileLabel = clone.querySelector('.file-upload-label');
  
  fileLabel.addEventListener('click', function(e) {
    e.preventDefault();
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const previewDiv = questionItem.querySelector('.image-preview');
        previewDiv.innerHTML = `
          <div class="image-preview-wrapper">
            <img src="${event.target.result}" alt="Preview">
            <button type="button" class="remove-image-btn">✕</button>
          </div>`;
        previewDiv.querySelector('.remove-image-btn').addEventListener('click', function() {
          fileInput.value = '';
          previewDiv.innerHTML = '';
        });
      };
      reader.readAsDataURL(file);
    }
  });

  clone.querySelectorAll('.answer-type-radio').forEach(radio => {
    radio.name = 'answerType_' + questionId;
    radio.addEventListener('change', function() {
      updateCorrectAnswersUI(questionItem, this.value, questionId);
    });
  });
  updateCorrectAnswersUI(questionItem, 'single', questionId);

  clone.querySelectorAll('.option-input').forEach((input, idx) => {
    input.addEventListener('input', function() {
      const labels = questionItem.querySelectorAll('.correct-answers-options span');
      if (labels[idx]) labels[idx].textContent = this.value || `Вариант ${idx + 1}`;
    });
  });

  document.getElementById('questionsContainer').appendChild(clone);
}

function updateCorrectAnswersUI(questionItem, answerType, questionId) {
  questionItem.querySelectorAll('.correct-answer-input').forEach(input => {
    input.name = 'correctAnswer_' + questionId;
    input.type = answerType === 'single' ? 'radio' : 'checkbox';
  });
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  // Относительный путь
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
    body: formData
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Ошибка загрузки');
  return (await res.json()).imageUrl;
}

async function createQuiz() {
  const title = document.getElementById('title').value || 'Мой квиз';
  const errorDiv = document.getElementById('error');
  const questionDivs = document.querySelectorAll('.question-item');

  if (questionDivs.length === 0) {
    errorDiv.textContent = 'Добавьте хотя бы один вопрос';
    errorDiv.style.display = 'block';
    return;
  }
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';

  try {
    const questionsData = [];
    for (let i = 0; i < questionDivs.length; i++) {
      const div = questionDivs[i];
      const text = div.querySelector('.question-text').value.trim();
      const imageInput = div.querySelector('.question-image');
      const options = Array.from(div.querySelectorAll('.option-input')).map(input => input.value.trim());
      const answerType = div.querySelector('.answer-type-radio:checked').value;
      const correctAnswers = Array.from(div.querySelectorAll('.correct-answer-input:checked')).map(input => parseInt(input.value));
      const timeLimit = parseInt(div.querySelector('.time-limit').value) || 15;

      if (!text) throw new Error(`Вопрос ${i + 1}: заполните текст`);
      if (options.some(opt => !opt)) throw new Error(`Вопрос ${i + 1}: заполните все варианты`);
      if (correctAnswers.length === 0) throw new Error(`Вопрос ${i + 1}: выберите правильный ответ`);

      let imageUrl = null;
      if (imageInput.files && imageInput.files[0]) imageUrl = await uploadImage(imageInput.files[0]);

      questionsData.push({ text, options, answerType, correctAnswers, timeLimit, imageUrl });
    }

    const res = await apiRequest('/api/quiz', {
      method: 'POST',
      body: JSON.stringify({ title, questions: questionsData })
    });
    const quiz = await res.json();
    if (!res.ok) throw new Error(quiz.error || 'Ошибка создания квиза');
    window.location.href = `host.html?code=${quiz.code}`;
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  }
}