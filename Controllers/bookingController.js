const Tour = require('../Models/tourModel');
const User = require('../Models/userModel');
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
            success_url: `${req.protocol}://${req.get('host')}/myTours`,
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
                      images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
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

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;
  await Booking.create({ tour, user, price });
}

exports.webhookCheckout = catchAsync(
  async (req, res, next) => {
    const signature = req.headers['stripe-signature'];
    let event;
    try
    {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    }
    catch (err)
    {
      return res.status(400).send(`Webhook error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed')
    {
      createBookingCheckout(event.data.object);
    } 

    res.status(200).json({ received: true });
  }
)

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBookings = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);