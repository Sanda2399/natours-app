const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Review = require('../../Models/reviewModel');
const Tour = require('../../Models/tourModel');
const User = require('../../Models/userModel.js');

// Linking the config.env file
dotenv.config({
    path: './config.env'
})

//// DATABASE CONNECTION ////
const DB = process.env.DATABASE.replace(
    '<PASSWORD>', process.env.DATABASE_PASSWORD
);
mongoose
.connect(DB)
.then(connection => {
    console.log('DB Connection Sucessful.');
});

// READ JSON FILE
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));

// IMPORT DATA INTO DATABASE
const importData = async () =>
{
    try
    {
        // await Review.create(reviews);
        await User.create(users, { validateBeforeSave: false });
        await Tour.create(tours);

        console.log('Data Successfully loaded.');
        process.exit();
    }
    catch (err)
    {
        console.log(err);
    }
}

// DELETE ALL DATA FROM COLLECTION
const deleteData = async () => 
{
    try
    {
        // await Review.deleteMany();
        await User.deleteMany();
        await Tour.deleteMany();

        console.log('Data Successfully deleted.');
        process.exit();
    }
    catch (err)
    {
        console.log(err);
    }
}

if (process.argv[2] === '--import')
{
   importData(); 
}
else if (process.argv[2] === '--delete')
{
    deleteData();
}

// Will log the arguments passed into the console when this js file is ran
console.log(process.argv);