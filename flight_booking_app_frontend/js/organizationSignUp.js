// DOM Elements
const form = document.getElementById("register-organization-form");
const orgNameInput = document.getElementById('organization-name');

// Validate OrganizationSignUp.html
document.addEventListener('DOMContentLoaded', function() {    
    if (form)
    {
        form.addEventListener('submit', function(event) {   // Attach event listener to form submission
            event.preventDefault();  // Prevent default form submission
            validateOrganizationForm(); // Call the validation function
        });
    }
});

async function createOrganization ()
{
    fetch(`/register-organization`, {
        method: 'POST',
        body: JSON.stringify({
            organizationName: orgNameInput.value
        }),
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.errAuth)
        {
            window.location.href = "/signIn?prev=organizationSignUp";
        }
        else if (data.err)
        {
            showError(orgNameInput, data.err);
        }
        else if (data.msg)
        {
            window.location.href = "/userManagement";
        }
    });
}

function validateOrganizationForm() {
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => el.remove());     // Remove all error messages
    
    let isValid = true;

    // Validate Organization Name
    if (!orgNameInput.value.trim()) {   // Check if the organization name is empty
        showError(orgNameInput, 'Organization name is required');
        isValid = false;    
    } else if (orgNameInput.value.trim().length < 3) {  // Check if the organization name is less than 3 characters
        showError(orgNameInput, 'Organization name must be at least 3 characters');
        isValid = false;
    }

    // Submit if valid
    if (isValid) {
        createOrganization();
    }
}

// Function to show error messages
function showError(input, message) {
    const errorElement = document.createElement('div');   // Create a new div for the error message
    errorElement.className = 'error-message';   // Set the class name for styling
    errorElement.textContent = message;  // Set the error message text
    errorElement.style.color = '#BB1835';   // Set the text color to red
    errorElement.style.fontSize = '16px';   // Set the font size
    errorElement.style.marginTop = '4px';   // Set the margin top
    
    input.classList.add('error');   // Add error class to the input field
    input.parentNode.appendChild(errorElement);  // Append the error message to the input field's parent
    
    // Focus on the first invalid field
    if (!document.querySelector('.error-message:first-of-type')) {  // Check if there are any error messages
        input.focus();  // Focus on the input field with the error
    }
}