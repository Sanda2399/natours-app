const mongoose = require("mongoose");
const Tour = require('../Models/tourModel');

///// SCHEMA DEFINITION /////
const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'A tour must have a review.']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    user: {
        type: mongoose.Schema.ObjectId, 
        ref: 'User',
        required: [true, 'Review must belong to a user.']
    },
    tour: {
        type: mongoose.Schema.ObjectId, 
        ref: 'tours', 
        required: [true, 'A tour ID is required for this review.'] 
    }
},
{ // Makes sure that when a virtual prop exists on the document, it is also included when a output occurs.
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

////////// INDEXES //////////
// * Prevents duplicate reviews from the same user on a tour. *
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

////////// STATIC FUNCTIONS //////////
reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                numOfRatings: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    // Updates the tourSchema and sets the below fields to an accurate view of their current reviews.
    await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: stats[0].numOfRatings,
        ratingsAverage: stats[0].avgRating
    });
}


////////// DOCUMENT MIDDLEWARE //////////
// * Runs after a save so that all docs can be in the collection before running function. 
// Gives the correct accurate look at the avg ratings. *
reviewSchema.post('save', function() {
    this.constructor.calcAverageRatings(this.tour);
});


////////// QUERY MIDDLEWARE //////////
reviewSchema.pre(/^find/, function(next) {
    this.populate({ path: 'user', select: 'name photo' });
    next();
});

// * Allows for the ratingsAverage and ratingsQuantity fields to be updated/shown correctly
// when updating and deleting reviews. *
reviewSchema.post(/^findOneAnd/, async function(doc) {
    await doc.constructor.calcAverageRatings(doc.tour);
});


// Creation of a collection/model
const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;