const hideAlert = () => {
    const element = document.querySelector('.alert');
    if (element) { element.parentElement.removeChild(element) }
}

// Type will be either 'success' or 'error'.
const showAlert = (type, msg, time = 7) => {
    hideAlert();
    const markup = `<div class="alert alert--${type}">${msg}</div>`;
    document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
    window.setTimeout(hideAlert, time * 1000);
}


////////// LOGGING IN AND OUT FUNCTIONATLITY //////////
// * LOGIN *
const login = async (email, password) => {
    try 
    {
        const res = await axios({
            method: 'POST',
            url: '/api/v1/users/login',
            data: {
                email,
                password
            }
        });

        if (res.data.status === 'success')
        {
            showAlert('success', 'Logged in successfully!')
            window.setTimeout(() => {
                location.assign('/');
            }, 1000);
        }
    }
    catch (err)
    {
        showAlert('error', err.response.data.message);
    }
};

// Tells the page what to do when the login form is submitted.
const loginForm = document.querySelector('.form--login');
if (loginForm)
{
    loginForm.addEventListener('submit', event => {
        event.preventDefault();
    
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        login(email, password);
    });
}


// * LOGOUT *
const logout = async () => {
    try
    {
        const res = await axios({
            method: 'GET',
            url: '/api/v1/users/logout'
        });

        // Reloads the page after sending a 'invalid' cookie to the server, telling it to log us out.
        if (res.data.status === 'success') { location.reload(true) }
    }
    catch (err)
    {
        console.log(err)
        showAlert('error', 'Error logging out. Please try again.');
    }
}

// Tells the page what to do when the logout button is clicked.
const logoutBtn = document.querySelector('.nav__el--logout');
if (logoutBtn)
{
    logoutBtn.addEventListener('click', logout);
}


////////// SUBMITTING AND UPDATING USER DATA //////////
// * UPDATES USER DATA OR PASSWORD DATA DEPENDING ON KEYWORD PASSED IN *
const updateSettings = async (data, type) => {
    try
    {
        const url = 
            type === 'password' 
            ? '/api/v1/users/updateMyPassword' 
            : '/api/v1/users/updateMyAccount';

        const res = await axios({
            method: 'PATCH',
            url,
            data
        })

        if (res.data.status === 'success')
        {
            showAlert('success', `${type.toUpperCase()} updated Successfully!`);
            window.setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }
    catch (err)
    {
        showAlert('error', err.response.data.message);
    }
}

// For updating all of the current user info except password.
const userDataForm = document.querySelector('.form-user-data');
if (userDataForm)
{
    userDataForm.addEventListener('submit', event => {
        event.preventDefault();

        const form = new FormData();
        form.append('name', document.getElementById('name').value);
        form.append('email', document.getElementById('email').value);
        form.append('photo', document.getElementById('photo').files[0]);

        updateSettings(form, 'data');
    });
}

// For updating the password of the current user.
const userPasswordForm = document.querySelector('.form-user-settings');
if (userPasswordForm)
{
    userPasswordForm.addEventListener('submit', async event => {
        event.preventDefault();

        // * Changes the button text for the duration of the awaited promise below. *
        document.querySelector('.btn--save-password').textContent = 'Updating...';

        const passwordCurrent = document.getElementById('password-current').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        await updateSettings({ passwordCurrent, password, passwordConfirm }, 'password');

        // * Changes the button text back to normal after promise is fulfilled. *
        document.querySelector('.btn--save-password').textContent = 'Save Password';

        // Clears password fields after updating.
        document.getElementById('password-current').value = '';
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
    });
}


////////// STRIPE PAYMENT PROCESSING //////////
const stripe = Stripe('pk_test_51K7kW3Kirr7UqHmiH5HIybFuS1zg0ZQ3Tazb8zzYcAzqzxjSZLzhsfUxIFEna2KhY832m3fkTKukCRFNfjQTaIJv00A45GrVEg');

// * Gets the stripe checkout session that's created on the server 
// and then uses it to charge the customer's credit card. *
const bookTour = async tourId => {
    try
    {
        // 1. Get checkout session from API.
        const checkoutSession = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

        // 2. Create checkout form + charge the credit card.
        await stripe.redirectToCheckout({
            sessionId: checkoutSession.data.checkoutSession.id
        });
    }
    catch(err)
    {
        showAlert('error', err);
    }
}

// Get the book button element from the document.
const bookBtn = document.getElementById('book-tour');
if (bookBtn)
{
   bookBtn.addEventListener('click', event => {
       // Changes button text while promise is being fulfiled.
       event.target.textContent = 'Processing...';

       // Grabs the tour id from the dataset created on the button.
       const { tourId } = event.target.dataset;
       bookTour(tourId);
   });
}

const alertMessage = document.querySelector('body').dataset.alert;
if (alert)
{
    showAlert('success', alertMessage, 20);
}