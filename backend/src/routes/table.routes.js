const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/table.controller');

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post(
  '/wedding/:weddingId',
  authenticate,
  [body('name').notEmpty().trim(), body('capacity').optional().isInt({ min: 1 })],
  validate,
  ctrl.create
);
router.patch('/:id', authenticate, ctrl.update);
router.patch('/:id/position', authenticate, ctrl.updatePosition);
router.delete('/:id', authenticate, authorize('admin', 'coordinator'), ctrl.remove);
router.post('/wedding/:weddingId/save-layout', authenticate, ctrl.saveLayout);

module.exports = router;
