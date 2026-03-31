export const parseUserId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const parseSetId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const parseCardId = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const validateWord = (value: unknown): string | null => {
  const word = typeof value === 'string' ? value.trim() : '';
  return word.length > 0 ? word : null;
};

export const validateDefinition = (value: unknown): string | null => {
  const definition = typeof value === 'string' ? value.trim() : '';
  return definition.length > 0 ? definition : null;
};

export const validateTitle = (value: unknown): string | null => {
  const title = typeof value === 'string' ? value.trim() : '';
  return title.length > 0 ? title : null;
};

export const validateDescription = (value: unknown): string | null => {
  return typeof value === 'string' ? value.trim() || null : null;
};

export const validateSearchQuery = (value: unknown): string => {
  return (typeof value === 'string' ? value.trim().toLowerCase() : '').slice(0, 100);
};

export const validatePagination = (page: unknown, limit: unknown) => {
  const parsedPage = Math.max(1, parseInt(page as string, 10) || 1);
  const parsedLimit = Math.min(20, parseInt(limit as string, 10) || 10);
  return { page: parsedPage, limit: parsedLimit };
};
