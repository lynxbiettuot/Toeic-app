/**
 * Public Library Controller
 * Route handlers for public flashcard library operations
 */

import type { Request, Response } from 'express';
import { parseUserId, parseSetId, validateSearchQuery, validatePagination } from '../../utils/flashcard/index.js';
import * as PublicLibraryService from '../../services/flashcard/public-library.service.js';

export const getPublicFlashcardSets = async (req: Request, res: Response) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const search = validateSearchQuery(req.query.search);

    const result = await PublicLibraryService.getPublicFlashcardSets(page, limit, search);

    return res.json({
      statusCode: 200,
      data: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const getPublicFlashcardSetDetail = async (req: Request, res: Response) => {
  try {
    const setId = parseSetId(req.params.setId);

    if (!setId) {
      return res.status(400).json({ message: 'Invalid setId', statusCode: 400 });
    }

    const result = await PublicLibraryService.getPublicFlashcardSetDetail(setId);

    return res.json({
      statusCode: 200,
      data: result
    });
  } catch (error: any) {
    console.error(error);

    if (error.message.includes('404')) {
      return res.status(404).json({ message: 'Set not found', statusCode: 404 });
    }

    if (error.message.includes('403')) {
      return res.status(403).json({ message: 'Set is not public', statusCode: 403 });
    }

    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};

export const importFlashcardSet = async (req: Request, res: Response) => {
  try {
    const sourceSetId = parseSetId(req.params.setId);
    const userId = parseUserId(req.query.userId);

    if (!sourceSetId || !userId) {
      return res.status(400).json({ message: 'Missing required fields', statusCode: 400 });
    }

    const result = await PublicLibraryService.importFlashcardSet(sourceSetId, userId);

    return res.status(201).json({
      statusCode: 201,
      data: result
    });
  } catch (error: any) {
    console.error(error);

    if (error.message.includes('404')) {
      return res.status(404).json({ message: 'Set not found', statusCode: 404 });
    }

    if (error.message.includes('403')) {
      return res.status(403).json({ message: 'Only PUBLIC sets can be imported', statusCode: 403 });
    }

    return res.status(500).json({ message: 'Internal server error', statusCode: 500 });
  }
};
