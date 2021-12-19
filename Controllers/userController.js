const User = require('../Models/userModel');
const handlerFactory = require('./handlerFactory');

const catchAsync = require('../Controllers/MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');
const multer = require('multer');
const sharp = require('sharp');

// * Returns an object that contains the fields we want to keep 
// when providing a object to use for updating the current user. *
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(element => {
        if (allowedFields.includes(element))
        {
            newObj[element] = obj[element];
        }
    })

    return newObj;
}


////////////// FILE UPLOADING MIDDLEWARE //////////////
// * A definition for how to store the incoming files from the client. 
//   Stored as buffer in memory instead of to disk. *
const multerStorage = multer.memoryStorage();

// Ensures that the uploaded file(s) match the file type we want/have set.
const multerFilter = (req, file, callback) => {
    if (file.mimetype.startsWith('image'))
    {
        callback(null, true)
    }
    else 
    {
        callback(new AppError('Not an Image. Please upload only images.', 400), false)
    }
}

// * Specifies the location of where the uploaded images from the client-side should be uploaded and
//   ensures with a filter, what files can be uploaded. *
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

// Middleware that ensures the upload only accepts one file from the given field.
exports.uploadUserPhoto = upload.single('photo');


//////////// IMAGE RESIZE SETTINGS ////////////
exports.resizeUserPhoto = catchAsync( async (req, res, next) => {
    // If no image on request
    if (!req.file) { return next(); }

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    // * Reads the image from memory 
    // and changes it's settings to match our inputs(resize, file-format, quality). *
    await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`); // Writes the image to the given directory

    next();
});

//////////// USER ROUTES w/ADMIN RIGHTS ////////////
exports.getAllUsers = handlerFactory.getAll(User);

exports.getUser = handlerFactory.getOne(User);

// * Do NOT update passwords with this update handler! *
exports.updateUser = handlerFactory.updateOne(User);

exports.deleteUser = handlerFactory.deleteOne(User);


//////////// USER ROUTES w/USER RIGHTS ////////////
exports.getMyInfomation = (req, res, next) => {
    req.params.id = req.user.id;
    next();
}

exports.updateMyAccount = catchAsync(
    async(req, res, next) => {
        // 1. Create error if user posts password data.  
        if (req.body.password || req.body.passwordConfirm)
        {
            return next(
                new AppError('This route does not accept password updates. Please use /updateMyPassword.', 400)
            );
        }

        // 2. Filter out unwanted field from incoming request data.
        const filteredBody = filterObj(req.body, 'name', 'email');

        // If the user is also updating their user photo/or some files.
        if (req.file) { filteredBody.photo = req.file.filename }

        // 3. Update user document using the info recieved in the request body.
        const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

        res.status(200)
        .json({
            status: 'success',
            data: updatedUser
        });
    }
)

exports.deleteMyAccount = catchAsync(
    async (req, res, next) => {
        // Flags current user account as inactive(ready for deletion).
        await User.findByIdAndUpdate(req.user.id, { active: false });

        res.status(204)
        .json({
            status: 'success',
            data: null
        })
    }
)