/**
 * Flashcard Card Controller
 * Route handlers for flashcard card operations
 */

import type { Request, Response } from 'express';
import {
  parseUserId,
  parseSetId,
  parseCardId,
  validateWord,
  validateDefinition,
  normalizeWordType,
  normalizePronunciation,
  normalizeExample,
  normalizeImageUrl
} from '../../utils/flashcard/index.js';
import * as FlashcardCardService from '../../services/flashcard/flashcard-card.service.js';

export const getFlashcardsBySet = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const setId = parseSetId(req.params.setId);

    if (!userId || !setId) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const { set, cards } = await FlashcardCardService.getFlashcardsBySet(setId, userId);

    return res.json({ statusCode: 200, data: { set, cards } });
  } catch (error: any) {
    console.error(error);

    if (error.message.includes('404')) {
      return res.status(404).json({ message: 'Set not found', statusCode: 404 });
    }

    if (error.message.includes('403')) {
      return res.status(403).json({ message: 'Unauthorized', statusCode: 403 });
    }

    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const createFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const setId = parseSetId(req.params.setId);
    const word = validateWord(req.body.word);
    const definition = validateDefinition(req.body.definition);
    const wordType = normalizeWordType(req.body.wordType);
    const pronunciation = normalizePronunciation(req.body.pronunciation);
    const example = normalizeExample(req.body.example);
    const imageUrl = normalizeImageUrl(req.body.imageUrl);

    if (!userId || !setId || !word || !definition) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const card = await FlashcardCardService.createFlashcard(
      setId,
      userId,
      word,
      definition,
      wordType,
      pronunciation,
      example,
      imageUrl
    );

    return res.status(201).json({
      statusCode: 201,
      message: 'Flashcard created successfully',
      data: card
    });
  } catch (error: any) {
    console.error(error);

    if (error.message.includes('403')) {
      return res.status(403).json({ message: 'Unauthorized', statusCode: 403 });
    }

    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const updateFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const cardId = parseCardId(req.params.cardId);
    const word = validateWord(req.body.word);
    const definition = validateDefinition(req.body.definition);
    const wordType = normalizeWordType(req.body.wordType);
    const pronunciation = normalizePronunciation(req.body.pronunciation);
    const example = normalizeExample(req.body.example);
    const imageUrl = normalizeImageUrl(req.body.imageUrl);

    if (!userId || !cardId || !word || !definition) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const card = await FlashcardCardService.updateFlashcard(
      cardId,
      userId,
      word,
      definition,
      wordType,
      pronunciation,
      example,
      imageUrl
    );

    return res.json({
      statusCode: 200,
      message: 'Flashcard updated successfully',
      data: card
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

export const deleteFlashcard = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const cardId = parseCardId(req.params.cardId);

    if (!userId || !cardId) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    await FlashcardCardService.deleteFlashcard(cardId, userId);

    return res.json({ statusCode: 200, message: 'Flashcard deleted successfully' });
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
