const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/menu.controller');

// Zarządzanie daniami (admin)
router.get('/dishes', authenticate, authorize('admin', 'coordinator'), ctrl.getDishes);
router.post('/dishes', authenticate, authorize('admin'), ctrl.addDish);
router.delete('/dishes/:id', authenticate, authorize('admin'), ctrl.deleteDish);

// Menu wesela
router.get('/wedding/:weddingId', authenticate, ctrl.getWeddingMenu);
router.patch('/wedding/:weddingId/config', authenticate, ctrl.updateConfig);
router.post('/wedding/:weddingId/select', authenticate, ctrl.selectDish);

module.exports = router;
