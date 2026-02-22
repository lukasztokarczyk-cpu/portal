const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/menu.controller');

// Categories
router.get('/categories', authenticate, ctrl.getCategories);
router.post('/categories', authenticate, authorize('admin'), [body('name').notEmpty()], validate, ctrl.createCategory);

// Items
router.get('/items', authenticate, ctrl.getItems);
router.post(
  '/items',
  authenticate,
  authorize('admin'),
  [body('name').notEmpty(), body('categoryId').notEmpty(), body('pricePerPerson').isDecimal()],
  validate,
  ctrl.createItem
);
router.patch('/items/:id', authenticate, authorize('admin'), ctrl.updateItem);
router.delete('/items/:id', authenticate, authorize('admin'), ctrl.removeItem);

// Wedding menu selections
router.get('/wedding/:weddingId/selections', authenticate, ctrl.getSelections);
router.post('/wedding/:weddingId/select', authenticate, [body('menuItemId').notEmpty()], validate, ctrl.toggleSelection);
router.post('/wedding/:weddingId/lock', authenticate, authorize('admin', 'coordinator'), ctrl.lockSelections);

module.exports = router;
