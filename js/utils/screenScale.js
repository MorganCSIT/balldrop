// Utility to get scaling factors for screen normalization
// Reference dimensions (tune as needed for your game feel)
const REFERENCE_HEIGHT = 800;
const REFERENCE_WIDTH = 400;

let cachedScale = null;

export function getScreenScale() {
  if (cachedScale) return cachedScale;
  const height = window.innerHeight;
  const width = window.innerWidth;
  return {
    verticalScale: height / REFERENCE_HEIGHT,
    horizontalScale: width / REFERENCE_WIDTH,
  };
}

// Optional: Listen for resize/orientation change to clear cache
window.addEventListener('resize', () => { cachedScale = null; });
window.addEventListener('orientationchange', () => { cachedScale = null; });
