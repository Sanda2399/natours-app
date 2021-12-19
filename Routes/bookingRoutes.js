const express = require('express');

///////// CONTROLLERS /////////
const bookingController = require('../Controllers/bookingController');
const authController = require('../Controllers/authController');

// Creation of the main router
const router = express.Router();

///////// CONTROLLERS /////////
// * All routes below this middleware are protected. Must be signed in. *
router.use(authController.routeProtection)

router.route('/checkout-session/:tourId').get(bookingController.getCheckoutSession);


// * All routes below this middleware are restricted to  admin and lead-guide use only. *
router.use(authController.restrictTo('admin', 'lead-guide'));

router
.route('/')
.get(bookingController.getAllBookings)
.post(bookingController.createBooking);

router
.route('/:id')
.get(bookingController.getBooking)
.patch(bookingController.updateBooking)
.delete(bookingController.deleteBooking);


module.exports = router;