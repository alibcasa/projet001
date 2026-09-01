export function calculateReadingProgress(pagesViewed: number[], totalPages: number) {
  if (totalPages <= 0) return 0;
  const unique = new Set(pagesViewed.filter((p) => p >= 1 && p <= totalPages));
  return Number(((unique.size / totalPages) * 100).toFixed(2));
}
