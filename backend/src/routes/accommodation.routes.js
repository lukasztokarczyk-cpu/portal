const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/accommodation.controller');

// Pokoje — admin
router.get('/rooms', authenticate, ctrl.getRooms);
router.post('/rooms', authenticate, authorize('admin'), ctrl.createRoom);
router.patch('/rooms/:id', authenticate, authorize('admin'), ctrl.updateRoom);
router.delete('/rooms/:id', authenticate, authorize('admin'), ctrl.deleteRoom);

// Konfiguracja wesela
router.get('/wedding/:weddingId/config', authenticate, ctrl.getConfig);
router.patch('/wedding/:weddingId/config', authenticate, ctrl.setWantsStay);

// Dostępne pokoje i rezerwacje
router.get('/wedding/:weddingId/rooms', authenticate, ctrl.getAvailableRooms);
router.post('/wedding/:weddingId/book', authenticate, ctrl.bookRoom);
router.delete('/bookings/:id', authenticate, ctrl.cancelBooking);

// Admin: wszystkie rezerwacje
router.get('/bookings', authenticate, authorize('admin', 'coordinator'), ctrl.getAllBookings);

module.exports = router;
