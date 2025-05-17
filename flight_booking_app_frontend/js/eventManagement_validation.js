function isFutureDate(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    return date >= today;
}

function isValidDate(dateStr) {
    return !isNaN(new Date(dateStr).getTime());
}

function clearErrors() {
    const container = document.getElementById("formErrors");
    if (container) container.remove();
}

function showErrors(errors) {
    clearErrors();
    
    let container = document.createElement("div");
    container.id = "formErrors";
    container.className = "error-container";
    container.innerHTML = `<div class="error-msg">${errors[0]}</div>`;

    const popupBtns = document.querySelector(".popup-btns");
    if (popupBtns) {
        popupBtns.parentNode.insertBefore(container, popupBtns.nextSibling);
    } else {
        document.body.appendChild(container);
    }

    shakeInvalidFields(errors);
}

function shakeInvalidFields(errors) {
    // Clear previous shakes
    document.querySelectorAll('.shake').forEach(el => {
        el.classList.remove('shake');
    });

    // Shake all relevant fields when any error exists
    if (errors.length > 0) {
        // List of all potential form fields
        const formFields = [
            'eventName',
            'eventLocation',
            'airport-search',
            'startDate',
            'endDate',
            'dateTimeBuffer',
            'layoverMax',
            'firstApproval',
            'secondApproval',
            'totalBudget'
        ];

        // Shake all form fields (simpler approach without error mapping)
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.classList.add('shake');
                setTimeout(() => {
                    field.classList.remove('shake');
                }, 500);
            }
        });
    }
}

function clearErrors() {
    const container = document.getElementById("formErrors");
    if (container) container.remove();
    
    // Clear any remaining shake and invalid classes
    document.querySelectorAll('.shake, .invalid').forEach(el => {
        el.classList.remove('shake');
        el.classList.remove('invalid');
    });
}

function attachValidationHandlers() {
    const airportInput = document.getElementById("airport-search");
    if (airportInput) {
        airportInput.addEventListener("input", function() {
            // Only uppercase the IATA code part if it's being entered directly
            if (this.value.length <= 3) {
                this.value = this.value.toUpperCase();
            }
        });
    }

    const saveBtn = document.getElementById("save");
    if (saveBtn) {
        saveBtn.addEventListener("click", validateEventForm);
        // Remove the onclick handler from HTML to prevent duplicate execution
        saveBtn.onclick = null;
    }

    // Add date validation on change
    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");
    if (startDate && endDate) {
        // startDate.addEventListener("change", validateEventForm);
        // endDate.addEventListener("change", validateEventForm);
    }
}

function validateEventForm(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const errors = [];
    const getVal = id => document.getElementById(id)?.value?.trim();
    const getNum = id => {
        const val = getVal(id);
        return val ? parseFloat(val.replace(/[^0-9.-]/g, '')) : NaN;
    };

    // Event Name validation
    const eventName = getVal("eventName");
    if (!eventName) {
        errors.push("Event name is required.");
    } else if (!/^[a-zA-Z0-9\s\-.,'()&]+$/.test(eventName)) {
        errors.push("Event name contains invalid characters.");
    }

    // Event Location validation
    const eventLocation = getVal("eventLocation");
    if (!eventLocation) {
        errors.push("Event location is required.");
    } else if (!/^[a-zA-Z0-9\s\-.,'()&]+$/.test(eventLocation)) {
        errors.push("Event location contains invalid characters.");
    }

    // Airport validation
    const allowedAirports = document.querySelectorAll("#allowed-airport-list li").length;
    if (allowedAirports === 0) {
        errors.push("At least one airport must be added.");
    }

    // Airport search validation (when adding new airports)
    const airportInput = getVal("airport-search");
    if (airportInput && !/^[A-Z]{3}$/.test(airportInput)) {
        errors.push("Airport code must be a 3-letter uppercase IATA code.");
    }

    // Date validation
    const startDate = getVal("startDate");
    const endDate = getVal("endDate");
    
    if (!startDate) {
        errors.push("Start date is required.");
    } else if (!isValidDate(startDate)) {
        errors.push("Invalid start date format.");
    } else if (!isFutureDate(startDate)) {
        errors.push("Start date must be today or in the future.");
    }

    if (!endDate) {
        errors.push("End date is required.");
    } else if (!isValidDate(endDate)) {
        errors.push("Invalid end date format.");
    } else if (startDate && new Date(endDate) < new Date(startDate)) {
        errors.push("End date must be on or after the start date.");
    }

    // Number validations
    const dayBuffer = getVal("dateTimeBuffer");
    if (!dayBuffer || isNaN(parseInt(dayBuffer)) || parseInt(dayBuffer) <= 0) {
        errors.push("Day buffer must be a positive integer.");
    }

    const maxLayovers = getVal("layoverMax");
    if (!maxLayovers || !['1', '2'].includes(maxLayovers)) {
        errors.push("Max layovers must be 1 or 2.");
    }

    // Financial validations
    const firstApproval = getNum("firstApproval");
    const secondApproval = getNum("secondApproval");
    const totalBudget = getNum("totalBudget");

    if (isNaN(firstApproval) || firstApproval <= 0) {
        errors.push("First approval threshold must be a positive number.");
    }

    if (isNaN(secondApproval) || secondApproval <= 0) {
        errors.push("Second approval threshold must be a positive number.");
    } else if (!isNaN(firstApproval) && secondApproval < firstApproval) {
        errors.push("Second approval threshold must be greater than or equal to first approval threshold.");
    }

    if (isNaN(totalBudget) || totalBudget <= 0) {
        errors.push("Total budget must be a positive number.");
    } else if (!isNaN(firstApproval) && totalBudget <= firstApproval) {
        errors.push("Total budget must be greater than first approval threshold.");
    }

    clearErrors();

    if (errors.length > 0) {
        showErrors(errors);
        return false;
    }
    
    // If validation passes, proceed with form submission
    createOrModifyEvent();
    return true;
}

// Detect when the dynamic form is added and then attach validation
document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "createEvent") {
        const observer = new MutationObserver((mutations, obs) => {
            if (document.getElementById("save")) {
                attachValidationHandlers();
                obs.disconnect();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
});

// Also attach validation when popup is shown
document.addEventListener('DOMContentLoaded', function() {
    const eventPopup = document.getElementById("event-popup");
    if (eventPopup) {
        const popupObserver = new MutationObserver(function(mutations) {
            if (eventPopup.style.display === 'flex') {
                attachValidationHandlers();
            }
        });
        
        popupObserver.observe(eventPopup, { 
            attributes: true,
            attributeFilter: ['style']
        });
    }
});