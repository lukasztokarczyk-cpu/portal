const router = require('express').Router();
const ctrl = require('../controllers/summary.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/wedding/:weddingId', authenticate, ctrl.getSummary);
router.patch('/wedding/:weddingId/price', authenticate, authorize('admin', 'coordinator'), ctrl.setPrice);
router.post('/wedding/:weddingId/refresh', authenticate, authorize('admin', 'coordinator'), ctrl.refresh);

module.exports = router;
