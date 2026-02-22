const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { documentUpload } = require('../middleware/upload');
const ctrl = require('../controllers/document.controller');

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post(
  '/wedding/:weddingId/upload',
  authenticate,
  authorize('admin', 'coordinator'),
  documentUpload.single('file'),
  [body('title').notEmpty(), body('type').isIn(['contract', 'annex', 'regulations', 'other'])],
  validate,
  ctrl.upload
);
router.get('/:id/download', authenticate, ctrl.download);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
