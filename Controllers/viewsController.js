const Tour = require('../Models/tourModel');
const Booking = require('../Models/bookingModel');

const catchAsync = require('../Controllers/MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert = 
        "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediatly, please come back later.";
  next();
};

exports.getOverview = catchAsync(
    async (req, res, next) => {
        const tours = await Tour.find();

        res.status(200)
        .render('overview', {
            title: 'All Tours',
            tours
        });
    }
);


exports.getTour = catchAsync(
    async (req, res, next) => {
        const tour = await Tour.findOne({ slug: req.params.slug }).populate({
            path: 'reviews',
            fields: 'review rating user'
        });

        if (!tour)
        {
            next(new AppError('There is no tour with that name.', 404));
        }

        res.status(200)
        .render('tour', {
            title: `${tour.name} Tour`,
            tour
        });
    }
)

exports.getLoginForm = catchAsync(
    async (req, res, next) => {
        res.status(200)
        .render('login', {
            title: 'Log into your account'
        })
    }
)

exports.getAccount = (req, res) => {
    res.status(200)
    .render('userAccount', {
        title: 'Your account'
    });
}

exports.getMyTours = catchAsync(
    async (req, res, next) => {
        // 1. Find all bookings that have the current user's id.
        const bookings = await Booking.find({ user: req.user.id });

        // 2. Find tours with the returned id's.
        const tourIDs = bookings.map(el => el.tour);

        // * Selects all the tours who have an id that's in the tourIDs array. *
        const tours = await Tour.find({ _id: { $in: tourIDs } });

        res.status(200)
        .render('overview', {
            title: 'My Tours',
            tours
        });
    }
);