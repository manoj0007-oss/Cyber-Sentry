// Optional route module if you want to mount additional APIs later
const router = require('express').Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;


