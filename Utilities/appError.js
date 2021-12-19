class AppError extends Error 
{
    constructor(message, statusCode)
    {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        // Used in order to prevent the function call of the constructor
        // from being in the stack trace.
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;