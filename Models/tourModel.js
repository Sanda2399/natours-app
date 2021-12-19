const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

//// SCHEMA DEFINITION ////
// * A schema defines and shapes our document's look and structure * //
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A Tour must have a name.'],
        trim: true,
        unique: true,
        maxlength: [40, 'A Tour must have 40 characters or less.'],
        minlength: [10, 'A Tour must have 10 characters or more.'],
        validate: {
            validator: function(val) {
                return validator.isAlpha(val.split(' ').join(''));
            },
            message: 'Tour name must only contain characters.'
        }
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A Tour must have a duration.']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A Tour must have group size.']
    },
    difficulty: {
        type: String,
        trim: true,
        required: [true, 'A Tour must have a difficulty.'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            messsage: 'Difficulty can be either: easy, medium, or difficult.'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0.'],
        max: [5, 'Rating must be below 5.0.'],
        set: val => Math.round(val * 10) / 10

    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A Tour must have a price.']
    },
    priceDiscount: {
        type: Number,
        validate: 
        {
            validator: function(val) 
            {
                return val < this.price;
            },
            messsage: 'Discount price should be below regular price.'
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A Tour must have a summary.']
    },
    description: {
        type: String,
        trim: true,
        required: [true, 'A Tour must have a description.']
    },
    imageCover: {
        type: String,
        required: [true, 'A Tour must have a cover image.']
    },
    images: [String],
    createdOn: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    startLocation: {
        // Geospactial Data JSON format.
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
},
{ // Makes sure that when a virtual prop exists on the document, it is also included when a output occurs.
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


///// INDEXES ///// 
// Purpose is for helping the execution of queries.
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' }); // Supports queries that calculate on an earth-like sphere.


///// VIRTUAL PROPERTIES /////  * (Can't be used in a query) *
tourSchema.virtual('durationWeeks').get(function() {
    return this.duration / 7;
});

// Virtual Populate for getting reviews from the review DB without having to save them into the tour DB.
tourSchema.virtual('reviews', {
    ref: 'Review', // where to reference for the review documents.
    foreignField: 'tour', // the field in the review model to get info from.
    localField: '_id' // creates this field in the current model and populates it with the info recieved from the foreignfield.
});


///// DOCUMEMT MIDDLEWARE /////
tourSchema.pre('save', function(next) {
    this.slug = slugify(this.name, {lower: true});
    next();
});


///// QUERY MIDDLEWARE /////
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: {$ne: true} });
    next();
});

tourSchema.pre(/^find/, function(next) {
    this.populate({ path:'guides', select: '-__v -passwordChangedAt' });
    next();
});

// Creation of a Collection/Model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;