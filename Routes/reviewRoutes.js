const express = require('express');

///////// CONTROLLERS /////////
const reviewController = require('../Controllers/reviewController');
const authController = require('../Controllers/authController');

// Creation of the main router
const router = express.Router({ mergeParams: true });

////////// REVIEW ROUTES //////////
// * All routes below this middleware are protected. *
router.use(authController.routeProtection);

router
.route('/')
.get(reviewController.getAllReviews)
.post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIDs, 
    reviewController.createReview
);

router
.route('/:id')
.get(reviewController.getReview)
.patch(
    authController.restrictTo('user', 'admin'), 
    reviewController.updateReview
)
.delete(
    authController.restrictTo('user', 'admin'), 
    reviewController.deleteReview
)


module.exports = router;