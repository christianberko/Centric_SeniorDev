// DOM Elements
const preferredAirport = document.getElementById("preferredAirport"); // Select the preferred airport input field
const form = document.getElementById("sign-up-form");                        // Select the form element 
const emailInput = document.getElementById("email");                  // Select the email input field  

const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const middleName = document.getElementById("middleName");
const email = document.getElementById("email");
const birthdate = document.getElementById("birthdate");
const phoneNumber = document.getElementById("phoneNumber");
const gender = document.getElementById("gender");
const password = document.getElementById("password");
const confirmPass = document.getElementById("confirmPass");
const preferredName = document.getElementById("preferredName");
const ktn = document.getElementById("KTN");
const title = document.getElementById("title");

// Function to check if the user is a temporary user  
function isTemporaryUser() {
    var cookieArr = document.cookie.split("; ");    // Split the cookies into an array
    var cookieNameArr = [];                   // Array to store cookie names
    var cookieValueArr = [];                 // Array to store cookie values
    
    // Loop through the cookies and separate names and values
    cookieArr.forEach(cookie => {
        var cookieName = cookie.substring(0, cookie.indexOf("="));
        cookieNameArr.push(cookieName);
        var cookieValue = cookie.substring(cookie.indexOf("=") + 1);
        cookieValueArr.push(cookieValue);
    });

    // Check if the user is a temporary user through the cookie name
    if (cookieNameArr.includes("temp")) {
        emailInput.value = "";
        emailInput.value = cookieValueArr[cookieNameArr.indexOf("temp")].replace("%40", "@");
        emailInput.disabled = true;
    }
}

async function signUp()
{
    fetch("/register", {
      method: 'POST',
      body: JSON.stringify({
          email: email.value,
          firstName: firstName.value,
          middleName: middleName.value,
          lastName: lastName.value,
          phoneNumber: phoneNumber.value,
          preferredName: preferredName.value,
          gender: gender.value,
          birthdate: birthdate.value,
          KTN: ktn.value,
          preferredAirport: preferredAirport.value,
          title: title.value,
          password: password.value,
          confirmPass: confirmPass.value
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data.msg)
      {
          window.location.href = "/mfaConfig";
      }
      else if (data.err)
      {
          console.log(data.err);
          // showError(form.querySelector('button[type="submit"]'), data.err);
      }
    });
}

// This function is used to format the phone number
function formatPhoneNumber(phone) {
    phone = phone.replace(/\D/g, "");
    if (phone.length === 10) {
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }
    return phone;
}

// This function is used to validate the form
function validateForm(event) {
    event.preventDefault(); // Prevent default form submission
    let valid = true;

    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.classList.remove('active');
    });

    // Regular expressions for validation
    const nameRegex = /^[A-Za-z]{2,}$/;
    const middleNameRegex = /^[A-Za-z.]*$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const ktnRegex = /^\d{8,9}$/;
    const airportRegex = /^[A-Z]{3}$/;

    // Reset error classes
    [firstName, lastName, middleName, email, birthdate, phoneNumber, gender, 
     password, confirmPass, preferredName, ktn, preferredAirport].forEach(input => {
        input.classList.remove('error');
    });

    // showError function to display error messages
    function showError(input, message) {
        const fieldContainer = input.closest('.form-field') || input.parentElement;
        let errorElement = fieldContainer.querySelector('.error-message');
            
        if (!errorElement) {  
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            fieldContainer.appendChild(errorElement);
        }
            
        errorElement.textContent = message;
        errorElement.classList.add('active');
        input.classList.add('error');
        input.focus();
        valid = false;
    }

    // Validate input fields
    if (!nameRegex.test(firstName.value)) showError(firstName, "Must contain only letters");
    if (!nameRegex.test(lastName.value)) showError(lastName, "Must contain only letters");
    if (!emailRegex.test(email.value)) showError(email, "Please enter a valid email address");
    
    const birthDateObj = new Date(birthdate.value);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    if (age < 18) showError(birthdate, "You must be at least 18 years old");
    if (birthdate.value == '') showError(birthdate, "You must enter a birthdate");

    phoneNumber.value = formatPhoneNumber(phoneNumber.value);
    if (!phoneRegex.test(phoneNumber.value)) showError(phoneNumber, "Please enter a valid phone number (xxx-xxx-xxxx)");
    // if (!["M", "F"].includes(gender.value)) showError(gender, "Please select a valid gender");

    if (!passwordRegex.test(password.value)) showError(password, "Must be at least 8 characters with uppercase, lowercase, numbers, and special characters");
    if (password.value !== confirmPass.value) showError(confirmPass, "Passwords do not match");

    if (middleName.value && !middleNameRegex.test(middleName.value)) showError(middleName, "Must contain only 1 or more letters");
    if (preferredName.value && !nameRegex.test(preferredName.value)) showError(preferredName, "Must contain only letters");
    if (ktn.value && !ktnRegex.test(ktn.value)) showError(ktn, "KTN must be 8 or 9 digits");
    if (preferredAirport.value && !airportRegex.test(preferredAirport.value)) showError(preferredAirport, "Please enter a valid 3-letter airport code");

    if (valid)
    {
        signUp();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (form)
    {
        form.addEventListener("submit", validateForm); // Attach the validateForm function to the form submission event
    }

    if (preferredAirport) {
        $(function () {
            $('#preferredAirport').autocomplete({
                source: function (req, res) {
                    $.ajax({
                        url: "airport-search/",
                        dataType: "json",
                        type: "GET",
                        data: req,
                        success: function (data) {
                            res($.map(data, function (val) {
                                var addressLabel = val.address.countryCode == "US"
                                    ? `${capitalizeWords(val.address.cityName)}, ${val.address.stateCode}, ${val.address.countryCode} (${val.iataCode})`
                                    : `${capitalizeWords(val.address.cityName)}, ${val.address.countryCode} (${val.iataCode})`;
                                return { label: addressLabel, value: val.iataCode };
                            }));
                        },
                        error: function (err) {
                            console.log(err);
                        }
                    });
                }
            });
        });
    }
});