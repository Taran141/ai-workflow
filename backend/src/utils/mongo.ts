export const objectIdPattern = /^[a-f\d]{24}$/i;

export const isObjectId = (value: unknown): value is string => typeof value === "string" && objectIdPattern.test(value);

export const isDuplicateKeyError = (error: unknown) =>
  Boolean(error && typeof error === "object" && (error as { code?: unknown }).code === 11000);
