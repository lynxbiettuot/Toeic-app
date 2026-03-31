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
  importFlashcardSet
} from '../controllers/flashcard/index.js';
import { requireUserAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public & Discovery endpoints
router.get('/public', getPublicFlashcardSets);
router.get('/public/:setId', getPublicFlashcardSetDetail);

router.use(requireUserAuth);

router.get('/sets', getUserFlashcardSets);
router.post('/sets', createFlashcardSet);
router.put('/sets/:setId', updateFlashcardSet);
router.delete('/sets/:setId', deleteFlashcardSet);

router.get('/sets/:setId/cards', getFlashcardsBySet);
router.post('/sets/:setId/cards', createFlashcard);
router.put('/cards/:cardId', updateFlashcard);
router.delete('/cards/:cardId', deleteFlashcard);
router.get('/review/due', getDueReviewCards);
router.get('/review/stats/today', getTodayReviewStats);
router.post('/review/:cardId/rate', rateReviewCard);
router.post('/public/:setId/import', importFlashcardSet);

export default router;
