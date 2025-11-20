const Tesseract = require("tesseract.js");

async function extractText(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    return text;
  } catch (err) {
    throw err;
  }
}

module.exports = { extractText };
