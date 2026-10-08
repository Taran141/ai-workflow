const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => htmlEscapes[character]);

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const unique = (values: Array<string | undefined | null>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];
