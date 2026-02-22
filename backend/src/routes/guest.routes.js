const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/guest.controller');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const guestValidation = [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('isChild').optional().isBoolean(),
];

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post('/wedding/:weddingId', authenticate, guestValidation, validate, ctrl.create);
router.patch('/:id', authenticate, guestValidation, validate, ctrl.update);
router.delete('/:id', authenticate, authorize('admin', 'coordinator'), ctrl.remove);
router.post('/wedding/:weddingId/import-csv', authenticate, authorize('admin', 'coordinator'), csvUpload.single('file'), ctrl.importCSV);
router.get('/wedding/:weddingId/export-pdf', authenticate, ctrl.exportPDF);

module.exports = router;
