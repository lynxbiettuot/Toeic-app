/**
 * Flashcard Set Controller
 * Route handlers for flashcard set operations
 */

import type { Request, Response } from 'express';
import {
  parseUserId,
  parseSetId,
  validateTitle,
  validateDescription,
  normalizeVisibility
} from '../../utils/flashcard/index.js';
import * as FlashcardSetService from '../../services/flashcard/flashcard-set.service.js';

export const getUserFlashcardSets = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized', statusCode: 401 });
    }

    const sets = await FlashcardSetService.getUserFlashcardSets(userId);
    return res.json({ statusCode: 200, data: sets });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const createFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const title = validateTitle(req.body.title);
    const description = validateDescription(req.body.description);
    const visibility = normalizeVisibility(req.body.visibility);

    if (!userId || !title) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const createdSet = await FlashcardSetService.createFlashcardSet(userId, title, description, visibility);

    return res.status(201).json({
      statusCode: 201,
      message: 'Flashcard set created successfully',
      data: createdSet
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const updateFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const setId = parseSetId(req.params.setId);
    const title = validateTitle(req.body.title);
    const description = validateDescription(req.body.description);
    const visibility = normalizeVisibility(req.body.visibility);

    if (!userId || !setId || !title) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const updatedSet = await FlashcardSetService.updateFlashcardSet(setId, userId, title, description, visibility);

    return res.json({
      statusCode: 200,
      message: 'Flashcard set updated successfully',
      data: updatedSet
    });
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

export const deleteFlashcardSet = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId ?? null;
    const setId = parseSetId(req.params.setId);

    if (!userId || !setId) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    await FlashcardSetService.deleteFlashcardSet(setId, userId);

    return res.json({ statusCode: 200, message: 'Flashcard set deleted successfully' });
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
