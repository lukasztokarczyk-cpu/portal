const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ctrl = require('../controllers/table.controller');

// Trasy z /wedding/ MUSZĄ być przed /:id
router.get('/wedding/:weddingId', authenticate, ctrl.getByWedding);
router.post('/wedding/:weddingId', authenticate, [body('name').notEmpty().trim()], validate, ctrl.create);
router.post('/wedding/:weddingId/save-layout', authenticate, ctrl.saveLayout);
router.patch('/wedding/:weddingId/assign-guest', authenticate, ctrl.assignGuest);
router.post('/wedding/:weddingId/floor-plan', authenticate, authorize('admin', 'coordinator'), upload.single('floorPlan'), ctrl.uploadFloorPlan);
router.get('/wedding/:weddingId/floor-plan', authenticate, ctrl.getFloorPlan);

// Trasy z /:id po wszystkich /wedding/
router.post('/:id/guests', authenticate, ctrl.addGuestToTable);
router.patch('/:id/position', authenticate, ctrl.updatePosition);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/wedding/:weddingId/send-plan', authenticate, authorize('admin', 'coordinator'), ctrl.sendPlanByEmail);

module.exports = router;
