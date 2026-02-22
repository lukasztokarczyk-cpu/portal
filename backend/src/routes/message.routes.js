const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { attachmentUpload } = require('../middleware/upload');
const ctrl = require('../controllers/message.controller');

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post(
  '/wedding/:weddingId',
  authenticate,
  attachmentUpload.single('attachment'),
  [body('content').notEmpty().trim()],
  validate,
  ctrl.send
);
router.patch('/wedding/:weddingId/mark-read', authenticate, ctrl.markRead);

router.get('/:id/attachment', authenticate, ctrl.getAttachmentUrl);

module.exports = router;
