const { prisma } = require('./db');

const questionTimers = {};

function setupSocket(io) {
  console.log('🔌 WebSocket сервер инициализирован');
  
  io.on('connection', (socket) => {
    console.log('👤 Подключился клиент:', socket.id);

    socket.on('join_room', async ({ roomId, userId, userName }, callback) => {
      try {
        const quiz = await prisma.quiz.findUnique({ where: { code: roomId } });
        if (!quiz) return callback({ error: 'Комната не найдена' });

        socket.join(roomId);
        
        // Проверяем, является ли пользователь организатором
        const isOrganizer = quiz.hostId === userId;
        
        let participant = null;
        
        // Создаем запись Participant только для обычных игроков
        if (!isOrganizer) {
          participant = await prisma.participant.findFirst({
            where: { quizId: quiz.id, userId }
          });

          if (!participant) {
            participant = await prisma.participant.create({
              data: { 
                quizId: quiz.id, 
                userId,
                name: userName, 
                score: 0, 
                answers: '[]' 
              }
            });
          }
        }

        // Получаем список участников (без организатора)
        const participants = await prisma.participant.findMany({ 
          where: { quizId: quiz.id } 
        });
        
        io.to(roomId).emit('player_joined', { participants });
        callback({ success: true, participantId: participant?.id, isOrganizer });
      } catch (error) {
        console.error('Ошибка подключения:', error);
        callback({ error: 'Ошибка сервера' });
      }
    });

    socket.on('start_question', async ({ roomId, questionIndex }, callback) => {
      try {
        const quiz = await prisma.quiz.findUnique({ 
          where: { code: roomId }, 
          include: { questions: true } 
        });
        if (!quiz) return;

        if (questionIndex >= quiz.questions.length) {
          await prisma.quiz.update({ where: { code: roomId }, data: { status: 'finished' } });
          const leaderboard = await prisma.participant.findMany({ 
            where: { quizId: quiz.id }, 
            orderBy: { score: 'desc' } 
          });
          io.to(roomId).emit('quiz_finished', { leaderboard });
          if (callback) callback({ finished: true });
          return;
        }

        const question = quiz.questions.find(q => q.order === questionIndex);
        console.log(`📡 Отправляем вопрос ${questionIndex}. Тип: ${question.answerType}, Время: ${question.timeLimit}`);

        io.to(roomId).emit('question_started', {
          questionIndex,
          text: question.text,
          options: JSON.parse(question.options),
          imageUrl: question.imageUrl,
          answerType: question.answerType,  // ← Передаем тип ответа
          correctAnswers: JSON.parse(question.correctAnswers),  // ← Передаем правильные ответы (для отладки, можно убрать)
          timeLimit: question.timeLimit
        });

        if (questionTimers[roomId]) clearTimeout(questionTimers[roomId]);
        
        questionTimers[roomId] = setTimeout(() => {
          console.log(` Время вышло для вопроса ${questionIndex}`);
          io.to(roomId).emit('time_up', { questionIndex });
          delete questionTimers[roomId];
        }, question.timeLimit * 1000);

        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Ошибка запуска вопроса:', error);
      }
    });

    socket.on('submit_answer', async ({ roomId, participantId, questionIndex, answerIdx, timeLeft }) => {
      try {
        if (!participantId) return;
        
        const quiz = await prisma.quiz.findUnique({ 
          where: { code: roomId }, 
          include: { questions: true } 
        });
        const question = quiz.questions.find(q => q.order === questionIndex);
        const participant = await prisma.participant.findUnique({ where: { id: participantId } });
        
        if (!question || !participant) return;

        const correctAnswers = JSON.parse(question.correctAnswers);
        const answerType = question.answerType;
        
        // Проверяем правильность ответа
        let isCorrect = false;
        
        if (answerType === 'single') {
          // Одиночный выбор: answerIdx — это число
          isCorrect = correctAnswers.includes(answerIdx);
        } else {
          // Множественный выбор: answerIdx — это массив выбранных индексов
          const selectedAnswers = Array.isArray(answerIdx) ? answerIdx : [answerIdx];
          
          // Проверяем: все правильные выбраны И нет лишних
          const allCorrectSelected = correctAnswers.every(ans => selectedAnswers.includes(ans));
          const noWrongSelected = selectedAnswers.every(ans => correctAnswers.includes(ans));
          isCorrect = allCorrectSelected && noWrongSelected;
        }

        // Формула баллов
        let points = 0;
        if (isCorrect && timeLeft !== undefined) {
          const timeRatio = Math.max(0, Math.min(1, timeLeft / question.timeLimit));
          points = Math.round(50 + 50 * timeRatio);
        }

        const answers = JSON.parse(participant.answers || '[]');
        answers.push({ 
          questionIndex, 
          answerIdx, 
          isCorrect, 
          points, 
          timeLeft 
        });

        await prisma.participant.update({
          where: { id: participantId },
          data: {
            score: participant.score + points,
            answers: JSON.stringify(answers)
          }
        });

        const leaderboard = await prisma.participant.findMany({ 
          where: { quizId: quiz.id }, 
          orderBy: { score: 'desc' } 
        });
        
        io.to(roomId).emit('leaderboard_update', leaderboard);
      } catch (error) {
        console.error('Ошибка обработки ответа:', error);
      }
    });

    socket.on('finish_quiz', async ({ roomId }, callback) => {
      try {
        await prisma.quiz.update({ where: { code: roomId }, data: { status: 'finished' } });
        const leaderboard = await prisma.participant.findMany({ where: { quizId: (await prisma.quiz.findUnique({where: {code: roomId}})).id }, orderBy: { score: 'desc' } });
        io.to(roomId).emit('quiz_finished', { leaderboard });
        if (callback) callback({ success: true });
      } catch (error) {
        console.error('Ошибка завершения квиза:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('👋 Клиент отключился:', socket.id);
    });
  });
}

module.exports = { setupSocket };