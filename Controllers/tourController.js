const Tour = require('../Models/tourModel');
const handlerFactory = require('../Controllers/handlerFactory');

const catchAsync = require('../Controllers/MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');
const multer = require('multer');
const sharp = require('sharp');


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

exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3}
]);


//////////// IMAGE RESIZE SETTINGS ////////////
exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // If no images on request
    if (!req.files.imageCover && !req.files.images) return next();

    // 1. Processing the Cover image
    // * For use when updating the tour imageCover field. *
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${req.body.imageCover}`);

    //// 2. Processing the Images ////
    // * For use when updating the tour images field. *
    req.body.images = [];

    await Promise.all(
        req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/img/tours/${filename}`);

        req.body.images.push(filename);
        })
    );

    next();
});


//////////////////// ALIASING ////////////////////
exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}


//////////////////// AGGREGATION PIPELINE ////////////////////
exports.TourStats = catchAsync 
(
    async (req, res, next) => 
    {
        const stats = await Tour.aggregate(
            [
                { $match: { ratingsAverage: {$gte: 4.5} } },
                {
                    $group: {
                        _id: '$difficulty',
                        numTours: { $sum: 1 },
                        numRatings: { $sum: '$ratingsQuantity' },
                        avgRating: { $avg: '$ratingsAverage' },
                        avgPrice: { $avg: '$price' },
                        minPrice: { $min: '$price' },
                        maxPrice: { $max: '$price' }
                    }
                }
            ]
        )

        res.status(200) // Success
        .json({
            status: 'success',
            data: {
                stats
            }
        });
    }
);

exports.MonthlyStats = catchAsync 
(
    async (req, res, next) => 
    {
        const year = parseInt(req.params.year);
        const plan = await Tour.aggregate(
            [
                { $unwind: '$startDates' },
                {
                    $match: {
                        startDates: {
                            $gte: new Date(`${year}-01-01`),
                            $lte: new Date(`${year}-12-31`)
                        }
                }
                },
                {
                    $group: {
                        _id: { $month: '$startDates' },
                        numTourStarts: { $sum: 1 },
                        tours: { $push: '$name' }
                    }
                },
                { 
                    $addFields: { month: '$_id' }
                },
                {
                    $project: {
                        _id: 0
                    }
                },
                {
                    $sort: { numTourStarts: -1 }
                },
                {
                    $limit: 12
                }
            ]
        )

        res.status(200) // Success
        .json({
            status: 'success',
            data: {
                plan
            }
        });
    }
);


//////////////////// TOUR ROUTES ////////////////////
exports.getAllTours = handlerFactory.getAll(Tour);
exports.getTour = handlerFactory.getOne(Tour, { path: 'reviews' });
exports.createNewTour = handlerFactory.createOne(Tour);
exports.updateTour = handlerFactory.updateOne(Tour);
exports.deleteTour = handlerFactory.deleteOne(Tour);


/////////////// GEOSPATIAL QUERY ROUTE ///////////////

// * Given a point/location and distance, 
// returns a selection of tours within a certain radius based off the given info. *
exports.getTourWithin = catchAsync( async (req, res, next) => {
    const { distance, latlong, unit } = req.params;

    // Takes the given distance and transforms it into radians. If the unit isn't miles, it's converted into kilometers.
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    // Gather and separate the latitude and longitude individually.
    const [lat, long] = latlong.split(',');

    if (!lat || !long)
    {
        next(new AppError('Please provide both a latitude and longitude.', 400));
    }

    // Query for tours within a specified 'Sphere';
    const tours = await Tour.find({
        startLocation: {
            $geoWithin: {
                $centerSphere: [ [long, lat], radius ]
            }
        }
    })
    
    res.status(200)
    .json({
        status: 'success',
        results: tours.length,
        data: tours
    })
});


/////////////// GEOSPATIAL AGGREGATION ROUTE ///////////////

// * Given a point/location, 
// returns the distance to the tours within a certain radius based off the given info. *
exports.getDistances = catchAsync(
    async (req, res, next) => {
        const { latlong, unit } = req.params;

        // Gather and separate the latitude and longitude individually.
        const [lat, long] = latlong.split(',');

        if (!lat || !long)
        {
            next(new AppError('Please provide both a latitude and longitude.', 400));
        }

        // Determines which unit to use for final calcs of distance. Shows in either miles or meters.
        const multiplier = unit === 'mi' ? 0.000621371 : 0.001

        const distances = await Tour.aggregate(
            [
                {
                    $geoNear: {
                        near: {
                            type: 'Point',
                            coordinates: [long * 1, lat * 1]
                        },
                        distanceField: 'distance',
                        distanceMultiplier: multiplier
                    }
                },
                {
                    $project: {
                        distance: 1,
                        name: 1
                    }
                }
            ]
        );
        
        res.status(200)
        .json({
            status: 'success',
            data: distances
        });
    }
);