// Minimal mock of face recognition for prototype
async function matchFaces(selfiePath, idPath) {
  // In a real scenario, integrate DeepFace/PyTorch model here
  // For prototype, return a random score
  const score = (Math.random() * 0.2 + 0.8).toFixed(2); // 0.8–1.0
  return score;
}

module.exports = { matchFaces };
