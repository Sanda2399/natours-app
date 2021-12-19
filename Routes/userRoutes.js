const express = require('express');

///// CONTROLLER /////
const userController = require('../Controllers/userController');
const authController = require('../Controllers/authController');

// Creation of the main router
const router = express.Router();

/////////////////// USER AUTHETICATION ROUTES ///////////////////
router
.route('/signup')
.post(authController.signup)

router
.route('/login')
.post(authController.login)

router
.route('/logout')
.get(authController.logout)

router
.route('/forgotPassword')
.post(authController.forgotPassword)

router
.route('/resetPassword/:token')
.patch(authController.resetPassword)

/////////////////// USER ACCOUNT ROUTES ///////////////////
// * All routes below this middleware are protected. Must be signed in. *
router.use(authController.routeProtection);

router
.route('/updateMyPassword')
.patch(authController.updateMyPassword)

router
.route('/getMyInformation')
.get(userController.getMyInfomation, userController.getUser);

router
.route('/updateMyAccount')
.patch(
    userController.uploadUserPhoto, 
    userController.resizeUserPhoto,
    userController.updateMyAccount
)

router
.route('/deleteMyAccount')
.delete(userController.deleteMyAccount)


/////////////////// USER ROUTES ///////////////////
// * All routes below this middleware are restricted to  admin-use only. *
router.use(authController.restrictTo('admin'));

router
.route('/')
.get(userController.getAllUsers)

router
.route('/:id')
.get(userController.getUser)
.patch(userController.updateUser)
.delete(userController.deleteUser)

//// EXPORTS ////
module.exports = router;