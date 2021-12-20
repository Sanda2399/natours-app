const User = require('../Models/userModel');
const catchAsync = require('../Controllers/MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const Email = require('../Utilities/emailHandler');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXP_DATE }
    );
}

const createSendToken = (user, statusCode, req, res) => {
    // Json Web Token to send in response to client.
    const token = signToken(user._id)

    // Creates a cookie to send to the client.
    res.cookie('JWT', token, {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXP_DATE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: req.secure || req.headers('x-forwarded-proto') === 'https'
    });

    // Removes password from output on repsonse to client. DOES NOT affect the password in the DB.
    user.password = undefined;

    res.status(statusCode)
    .json({
        status: 'success',
        token,
        data: {
            user: user
        }
    });
}


//////////// AUTHENTICATION MIDDLEWARE ////////////
// * Place this middleware before any route needing JWT verification. *
exports.routeProtection = catchAsync
(
    async (req, res, next) =>
    {
        // 1. Get the JWT token from the client and check to see if it exists.
        let token;

        // Checks request body for the authorization header and makes sure that it begins with Bearer.
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
        {
            // Split the authorization string into a substring and get the second item.
            token = req.headers.authorization.split(' ')[1];
        }
        else if (req.cookies.JWT) // Checks for cookies with the name JWT
        {
            token = req.cookies.JWT;
        }

        // If no token, throw error and decline access.
        if (!token)
        {
            return next(new AppError('You are not logged in. Please login to get access.', 401));
        }

        // 2. Validate the JWT token.
        const decodedData = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        
        // 3. Check if user still exists in DB.
        const currentUser = await User.findById(decodedData.id);

        if (!currentUser)
        {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        // 4. Check if user changed password after the JWT token was issued.
        if (currentUser.changedPasswordAfter(decodedData.iat))
        {
            return next(new AppError('User recently changed password. Please login again.', 401));
        }

        // * Since there's a locals object on every rendered template, we create a user variable
        // and set it's value as the currentUser logged in user. *
        res.locals.user = currentUser;
        
        req.user = currentUser;
        next();
    }
);


// Use only for rendered pages. Is always running to see if a user is logged in or not. Needs no error.
exports.isLoggedIn = async (req, res, next) => {
    // Checks for cookies with the name JWT.
    if (req.cookies.JWT) 
    {
        try
        {
             // Validates the JWT cookie.
            const decodedData = await promisify(jwt.verify)(req.cookies.JWT, process.env.JWT_SECRET);
            
            // Checks if user still exists in DB.
            const currentUser = await User.findById(decodedData.id);

            if (!currentUser)
            {
                return next();
            }

            // Checks if user changed password after the JWT token was issued.
            if (currentUser.changedPasswordAfter(decodedData.iat))
            {
                return next();
            }

            // * Since there's a locals object on every rendered template, we create a user variable
            // and set it's value as the currentUser logged in user. *
            res.locals.user = currentUser;
            return next();
        }
        catch (err)
        {
            return next(); // There is no logged in user.
        }
    }

    // If NO cookie beginning with JWT exists.
    next();
};


// * Place this middleware before any route needing User Role verification. *
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role))
        {
            return next(new AppError('You do not have permission to perform this action.', 403));
        }
        next();
    }
};


//////////// AUTHENTICATION ROUTES ////////////
exports.signup = catchAsync(
    async (req, res, next) => 
    {
        // Creates a normal user. To create admin, edit in DB.
        // * Change Back to original form once done testing! User should NOT be able to set their own role!!! *
        const newUser = await User.create(req.body);

        // Send welcome email to user.
        const url = `${req.protocol}://${req.get('host')}/myAccount`;
        await new Email(newUser, url).sendWelcome();

        // Json Web Token to send in response to client.
        createSendToken(newUser, 201, req, res);
    }
);


exports.login = catchAsync(
    async (req, res, next) => 
    {
        const { email, password } = req.body;

        // 1. Check if email and password exist
        if (!email || !password)
        {
            return next(new AppError('Please enter email and password.', 400));
        }

        // 2. Check if user exists and password is correct
        const user = await User.findOne({ email }).select('+password');
        
        if (!user || !await user.correctPassword(password, user.password))
        {
            return next(new AppError('Incorrect email or password.', 401));
        }

        // 3. If everything okay, send token to client
        createSendToken(user, 200, req, res);
    }
);


exports.logout = (req, res) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    }

    res.cookie('JWT', 'logged-out', cookieOptions);
    res.status(200)
    .json({ status: 'success' });
}


exports.forgotPassword = catchAsync
(
    async (req, res, next) => 
    {
        // 1. Gets the user's DB data based off of email address.
        const user = await User.findOne({ email: req.body.email });

        if (!user)
        {
            return next(new AppError('There is no user with this email address.', 404));
        }
    
        // 2. Generate random token (not JWT).
        const resetToken = await user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });


        // 3. Send back message and token to user's email.
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

        try
        {
            await new Email(user, resetURL).sendPasswordReset();

            res.status(200)
            .json({
                status: 'success',
                message: 'Token sent to email.'
            });
        }
        catch (err) // Resets the password reset token.
        {
            user.passwordResetToken = undefined;
            user.passwordResetExpirationDate = undefined;
            await user.save({ validateBeforeSave: false });

            return next(new AppError('Error sending email. Try again later.', 500));
        }
    }
);


exports.resetPassword = catchAsync(
    async (req, res, next) => {
        // 1. Get user based on the token recieved.
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const curUser = await User.findOne(
            { 
                passwordResetToken: hashedToken, 
                passwordResetExpirationDate: { $gt: Date.now() } // Checks to make sure token hasn't yet expired.
            }
        );

        // 2. Set the new password if token isn't expired and if the user exists in DB.
        if (!curUser)
        {
            return next(new AppError('Token is invalid or has expired.', 400));
        }

        curUser.password = req.body.password;
        curUser.passwordConfirm = req.body.passwordConfirm;
        curUser.passwordResetToken = undefined;
        curUser.passwordResetExpirationDate = undefined;
        await curUser.save();

        // 3. Update PasswordChangedAt field for curUser.
        
        // 4. Log User in/ Send Back JWT.
        createSendToken(curUser, 200, req, res);
    }
);


// Only for already logged in users.
exports.updateMyPassword = catchAsync(
    async (req, res, next) => {
        // 1. Get User from DB
        const curUser = await User.findById(req.user.id).select('+password');

        if (!curUser)
        {
            return next(new AppError('No user found.', 404));
        }

        // 2. Check if the received password value is correct from POST req.
        if (!(await curUser.correctPassword(req.body.passwordCurrent, curUser.password)))
        {
            return next(new AppError('Current Password is incorrect.', 401));
        }

        // 3. If so, update password.
        curUser.password = req.body.password;
        curUser.passwordConfirm = req.body.passwordConfirm;
        await curUser.save();

        // 4. Log user in and send back new JWT.
        createSendToken(curUser, 200, req, res);
    }
);