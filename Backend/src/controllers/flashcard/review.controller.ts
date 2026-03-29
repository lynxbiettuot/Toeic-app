/**
 * Spaced Review Controller
 * Route handlers for spaced repetition and review operations
 */

import type { Request, Response } from 'express';
import { parseUserId, parseCardId, normalizeRating } from '../../utils/flashcard/index.js';
import * as SpacedRepetitionService from '../../services/flashcard/spaced-repetition.service.js';

export const getDueReviewCards = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
    }

    const result = await SpacedRepetitionService.getDueReviewCards(userId);

    return res.json({
      statusCode: 200,
      data: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const rateReviewCard = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const cardId = parseCardId(req.params.cardId);
    const rating = normalizeRating(req.body.rating);

    if (!userId || !cardId || !rating) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const result = await SpacedRepetitionService.rateReviewCard(cardId, userId, rating);

    return res.json({
      statusCode: 200,
      message: 'Review saved successfully',
      data: result
    });
  } catch (error: any) {
    console.error(error);

    if (error.message.includes('404')) {
      return res.status(404).json({ message: 'Card not found', statusCode: 404 });
    }

    if (error.message.includes('403')) {
      return res.status(403).json({ message: 'Unauthorized', statusCode: 403 });
    }

    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getTodayReviewStats = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
    }

    const result = await SpacedRepetitionService.getTodayReviewStats(userId);

    return res.json({
      statusCode: 200,
      data: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};
