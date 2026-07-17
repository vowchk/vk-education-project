const { prisma } = require('./db');
const { authenticateToken, register, login, getCurrentUser } = require('./auth');
const { upload } = require('./upload');

function setupRoutes(app) {
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.get('/api/auth/me', authenticateToken, getCurrentUser);

  app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  app.post('/api/quiz', authenticateToken, async (req, res) => {
    console.log('=== НАЧАЛО СОЗДАНИЯ КВИЗА ===');
    
    const { title, questions } = req.body;
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Название и вопросы обязательны' });
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const quiz = await prisma.quiz.create({
        data: {
          title,
          hostId: req.user.id,
          code,
          questions: {
            create: questions.map((q, idx) => {
              // Нормализуем correctAnswers в массив
              let correctAnswers = q.correctAnswers;
              if (!Array.isArray(correctAnswers)) {
                correctAnswers = [parseInt(q.correctIdx) || 0];
              }
              
              const answerType = q.answerType || 'single';
              
              console.log(` Вопрос ${idx}:`, {
                text: q.text,
                answerType,
                correctAnswers,
                timeLimit: q.timeLimit
              });
              
              return {
                text: q.text,
                options: JSON.stringify(q.options),
                answerType,
                correctAnswers: JSON.stringify(correctAnswers),
                order: idx,
                imageUrl: q.imageUrl || null,
                timeLimit: parseInt(q.timeLimit) || 15
              };
            })
          }
        },
        include: { questions: true }
      });
      
      console.log('✅ Квиз создан. Время вопросов:', quiz.questions.map(q => q.timeLimit));
      res.json(quiz);
    } catch (error) {
      console.error('❌ Ошибка создания квиза:', error);
      res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
  });

  app.get('/api/quiz/:code', async (req, res) => {
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { code: req.params.code },
        include: { questions: true, participants: true, host: true }
      });
      if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  app.delete('/api/quiz/:code', authenticateToken, async (req, res) => {
    console.log('️ Запрос на удаление квиза:', req.params.code);
    
    try {
      const quiz = await prisma.quiz.findUnique({
        where: { code: req.params.code }
      });
      
      if (!quiz) {
        return res.status(404).json({ error: 'Квиз не найден' });
      }
      
      // Проверяем, что пользователь является организатором
      if (quiz.hostId !== req.user.id) {
        return res.status(403).json({ error: 'Только организатор может удалить квиз' });
      }
      
      // Удаляем участников
      await prisma.participant.deleteMany({
        where: { quizId: quiz.id }
      });
      
      // Удаляем вопросы
      await prisma.question.deleteMany({
        where: { quizId: quiz.id }
      });
      
      // Удаляем квиз
      await prisma.quiz.delete({
        where: { code: req.params.code }
      });
      
      console.log('✅ Квиз удален:', req.params.code);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Ошибка удаления квиза:', error);
      res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
  });

  app.get('/api/my-quizzes', authenticateToken, async (req, res) => {
    console.log('📋 Запрос на получение квизов пользователя:', req.user.id);
    
    try {
      const quizzes = await prisma.quiz.findMany({
        where: { hostId: req.user.id },
        include: { 
          questions: true,
          participants: true,
          _count: { select: { participants: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`✅ Найдено ${quizzes.length} квизов`);
      if (quizzes.length > 0) {
        console.log('Первый квиз:', {
          id: quizzes[0].id,
          title: quizzes[0].title,
          code: quizzes[0].code,
          questionsCount: quizzes[0].questions.length,
          participantsCount: quizzes[0]._count.participants
        });
      }
      
      res.json(quizzes);
    } catch (error) {
      console.error('❌ Ошибка получения квизов:', error);
      res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
    }
  });

  app.get('/api/my-participations', authenticateToken, async (req, res) => {
    try {
      const participations = await prisma.participant.findMany({
        where: { userId: req.user.id },
        include: { quiz: { include: { host: true } } },
        orderBy: { quiz: { createdAt: 'desc' } }
      });
      res.json(participations);
    } catch (error) {
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });
}

module.exports = { setupRoutes };