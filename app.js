const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const csp = require('express-csp');
const compression = require('compression');
const cors = require('cors');
const timeout = require('connect-timeout');

const globalErrorHandler = require('./Controllers/MiddleWare/ErrorHandling/errorController');
const AppError = require('./Utilities/appError');
const viewRouter = require('./Routes/viewRoutes');
const tourRouter = require('./Routes/tourRoutes');
const userRouter = require('./Routes/userRoutes');
const reviewRouter = require('./Routes/reviewRoutes');
const bookingRouter = require('./Routes/bookingRoutes');

const app = express();

app.enable('trust proxy');

// Defining the view engine for our front-end rendering.
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'Views'));

/////////////////////////////// GLOBAL MIDDLEWARE ///////////////////////////////

// Implement CORS
app.use(cors());
app.options('*', cors());

// Serves static files from the public folder in our directory.
app.use(express.static(path.join(__dirname, 'public')));

///////////// Sets security HTTP headers /////////////
app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'", 'https://*.mapbox.com', 'https://*.stripe.com'],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        imgSrc: ["'self'", 'https://www.gstatic.com'],
        scriptSrc: [
          "'self'",
          'https://*.stripe.com',
          'https://cdnjs.cloudflare.com',
          'https://api.mapbox.com',
          'https://js.stripe.com',
          "'blob'",
        ],
        frameSrc: ["'self'", 'https://*.stripe.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
);

csp.extend(app, {
    policy: {
      directives: {
        'default-src': ['self'],
        'style-src': ['self', 'unsafe-inline', 'https:'],
        'font-src': ['self', 'https://fonts.gstatic.com'],
        'script-src': [
          'self',
          'unsafe-inline',
          'data',
          'blob',
          'https://js.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:8828',
          'ws://localhost:56558/',
        ],
        'worker-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'frame-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'img-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
        'connect-src': [
          'self',
          'unsafe-inline',
          'data:',
          'blob:',
          // 'wss://<HEROKU-SUBDOMAIN>.herokuapp.com:<PORT>/',
          'https://*.stripe.com',
          'https://*.mapbox.com',
          'https://*.cloudflare.com/',
          'https://bundle.js:*',
          'ws://localhost:*/',
        ],
      },
    },
});
////////////////////////////////////////////////////// 

// Development Logging
if (process.env.NODE_ENV === 'development')
{
    // Logs incoming request data to the console.
    app.use(morgan('dev'));
}

// Creates a limiter that locks incoming IP requests to under 100 per hour.
const limiter = rateLimit({
    max: 100, // Should be changed to adapt to the usage situation.
    windowMs: 60 * 60 * 1000,
    message: 'Too many request from this IP. Please try again in an hour.'
})
app.use('/api', limiter);

// Modifies incoming request data to allow me to see the data on the body. Body Parser.
// * Prevents req.body size from being larger than 10 kilobytes. * 
app.use(express.json({ limit: '10kb' }));

// Parses incoming requests with urlencoded payloads. Used for when sending form data from client side to server.
// app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Parses any incoming data from cookies.
app.use(cookieParser());

// Data Sanitization against NoSQL query injections
app.use(mongoSanitize());

// Data Sanitization against XSS
app.use(xss());

// Prevents parameter pollution by cleaning up the query string.
app.use(hpp({
    whitelist: [
        'duration', 
        'ratingsQuantity', 
        'ratingsAverage', 
        'maxGroupSize', 
        'difficulty', 
        'price']
}));

// Compresses the text sent to the client side.
app.use(compression());

app.use(timeout(120000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}

/////////////////////////////// ROUTES ///////////////////////////////
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Middleware that covers any routes that don't exist
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on the server.`, 404));
})

// Middleware that takes care of any errors that occur in our express application.
app.use(globalErrorHandler);

module.exports = app;