// Recieves a function and then returns a anon function with
// the parameters req, res, next, Tour and features.
module.exports =  catchAsync = fn => 
{
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};