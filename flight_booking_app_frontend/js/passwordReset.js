// DOM Elements
const form = document.getElementById("validateResetForm"); // Select the reset form
const createPassInput = document.getElementById("createPass"); // Select password input
const confirmPassInput = document.getElementById("confirmPass"); // Select confirm password input
const submitButton = form.querySelector('button[type="submit"]');   // Select submit button

async function initiateReset ()
{
    fullPageLoader(true);
    fetch("/initiate-password-reset", {
        method: 'POST',
        body: JSON.stringify({ email: document.getElementById("emailReset").value }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        fullPageLoader(false);
        if (data.err)
        {
            initiateShowError(data.err);
        }
        else if (data.msg)
        {
            form.querySelector('p').textContent = "An email for your password reset has been sent. You may now close this window.";
            form.querySelector("label").style.display = "none";
            document.getElementById("emailReset").style.display = "none";
            form.querySelector("button").style.display = "none";
        }
    });
}

async function confirmReset ()
{
    console.log("Confirming Reset");
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const reset = urlParams.get('reset');

    fetch("/confirm-password-reset", {
        method: 'POST',
        body: JSON.stringify({ email: email, reset: reset, pass: createPassInput.value, confirmPass: confirmPassInput.value }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if (data.err)
        {
            initiateShowError(data.err);
        }
        else if (data.msg)
        {
            window.location.href = "/signIn";
        }
    });
}

// This function is used to validate the password reset request form
function validateInitateForm(event) {
    event.preventDefault(); // Prevent default form submission
    let valid = true;

    const emailInput = document.getElementById("emailReset");
    
    // Clear previous errors
    const errorContainer = document.querySelector('.error-container');
    errorContainer.textContent = '';
    emailInput.classList.remove('error');

    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorContainer.appendChild(errorElement);
        valid = false;
    }

    // Regular expressions for validation (same as signup)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validate email
    if (!emailInput.value.trim())
    {
        showError("Email is required");
        emailInput.classList.add('error');
    }
    else if (!emailRegex.test(emailInput.value))
    {
        showError("Must be a valid email");
        emailInput.classList.add('error');
    }

    if (valid) initiateReset();
}

// This function is used to validate the password reset form
function validateResetForm(event) {
    event.preventDefault(); // Prevent default form submission
    let valid = true;

    // Clear previous errors
    const errorContainer = document.getElementsByClassName('error-container')[0];
    errorContainer.innerHTML = '';
    [createPassInput, confirmPassInput].forEach(input => {
        input.classList.remove('error');
    });

    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorContainer.appendChild(errorElement);
        valid = false;
    }

    // Regular expressions for validation (same as signup)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // Validate password
    if (!createPassInput.value.trim()) {
        showError("Password is required");
        createPassInput.classList.add('error');
    } else if (!passwordRegex.test(createPassInput.value)) {
        showError("Must be at least 8 characters with uppercase, lowercase, number, and special character");
        createPassInput.classList.add('error');
    }

    // Validate password confirmation
    if (!confirmPassInput.value.trim()) {
        showError("Please confirm your password");
        confirmPassInput.classList.add('error');
    } else if (createPassInput.value !== confirmPassInput.value) {
        showError("Passwords do not match");
        confirmPassInput.classList.add('error');
    }

    if (valid) confirmReset();
}

function initiateShowError(message) {
    const errorContainer = document.querySelector('.error-container');
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorContainer.appendChild(errorElement);
    valid = false;
}

// function setupRealTimeValidation() {
//     errorContainer = document.querySelector("error-container");
//     [createPassInput, confirmPassInput].forEach(input => {
//         input.addEventListener('input', function() {
//             this.classList.remove('error');
//             errorContainer.textContent = '';
//         });
//     });
// }

document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const reset = urlParams.get('reset');

    if (!email || !reset)
    {
        form.replaceChildren();

        const header = $ce("h2");
        header.textContent = "Password Reset";
        const message = $ce("p");
        message.textContent = "Please enter your email to request a password reset.";
        const emailLabel = $ce("label");
        emailLabel.setAttribute("for", "emailReset");
        emailLabel.textContent = "Email*";
        const emailInput = $ce("input");
        emailInput.setAttribute("type", "email");
        emailInput.id = "emailReset";
        emailInput.name = "emailReset";
        emailInput.placeholder = "email@address.com";
        const submitBtn = $ce("button");
        submitBtn.textContent = "Submit";

        form.appendChild(header);
        form.appendChild(message);
        form.appendChild(emailLabel);
        form.appendChild(emailInput);
        form.appendChild(submitBtn);
        form.addEventListener("submit", validateInitateForm);
        // Create error message container
        const errorContainer = $ce('div');
        errorContainer.className = 'error-container';
        submitBtn.parentNode.insertBefore(errorContainer, submitBtn);
    } 
    else
    {
        form.addEventListener("submit", validateResetForm);
        form.removeAttribute('onsubmit');
        // Create error message container
        const errorContainer = $ce('div');
        errorContainer.className = 'error-container';
        submitButton.parentNode.insertBefore(errorContainer, submitButton);
    }
});