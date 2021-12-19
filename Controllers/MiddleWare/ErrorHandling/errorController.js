const AppError = require('../../../Utilities/appError');

///// ERROR HANDLER FUNCTIONS /////
const handleCastErrorDB = err => {
    const message = `Invaild ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
    const value = err.keyValue.name || err.keyValue.email;
    const message = `${value} is already in use. Please try another value.`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map( val => val.message )
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const handleJWTError = err => new AppError('Invalid token. Please login again.', 401);
const handleJWTExpiredError = err => new AppError('Expired token. Please login again.', 401);


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
    const msg = err.isOperational ? err.message : 'this is unexpected -- please contact support';
    
    if(req.originalUrl.match(/^[/]api[/]v/)) 
    // * Response to send if doing a api request *
    {
        return res.status(err.statusCode).json({
            status: err.status,
            message: msg
        });        
    } 
    else 
    // * Response to send if using the rendered website *
    {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: msg
        });        
    }    
}


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