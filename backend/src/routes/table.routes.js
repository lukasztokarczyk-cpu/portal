const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ctrl = require('../controllers/table.controller');

router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post('/wedding/:weddingId', authenticate, [body('name').notEmpty().trim()], validate, ctrl.create);
router.patch('/:id', authenticate, ctrl.update);
router.patch('/:id/position', authenticate, ctrl.updatePosition);
router.delete('/:id', authenticate, authorize('admin', 'coordinator'), ctrl.remove);
router.post('/wedding/:weddingId/save-layout', authenticate, ctrl.saveLayout);

// Goście przy stoliku
router.post('/:id/guests', authenticate, ctrl.addGuestToTable);
router.patch('/wedding/:weddingId/assign-guest', authenticate, ctrl.assignGuest);

// Rzut sali
router.post('/wedding/:weddingId/floor-plan', authenticate, authorize('admin', 'coordinator'), upload.single('floorPlan'), ctrl.uploadFloorPlan);
router.get('/wedding/:weddingId/floor-plan', authenticate, ctrl.getFloorPlan);

module.exports = router;
