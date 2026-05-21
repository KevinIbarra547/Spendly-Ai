const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'ai', status: 'not implemented yet' });
});

module.exports = router;
