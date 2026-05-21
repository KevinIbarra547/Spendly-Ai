const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'expenses', status: 'not implemented yet' });
});

module.exports = router;
