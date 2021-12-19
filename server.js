const mongoose = require('mongoose');

// Linking the config.env file
const dotenv = require('dotenv');
dotenv.config({
    path: './config.env'
})


/////////////////// ERROR HANDLING ///////////////////
// Asynchronous Error Handling
process.on('unhandledRejection', err => {
    let error = Object.create(err);
    console.log(error.name, error.message);
    console.log('Unhandled Rejection, shutting down.');

    // Optional Crash 
    server.close(() => {
        process.exit(1)
    });
})

// Synchronous Error Handling
process.on('uncaughtException', err => {
    let error = Object.create(err);
    console.log('Uncaught Exception, shutting down.');
    console.log(error.name, error.message);

    // Mandatory here to crash entire app, because if there's an uncaught exception,
    // this app will then be in a 'unclean' state. Restart server!
    process.exit(1)
})
///////////////////////////////////////////////////////


// Main Application
const app = require('./app');

//// DATABASE CONNECTION ////
const DB = process.env.DATABASE.replace(
    '<PASSWORD>', process.env.DATABASE_PASSWORD
);
mongoose
.connect(DB)
.then(connection => {
    console.log('DB Connection Sucessful.');
});

///// SERVER /////
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}`);
})