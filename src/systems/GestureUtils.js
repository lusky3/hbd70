// src/systems/GestureUtils.js
// Touch and pointer gesture detection algorithms for secret cheats and discovery

/**
 * Checks if a sequence of tap timestamps contains a valid triple-tap
 * within the specified maximum interval between consecutive taps.
 */
export function checkTripleTapGesture(tapTimestamps, maxInterval = 700) {
  if (!tapTimestamps || tapTimestamps.length < 3) return false;
  const n = tapTimestamps.length;
  const t3 = tapTimestamps[n - 1];
  const t2 = tapTimestamps[n - 2];
  const t1 = tapTimestamps[n - 3];
  return (t3 - t2 <= maxInterval) && (t2 - t1 <= maxInterval);
}

/**
 * Checks if a pointer drag starts in the top third of the viewport
 * and ends in the bottom third of the viewport with limited horizontal drift.
 */
export function checkSwipeDownGesture(startX, startY, endX, endY, screenHeight = 854, maxDriftX = 160) {
  const topThird = screenHeight / 3;
  const bottomThird = (screenHeight * 2) / 3;
  const startsInTopThird = startY < topThird;
  const endsInBottomThird = endY > bottomThird;
  const isPrimarilyVertical = Math.abs(endX - startX) <= maxDriftX;
  return startsInTopThird && endsInBottomThird && isPrimarilyVertical;
}
