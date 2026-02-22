const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/stage.controller');

const stageValidation = [
  body('title').notEmpty().trim(),
  body('status').optional().isIn(['open', 'in_progress', 'completed']),
  body('dueDate').optional().isISO8601(),
];

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post('/wedding/:weddingId', authenticate, authorize('admin', 'coordinator'), stageValidation, validate, ctrl.create);
router.patch('/:id', authenticate, authorize('admin', 'coordinator'), stageValidation, validate, ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);
router.patch('/:id/reorder', authenticate, authorize('admin', 'coordinator'), ctrl.reorder);

module.exports = router;
