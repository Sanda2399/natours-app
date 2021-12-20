const AppError = require('../../../Utilities/appError');

///// ERROR HANDLER FUNCTIONS /////
const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    console.log(value);

    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);


///// Development Error Response /////
const sendErrorDev = (err, req, res) => {
    if (req.originalUrl.startsWith('/api'))
    // * Response to send if doing a api request *
    {
        return res.status(err.statusCode)
        .json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    }
    else
    // * Response to send if using the rendered website *
    {
        return res.status(err.statusCode)
        .render('error', {
            title: 'Something went wrong.',
            msg: err.message
        })
    }
}


///// Production Error Response /////
const sendErrorProd = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
        // A) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // B) Programming or other unknown error: don't leak error details
        // 1) Log error
        console.error('ERROR 💥', err);
        // 2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }

    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            msg: err.message
        });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: 'Please try again later.'
    });
};


///// MAIN /////
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development')
    {
        sendErrorDev(err, req, res);
    }
    else if (process.env.NODE_ENV === 'production')
    {
        // Hard Copy of original error object
        let error = Object.assign(err);

        // Error Handler for Casting errors
        if (error.name === 'CastError') { error = handleCastErrorDB(error) };

        // Error Handler for MongoDB duplicate field errors
        if (error.code === 11000) { error = handleDuplicateFieldsDB(error) };

        // Error Handler for Mongoose Validation errors
        if (error.name === 'ValidationError') { error = handleValidationErrorDB(error) };

        // Error Handler for JsonWebTokenError errors
        if (error.name === 'JsonWebTokenError') { error = handleJWTError(error) };

        // Error Handler for Expired JWT errors
        if (error.name === 'TokenExpiredError') { error = handleJWTExpiredError(error) };

        sendErrorProd(error, req, res);
    }
};