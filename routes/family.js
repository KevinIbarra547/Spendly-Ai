const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const FAMILIES_PATH = path.join(__dirname, '..', 'data', 'families.json');

function readFamilies() {
  try {
    const raw = fs.readFileSync(FAMILIES_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeFamilies(families) {
  fs.writeFileSync(FAMILIES_PATH, JSON.stringify(families, null, 2), 'utf8');
}

// GET /api/family/ping — confirms the router is mounted.
router.get('/ping', (req, res) => {
  res.status(200).json({ ok: true });
});

// CP-F02+ will build the real family endpoints here.

module.exports = router;
module.exports.readFamilies = readFamilies;
module.exports.writeFamilies = writeFamilies;
