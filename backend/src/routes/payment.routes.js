const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { invoiceUpload } = require('../middleware/upload');
const ctrl = require('../controllers/payment.controller');

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post(
  '/wedding/:weddingId',
  authenticate,
  authorize('admin', 'coordinator'),
  [body('title').notEmpty(), body('amount').isDecimal()],
  validate,
  ctrl.create
);
router.patch('/:id', authenticate, authorize('admin', 'coordinator'), ctrl.update);
router.patch('/:id/mark-paid', authenticate, authorize('admin'), ctrl.markPaid);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);
router.post('/:id/invoice', authenticate, authorize('admin'), invoiceUpload.single('invoice'), ctrl.uploadInvoice);
router.get('/:id/invoice-url', authenticate, ctrl.getInvoiceUrl);

module.exports = router;
