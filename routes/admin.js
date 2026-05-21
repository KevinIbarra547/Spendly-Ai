const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'admin', status: 'not implemented yet' });
});

module.exports = router;
