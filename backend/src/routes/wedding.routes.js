const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/wedding.controller');

router.get('/', authenticate, authorize('admin', 'coordinator'), ctrl.getAll);
router.get('/my', authenticate, ctrl.getMy);
router.get('/:id', authenticate, ctrl.getOne);
router.patch(
  '/:id',
  authenticate,
  authorize('admin', 'coordinator'),
  [body('guestCount').optional().isInt({ min: 0 }), body('weddingDate').optional().isISO8601()],
  validate,
  ctrl.update
);

module.exports = router;
