    // DOM Elements
    const flightSearchForm = document.querySelector('#searchInputs');
    const departureCityInput = document.getElementById('departureCity');
    const arrivalCityInput = document.getElementById('arrivalCity');
    const departureDateInput = document.getElementById('departureDate');
    const returnDateInput = document.getElementById('returnDate');
    const eventListSelect = document.getElementById('eventList');
    const searchButton = document.getElementById('go-flight-search');
    const warningMessage = document.getElementById('general-warning-message');
    // Error Container
    const errorContainer = warningMessage.querySelector("span");

document.addEventListener('DOMContentLoaded', function() {
    
    // Real-time validation for city inputs
    [departureCityInput, arrivalCityInput].forEach(input => {       
        // Also validate on blur (when field loses focus)
        input.addEventListener('blur', function() {
            validateCityCode(this);
        });
    });

    // Real-time validation for dates
    [departureDateInput, returnDateInput].forEach(input => {
        input.addEventListener('blur', validateDates);
    });

    // Event list validation
    if (eventListSelect) {
        eventListSelect.addEventListener('change', validateEventSelection);
    }

    // Handle click on the search button
    searchButton.addEventListener('click', function(event) {
        event.preventDefault();
        if (validateFlightSearch()) {
            // The flightSearch function is defined in flightSearch.js
            // Since it's async, we can handle it properly
            if (typeof flightSearch === 'function') {
                // Call the async function
                flightSearch().catch(error => {
                    console.error("Flight search failed:", error);
                    showError("An error occurred during flight search");
                });
            } else {
                console.error("flightSearch function not found. Make sure flightSearch.js is loaded before flightSearchvalidation.js");
                showError("Flight search functionality unavailable");
            }
        }
    });

    // Remove default form submission since we're handling it with the button click
    flightSearchForm.addEventListener('submit', function(event) {
        event.preventDefault();
    });

    // Validation functions
    function validateFlightSearch() {
        // Clear all previous errors first
        clearErrorFor('departureCity');
        clearErrorFor('arrivalCity');
        clearErrorFor('departureDate');
        clearErrorFor('returnDate');
        
        // Validate all fields at once for form submission
        const eventValid = validateEventSelection();
        const departureCityValid = validateCityCode(departureCityInput);
        const arrivalCityValid = validateCityCode(arrivalCityInput);
        const datesValid = validateDates();
        
        return eventValid && departureCityValid && arrivalCityValid && datesValid;
    }

    function validateEventSelection() {
        if (eventListSelect && eventListSelect.value && isNaN(eventListSelect.value)) {
            showError("Event value must be a positive number");
            return false;
        }
        clearErrorFor('event');
        return true;
    }

    function validateCityCode(input) {
        const value = input.value.trim();
        const fieldName = input.id === 'departureCity' ? 'Departure city' : 'Arrival city';
        
        if (!value) {
            showError(`${fieldName} is required.`, input);
            return false;
        }
        
        if (!/^[A-Z]{3}$/.test(value)) {
            showError(`${fieldName} code must be exactly 3 letters (e.g., JFK, LAX).`, input);
            return false;
        }
        
        clearErrorFor(input.id);
        return true;
    }

    function validateDates() {
        const today = new Date();
        
        const departureDate = departureDateInput.value ? new Date(departureDateInput.value) : null;
        const returnDate = returnDateInput.value ? new Date(returnDateInput.value) : null;
        
        let isValid = true;

        // Clear previous date errors
        clearErrorFor('departureDate');
        clearErrorFor('returnDate');

        // Validate departure date
        if (!departureDateInput.value) {
            showError("Departure date is required.", departureDateInput);
            isValid = false;
        } else if (departureDate < today) {
            // Allow today's date by comparing just the date part
            const departureDateOnly = new Date(departureDate);
            departureDateOnly.setHours(0, 0, 0, 0);
            
            const todayOnly = new Date();
            todayOnly.setHours(0, 0, 0, 0);
            
            if (departureDateOnly < todayOnly) {
                showError("Departure date must be today or a future date.", departureDateInput);
                isValid = false;
            }
        }

        // Validate return date
        if (!returnDateInput.value) {
            showError("Return date is required.", returnDateInput);
            isValid = false;
        } else if (returnDateInput.value) {
            if (!departureDateInput.value) {
                showError("Please select departure date first.", returnDateInput);
                isValid = false;
            } else {
                // Compare dates without time components
                const departureDateOnly = new Date(departureDate);
                departureDateOnly.setHours(0, 0, 0, 0);
                
                const returnDateOnly = new Date(returnDate);
                returnDateOnly.setHours(0, 0, 0, 0);
                
                if (returnDateOnly < departureDateOnly) {
                    showError("Return date must be the same as or after the departure date.", returnDateInput);
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    function showError(message, inputElement = null) {
        // First check if this error is already showing
        const existingErrors = errorContainer.querySelectorAll('.error-message');
        for (let error of existingErrors) {
            if (error.textContent === message) {
                return; // Error already showing
            }
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        // errorElement.style.textAlign = 'center'; // Center align the text
        
        if (inputElement) {
            errorElement.dataset.for = inputElement.id;
            inputElement.classList.add('input-error');
        }
        
        warningMessage.style.visibility = "visible";
        errorContainer.appendChild(errorElement);
    }

    function clearErrorFor(elementId) {
        const errors = errorContainer.querySelectorAll('.error-message');
        errors.forEach(error => {
            if (error.dataset.for === elementId) {
                error.remove();
            }
        });
        
        const inputElement = document.getElementById(elementId);
        if (inputElement) {
            inputElement.classList.remove('input-error');
        }

        const errorsNow = errorContainer.querySelectorAll('.error-message');
        if (errorsNow.length === 0)
        {
            warningMessage.style.visibility = "hidden";
        }
    }

    function clearErrors() {
        errorContainer.innerHTML = '';
        [departureCityInput, arrivalCityInput, departureDateInput, returnDateInput].forEach(input => {
            input.classList.remove('input-error');
        });
    }
});