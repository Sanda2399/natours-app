const Tour = require('../Models/tourModel');
const handlerFactory = require('../Controllers/handlerFactory');
const Booking = require('../Models/bookingModel');

const catchAsync = require('../Controllers/MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(
    async (req, res, next) => {
        // 1. Get the currently booked tour.
        const tour = await Tour.findById(req.params.tourId);

        // 2. Create checkout session.
        const checkoutSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`,
            cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
            customer_email: req.user.email,
            client_reference_id: req.params.tourId,
            mode: "payment",
            line_items: [
                {
                  quantity: 1,
                  price_data: {
                    currency: 'usd',
                    unit_amount: tour.price * 100,
                    product_data: {
                      name: `${tour.name} Tour`,
                      description: tour.summary,
                      images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
                    },
                  },
                },
              ],
            });

        // 3) Create Session as response
        res.status(200).json({
            status: 'success',
            checkoutSession,
        });
    }
);

exports.createBookingCheckout = catchAsync(
  async (req, res, next) => {
    // Grab the booking info. This info in the url only lasts until booking doc is created.
    const { tour, user, price } = req.query;

    // In case one field is missing, move to the middleware in stack.
    if (!tour && !user && !price) { return next(); }

    await Booking.create({ tour, user, price });

    // Redirects the page to the same url as the success url string above,
    // but without the query string.
    res.redirect(req.originalUrl.split('?')[0]);
  }
)

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);