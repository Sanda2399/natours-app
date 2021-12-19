const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/////////////// SCHEMA DEFINTION ///////////////
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name field is required.'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email field is required.'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a vaild email.']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Password field is required.'],
        trim: true,
        minlength: [10, 'Password must be at least 10 characters.'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'You must confirm your password.'],
        validate: {
            validator: function(val) {
                return validator.equals(val, this.password);
            },
            message: 'Passwords do not match. Please re-enter your password.'
        }
    },
    passwordChangedAt : {
        type: Date
    },
    passwordResetToken: {
        type: String
    },
    passwordResetExpirationDate: {
        type: Date
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})


////////////////////////////// DOCUMENT MIDDLEWARE //////////////////////////////
// Middleware for encrypting passwords and setting them as hashes in the DB.
userSchema.pre('save', async function(next) {
    // Runs the code in the block only if the password wasn't modified.
    if (!this.isModified('password')) { return next() }

    // Password Hashing: Sets our current password to the hash created by bcrypt.
    this.password = await bcrypt.hash(this.password, 12);

    // Deletes our passwordConfirm field. 
    // This is only needed during login/signup to add a extra check to ensure user entered the correct password.
    this.passwordConfirm = undefined;
    next();
})

// Middleware for setting the ChangedAt field to now. Usually for after resetting the password for a user.
userSchema.pre('save', function(next) {
    // Runs the code in the block only if the password wasn't modified or if the document is new.
    if (!this.isModified('password') || this.isNew) { return next() }

    // Ensures that the passwordChangedAt field is set AFTER the JWT is issued.
    this.passwordChangedAt = Date.now() - 1000;
    next();
})


////////////////////////////// QUERY MIDDLEWARE //////////////////////////////
// * Only shows user accounts who have 'active:true' flags on them. *
userSchema.pre(/^find/, function(next) {
    this.find({ active: { $ne: false } })
    next();
});


//////////////////////////////// INSTANCE METHODS ////////////////////////////////

// Method for comparing and checking the password in the DB vs the password given by the client.
userSchema.methods.correctPassword = function(candidatePassword, userPassword)
{
    return bcrypt.compare(candidatePassword, userPassword);
}


// Method for checking if the user has changed their password recently. If so deny access to old JWTs previously given to the user.
userSchema.methods.changedPasswordAfter = function(JWTtimeStamp) 
{
    if (this.passwordChangedAt)
    {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTtimeStamp < changedTimestamp;
    }

    // * False = NOT Changed *
    return false;
}

// Method for creating reset tokens for users that forgot their passwords.
// * NOTE * - This will only MODIFY the document fields being referenced. Call User.save after using this function to cement changes.
userSchema.methods.createPasswordResetToken = function()
{
    // Unencrypted Token - Use for sending to user to reset password.
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Encrypted Token - Store this version for safety against potential DB attacks.
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Unencrypted Token Expiration Date
    this.passwordResetExpirationDate = Date.now() + 10 * 60 * 1000;

    return resetToken;
}


// User Model creation
const User = mongoose.model('User', userSchema);

module.exports = User;