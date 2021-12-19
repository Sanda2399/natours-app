const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'This booking must belong to a tour.']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'This booking must belong to a user.']
    },
    price: {
        type: Number,
        required: [true, 'A booking must have a price.']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    paid: {
       type: Boolean,
       default: true 
    }
});

////////// QUERY MIDDLEWARE //////////
// * Middleware for automatically populating the user and tour fields with the ids inside. *
bookingSchema.pre(/^find/, function (next) {
    this
    .populate('user')
    .populate({
        path: 'tour',
        select: 'name'
    });

    next();
})


const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;