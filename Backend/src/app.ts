import express, { type NextFunction, type Request, type Response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { prisma } from './lib/prisma.js';
import authRoutes from './routes/auth.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/', async (_req: Request, res: Response) => {
  try {
    const publicExams = await prisma.exam_sets.findMany({
      where: { status: 'PUBLIC' },
      select: { id: true, title: true, type: true, total_questions: true }
    });

    res.status(200).json({
      message: 'Welcome to TOEIC App API!',
      data: publicExams
    });
  } catch (_error) {
    res.status(500).json({ message: 'Database connection error' });
  }
});

app.use('/auth', authRoutes);

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
