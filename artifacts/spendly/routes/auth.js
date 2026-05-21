const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ route: 'auth', status: 'not implemented yet' });
});

module.exports = router;
