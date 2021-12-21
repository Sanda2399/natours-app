const express = require('express');

///////// CONTROLLERS /////////
const viewController = require('../Controllers/viewsController');
const authController = require('../Controllers/authController');
const bookingController = require('../Controllers/bookingController');

// Creation of the main router.
const router = express.Router();

///////// VIEW ROUTES /////////
router
.route('/')
.get( 
    authController.isLoggedIn, 
    viewController.getOverview
);

router
.route('/tours/:slug')
.get(
    authController.isLoggedIn, 
    viewController.getTour
);

router
.route('/login')
.get(
    authController.isLoggedIn, 
    viewController.getLoginForm
);

router
.route('/myAccount')
.get(
    authController.routeProtection, 
    viewController.getAccount
);

router
.route('/myTours')
.get(
    authController.routeProtection,
    viewController.getMyTours
);

module.exports = router;