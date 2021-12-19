const Review = require('../Models/reviewModel');
const handlerFactory = require('./handlerFactory');

const AppError = require('../Utilities/appError');

////////// MIDDLEWARE //////////
exports.setTourAndUserIDs = (req, res, next) => {
    // Allow for nested routes
    if (!req.body.tour) { req.body.tour = req.params.tourId }
    req.body.user = req.user.id; // Must be the user that's already logged in.
    next();
}


////////// REVIEW ROUTES //////////
exports.getAllReviews = handlerFactory.getAll(Review);
exports.getReview = handlerFactory.getOne(Review);
exports.createReview = handlerFactory.createOne(Review);
exports.updateReview = handlerFactory.updateOne(Review);
exports.deleteReview = handlerFactory.deleteOne(Review);
