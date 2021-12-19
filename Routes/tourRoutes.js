const express = require('express');

///// CONTROLLER /////
const tourController = require('../Controllers/tourController');
const authController = require('../Controllers/authController');


// Creation of the main router
const router = express.Router();

///// EXTERNAL ROUTERS /////
const reviewRouter = require('../Routes/reviewRoutes');

/////////////// ALIASING ///////////////
router
.route('/top-5-cheap')
.get(
    tourController.aliasTopTours, 
    tourController.getAllTours
)


/////////////// AGGREGATION PIPELINE ///////////////
router
.route('/tour-stats')
.get(tourController.TourStats)

router
.route('/monthly-plan-stats/:year')
.get(
    authController.routeProtection, 
    authController.restrictTo('admin', 'lead-guide', 'user'), 
    tourController.MonthlyStats
)

/////////////// GEOSPATIAL QUERY AND AGGREGATION ROUTES ///////////////
router
.route('/tours-within/:distance/center/:latlong/unit/:unit')
.get(tourController.getTourWithin)

router
.route('/distances/:latlong/unit/:unit')
.get(tourController.getDistances)


/////////////// TOUR ROUTES ///////////////
router
.route('/')
.get(tourController.getAllTours)
.post(
    authController.routeProtection, 
    authController.restrictTo('admin', 'lead-guide'), 
    tourController.createNewTour
)

router
.route('/:id')
.get(tourController.getTour)
.patch(
    authController.routeProtection,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages, 
    tourController.updateTour
)
.delete(
    authController.routeProtection,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
)

/////////////////// REVIEW ROUTES ///////////////////

// * Router mounting middleware used for saying that for this specific URL, use this router instead. *
router.use('/:tourId/reviews', reviewRouter);

//// EXPORTS ////
module.exports = router;