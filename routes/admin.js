const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'site_config.json');

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

function writeConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// POST /api/admin/config — admin only. Merge provided fields into site config.
router.post('/config', requireAdmin, (req, res) => {
  try {
    const config = readConfig();

    const { maintenanceMode, aiCoachEnabled, receiptScannerEnabled, tipOfTheDay } = req.body;
    const updates = { maintenanceMode, aiCoachEnabled, receiptScannerEnabled, tipOfTheDay };

    // Only overwrite fields that were actually provided in the request body.
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) config[key] = value;
    });

    writeConfig(config);
    return res.json(config);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not update site config' });
  }
});

module.exports = router;
