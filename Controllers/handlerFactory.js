const catchAsync = require('./MiddleWare/ErrorHandling/catchAsync');
const AppError = require('../Utilities/appError');
const features = require('../Utilities/API_Features');

////////// DOCUMENT CREATION ////////// 
exports.createOne = Model => catchAsync(
    async (req, res, next) => {
        const newDocument = await Model.create(req.body);

        res.status(201) // Created
        .json({
            status: 'success',
            data: {
                tour: newDocument
            }
        })

        next();
    }
);


////////// DOCUMENT READING ////////// 
exports.getOne = (Model, populateOptions) => catchAsync(
    async (req, res, next) => {
        let query = Model.findById(req.params.id);
        if (populateOptions) { query = query.populate(populateOptions) }

        const document = await query;

        // Throws error if the id given by client isn't in the db
        if (!document)
        {
            return next(new AppError('No document found with that id.', 404));
        }

        res.status(200) // Success
        .json({
            status: 'success',
            data: {
                document
            }
        });

        next();
    }
);

exports.getAll = Model => catchAsync(
    async (req, res, next) => {

        ////// Allows for nested GET reviews on tour. //////
        let filter = {};
        if (req.params.tourId) { filter = { tour: req.params.tourId } }

        ////////// EXECUTE QUERY //////////
        const ApiFeatures = new features(Model.find(filter), req.query)
        .filter()
        .sort()
        .fieldLimting()
        .pagination();

        const DocumentList = await ApiFeatures.query;

        ////////// SEND RESPONSE //////////
        res.status(200) // Success
        .json({
            status: 'Success',
            results: DocumentList.length,
            data: { DocumentList }
        })

        next();
    }
);


////////// DOCUMENT UPDATES ////////// 
exports.updateOne = Model => catchAsync(
    async (req, res, next) => {
        const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        // Throws error if the id given by client isn't in the db
        if (!document)
        {
            return next(new AppError('No document found with that id.', 404));
        }

        res.status(200) // Success
        .json({
            status: 'success',
            data: {
                document
            }
        });

        next();
    }
);


////////// DOCUMENT DELETION ////////// 
exports.deleteOne = Model => catchAsync (
    async (req, res, next) => {
        const document = await Model.findByIdAndDelete(req.params.id);

        // Throws error if the id given by client isn't in the db
        if (!document)
        {
            return next(new AppError('No document found with that id.', 404));
        }

        res.status(204) // No content
        .json({
            status: 'success',
            data: null
        })

        next();
    }
);