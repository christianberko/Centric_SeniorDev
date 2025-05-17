    // === DOM Elememts ===
    const hotelSearchForm = document.querySelector('#searchInputs');
    const cityInput = document.getElementById('staying-city');
    const checkInInput = document.getElementById('departureDate');
    const checkOutInput = document.getElementById('returnDate');
    const eventListSelect = document.getElementById('eventList');
    const searchButton = document.getElementById('go-hotel-search');
    const warningMessage = document.getElementById('general-warning-message');
    // === Error Container ===
    const errorContainer = warningMessage.querySelector("span");

// === Validation functions ===
    function validateHotelSearch() {
        clearErrors();

        const eventValid = validateEventSelection();
        const cityValid = validateCityCode(cityInput);
        const datesValid = validateDates();

        return eventValid && cityValid && datesValid;
    }

    function validateEventSelection() {
        if (eventListSelect && eventListSelect.value && isNaN(eventListSelect.value)) {
            showError("Event value must be a positive number", eventListSelect);
            return false;
        }
        clearErrorFor('eventList');
        return true;
    }

    function validateCityCode(input) {
        const value = input.value.trim();
        if (!value) {
            showError("Staying city is required", input);
            return false;
        }
        if (!/^[A-Z\s]{2,}$/.test(value)) {
            showError("City name must contain only letters", input);
            return false;
        }
        clearErrorFor(input.id);
        return true;
    }

    function validateDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkInDate = checkInInput.value ? new Date(checkInInput.value) : null;
        const checkOutDate = checkOutInput.value ? new Date(checkOutInput.value) : null;

        let isValid = true;

        clearErrorFor('departureDate');
        clearErrorFor('returnDate');

        if (!checkInInput.value) {
            showError("Check-in date is required", checkInInput);
            isValid = false;
        } else if (!checkOutInput.value) {
            showError("Check-out date is required", checkOutInput);
            isValid = false;
        } else if (checkInDate < today) {
            showError("Check-in date must be today or later", checkInInput);
            isValid = false;
        }
        console.log(checkOutInput.value);
        if (checkOutInput.value && checkInDate) {
            const checkInOnly = new Date(checkInDate);
            checkInOnly.setHours(0, 0, 0, 0);
            const checkOutOnly = new Date(checkOutDate);
            checkOutOnly.setHours(0, 0, 0, 0);

            if (checkOutOnly < checkInOnly) {
                showError("Check-out must be after check-in", checkOutInput);
                isValid = false;
            }
        }
        console.log(isValid);
        return isValid;
    }

    // === Error Helpers ===
    function showError(message, inputElement = null) {
        const exists = [...errorContainer.children].some(e => e.textContent === message);
        if (exists) return;

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        // errorElement.style.textAlign = 'center';

        if (inputElement) {
            errorElement.dataset.for = inputElement.id;
            inputElement.classList.add('input-error');
        }

        warningMessage.style.visibility = "visible";
        errorContainer.appendChild(errorElement);
    }

    function clearErrorFor(id) {
        const errors = errorContainer.querySelectorAll('.error-message');
        errors.forEach(err => {
            if (err.dataset.for === id) err.remove();
        });

        const input = document.getElementById(id);
        if (input) input.classList.remove('input-error');

        const errorsNow = errorContainer.querySelectorAll('.error-message');
        if (errorsNow.length === 0)
        {
            warningMessage.style.visibility = "hidden";
        }
    }

    function clearErrors() {
        warningMessage.style.visibility = "hidden";
        errorContainer.textContent = '';
        // [cityInput, checkInInput, checkOutInput].forEach(input => input.classList.remove('input-error'));
    }

document.addEventListener('DOMContentLoaded', function () {
    // const errorContainer = document.createElement('div');
    // errorContainer.className = 'error-container';
    // errorContainer.style.width = '100%';
    // errorContainer.style.textAlign = 'center';
    // errorContainer.style.marginTop = '5px';
    // searchButton.parentNode.insertBefore(errorContainer, cityInput.previousSibling.previousSibling);

    // === Events ===
    cityInput.addEventListener('change', () => {
        validateCityCode(cityInput);
    });

    [checkInInput, checkOutInput].forEach(input => {
        input.addEventListener('change', validateDates);
    });

    if (eventListSelect) {
        eventListSelect.addEventListener('change', validateEventSelection);
    }

    // Main Search Button
    searchButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (validateHotelSearch()) {
            if (typeof hotelSearch === 'function') {
                hotelSearch().catch(err => {
                    console.error("Hotel search failed:", err);
                    showError("An error occurred during hotel search.");
                });
            } else {
                console.error("hotelSearch() function not defined.");
                showError("Hotel search functionality unavailable.");
            }
        }
    });

    hotelSearchForm.addEventListener('submit', function (event) {
        event.preventDefault();
    });
});
