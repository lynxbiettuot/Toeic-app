import express, { type NextFunction, type Request, type Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userExamRoutes from './routes/user/exam.js';
import flashcardRoutes from './routes/flashcard.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
//xác thực
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/exams', userExamRoutes);
app.use('/flashcards', flashcardRoutes);

//route của admin

//route của user

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Connected to MySQL Database successfully via Prisma!');

    app.listen(PORT, () => {
      console.log(`TOEIC App is listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  }
}

startServer();
