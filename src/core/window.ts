export interface WindowResult {
  readonly start: number;
  readonly end: number;
}

export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (index < 0) return 0;
  if (index >= count) return count - 1;
  return index;
}

/**
 * Computes the visible window (slice start & end) given a selected index and window capacity.
 * Ensures the selected item is always visible and stays in comfortable view.
 */
export function computeWindow(
  selectedIndex: number,
  totalItems: number,
  windowSize: number
): WindowResult {
  if (totalItems <= 0 || windowSize <= 0) {
    return { start: 0, end: 0 };
  }
  if (totalItems <= windowSize) {
    return { start: 0, end: totalItems };
  }

  const clamped = clampIndex(selectedIndex, totalItems);
  const half = Math.floor(windowSize / 2);

  let start = clamped - half;
  if (start < 0) {
    start = 0;
  }
  let end = start + windowSize;
  if (end > totalItems) {
    end = totalItems;
    start = Math.max(0, end - windowSize);
  }

  return { start, end };
}
