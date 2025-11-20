// Mock liveness detection
async function detectLiveness(selfiePath) {
  return "Real"; // Always returns "Real" for prototype
}

module.exports = { detectLiveness };
