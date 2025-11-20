const express = require("express");
const multer = require("multer");
const { extractText } = require("../services/ocr.service");
const { matchFaces } = require("../services/face.service");
const { detectLiveness } = require("../services/liveness.service");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload-document", upload.single("document"), async (req, res) => {
  const text = await extractText(req.file.path);
  res.json({ ocrText: text });
});

router.post("/face-verify", upload.fields([{ name: "selfie" }, { name: "idPhoto" }]), async (req, res) => {
  const selfiePath = req.files["selfie"][0].path;
  const idPath = req.files["idPhoto"][0].path;
  const score = await matchFaces(selfiePath, idPath);
  res.json({ matchScore: score });
});

router.post("/liveness-check", upload.single("selfie"), async (req, res) => {
  const result = await detectLiveness(req.file.path);
  res.json({ liveness: result });
});

module.exports = router;
