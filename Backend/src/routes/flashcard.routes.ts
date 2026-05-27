import express from 'express';
import {
  getUserFlashcardSets,
  createFlashcardSet,
  updateFlashcardSet,
  deleteFlashcardSet,
  getFlashcardsBySet,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  getDueReviewCards,
  getTodayReviewStats,
  rateReviewCard,
  getPublicFlashcardSets,
  getPublicFlashcardSetDetail,
  importFlashcardSet,
  getPracticeCards
} from '../controllers/flashcard/index.js';
import { requireUserAuth } from '../middlewares/auth.js';

const router = express.Router();

// Các endpoint public để FrontendWeb có thể xem thư viện flashcard công khai.
router.get('/public', getPublicFlashcardSets);
router.get('/public/:setId', getPublicFlashcardSetDetail);

// Từ đây trở xuống cần người dùng đăng nhập.
router.use(requireUserAuth);

// CRUD bộ flashcard cá nhân.
router.get('/sets', getUserFlashcardSets);
router.post('/sets', createFlashcardSet);
router.put('/sets/:setId', updateFlashcardSet);
router.delete('/sets/:setId', deleteFlashcardSet);

// CRUD flashcard trong từng bộ.
router.get('/sets/:setId/cards', getFlashcardsBySet);
router.post('/sets/:setId/cards', createFlashcard);
router.put('/cards/:cardId', updateFlashcard);
router.delete('/cards/:cardId', deleteFlashcard);

// Ôn tập lặp lại ngắt quãng và luyện tập thêm.
router.get('/review/due', getDueReviewCards);
router.get('/review/stats/today', getTodayReviewStats);
router.post('/review/:cardId/rate', rateReviewCard);
router.post('/public/:setId/import', importFlashcardSet);
router.get('/practice', getPracticeCards);

export default router;