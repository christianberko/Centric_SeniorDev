// This script handles validation for the user management page

// DOM Elements for validation
const userEmailInput = document.getElementById("userEmailPopup");
const groupNameInput = document.getElementById("groupNamePopup");
const firstThresholdInput = document.getElementById("firstThresholdPopup");
const secondThresholdInput = document.getElementById("secondThresholdPopup");
const checkedBagsInput = document.getElementById("checkedBagsPopup");
const dateTimeBufferInput = document.getElementById("dateTimeBufferPopup");
const maxLayoversInput = document.getElementById("maxLayoversPopup");
const flightTierInput = document.getElementById("flightTierPopup");

// Error message containers
const userPopupError = document.createElement("p");
userPopupError.className = "error-message";
document.querySelector("#userPopupInside").appendChild(userPopupError);

const groupPopupError = document.createElement("p");
groupPopupError.className = "error-message";
document.querySelector("#groupPopupInside").appendChild(groupPopupError);

// Override the original save functions
const originalSaveUser = window.saveUser;
const originalSaveGroup = window.saveGroup;

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate percentage (0-100 with decimals allowed)
function isValidPercentage(value) {
    if (value === "") return false;
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
}

// Validate positive integer
function isPositiveInteger(value) {
    if (value === "") return false;
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 && Number.isInteger(num);
}

// Validate layovers (must be 1 or 2)
function isValidLayovers(value) {
    if (value === "") return false;
    const num = parseInt(value);
    return !isNaN(num) && (num === 1 || num === 2);
}

// Validate user has at least one group selected
function hasSelectedGroups() {
    const attendeeBoxesChecked = attendeeFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const adminBoxesChecked = adminFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    return attendeeBoxesChecked.length > 0 || adminBoxesChecked.length > 0;
}

// Check if any group has been modified
function hasModifiedGroups() {
    const attendeeBoxes = attendeeFieldsetBoxes.querySelectorAll('input[type="checkbox"]');
    const adminBoxes = adminFieldsetBoxes.querySelectorAll('input[type="checkbox"]');
    let modified = false;
    
    attendeeBoxes.forEach(box => {
        if ((box.checked && box.dataset.prevChecked === "false") || 
            (!box.checked && box.dataset.prevChecked === "true")) {
            modified = true;
        }
    });
    
    if (!modified) {
        adminBoxes.forEach(box => {
            if ((box.checked && box.dataset.prevChecked === "false") || 
                (!box.checked && box.dataset.prevChecked === "true")) {
                modified = true;
            }
        });
    }
    
    return modified;
}

// Apply shake animation to element
function applyShakeAnimation(element) {
    element.classList.add("shake-animation");
    setTimeout(() => {
        element.classList.remove("shake-animation");
    }, 820); // Animation duration + small buffer
}

// Apply shake animation to a collection of checkboxes' parent fieldset
function applyShakeToCheckboxes(fieldset) {
    applyShakeAnimation(fieldset);
}

// Validate user form
function validateUserForm() {
    userPopupError.textContent = "";
    let isValid = true;
    
    // Check email (required for new users)
    if (isNewUser) {
        if (!userEmailInput.value.trim()) {
            userPopupError.textContent = "Email is required";
            applyShakeAnimation(userEmailInput);
            isValid = false;
        } else if (!isValidEmail(userEmailInput.value.trim())) {
            userPopupError.textContent = "Please enter a valid email address";
            applyShakeAnimation(userEmailInput);
            isValid = false;
        }
    }
    
    // For existing users, check that at least one group has been modified
    if (!isNewUser && !hasModifiedGroups()) {
        userPopupError.textContent = "You must modify at least one group";
        applyShakeToCheckboxes(attendeeFieldset);
        applyShakeToCheckboxes(adminFieldset);
        isValid = false;
    }
    
    // For new users, check that at least one group is selected
    if (isNewUser && !hasSelectedGroups()) {
        userPopupError.textContent = "Please select at least one group";
        applyShakeToCheckboxes(attendeeFieldset);
        applyShakeToCheckboxes(adminFieldset);
        isValid = false;
    }
    
    return isValid;
}

// Validate group form
function validateGroupForm() {
    groupPopupError.textContent = "";
    let isValid = true;
    let invalidFields = [];
    
    // Group name is required
    if (!groupNameInput.value.trim()) {
        invalidFields.push("Group name");
        applyShakeAnimation(groupNameInput);
        isValid = false;
    }
    
    // First threshold is required
    if (!firstThresholdInput.value.trim()) {
        invalidFields.push("First threshold");
        applyShakeAnimation(firstThresholdInput);
        isValid = false;
    } else if (!isValidPercentage(firstThresholdInput.value)) {
        groupPopupError.textContent = "First threshold must be a percentage between 0 and 100";
        applyShakeAnimation(firstThresholdInput);
        return false;
    }
    
    // Second threshold is required
    if (!secondThresholdInput.value.trim()) {
        invalidFields.push("Second threshold");
        applyShakeAnimation(secondThresholdInput);
        isValid = false;
    } else if (!isValidPercentage(secondThresholdInput.value)) {
        groupPopupError.textContent = "Second threshold must be a percentage between 0 and 100";
        applyShakeAnimation(secondThresholdInput);
        return false;
    }
    
    // Check thresholds relationship if both are present
    if (firstThresholdInput.value.trim() && secondThresholdInput.value.trim()) {
        const first = parseFloat(firstThresholdInput.value);
        const second = parseFloat(secondThresholdInput.value);
        if (second < first) {
            groupPopupError.textContent = "Second threshold must be equal to or greater than first threshold";
            applyShakeAnimation(secondThresholdInput);
            return false;
        }
    }
    
    // Checked bags is required
    if (!checkedBagsInput.value.trim()) {
        invalidFields.push("Checked bags");
        applyShakeAnimation(checkedBagsInput);
        isValid = false;
    } else if (!isPositiveInteger(checkedBagsInput.value)) {
        groupPopupError.textContent = "Checked bags must be a positive whole number";
        applyShakeAnimation(checkedBagsInput);
        return false;
    }
    
    // Day buffer is required
    if (!dateTimeBufferInput.value.trim()) {
        invalidFields.push("Day buffer");
        applyShakeAnimation(dateTimeBufferInput);
        isValid = false;
    } else if (!isPositiveInteger(dateTimeBufferInput.value)) {
        groupPopupError.textContent = "Day buffer must be a positive whole number";
        applyShakeAnimation(dateTimeBufferInput);
        return false;
    }
    
    // Max layovers is required
    if (!maxLayoversInput.value.trim()) {
        invalidFields.push("Max layovers");
        applyShakeAnimation(maxLayoversInput);
        isValid = false;
    } else if (!isValidLayovers(maxLayoversInput.value)) {
        groupPopupError.textContent = "Maximum layovers must be either 1 or 2";
        applyShakeAnimation(maxLayoversInput);
        return false;
    }
    
    // Flight tier is required (it's a select, so checking if it has a value)
    if (!flightTierInput.value) {
        invalidFields.push("Flight tier");
        applyShakeAnimation(flightTierInput);
        isValid = false;
    }
    
    // If any fields are missing, show a consolidated error message
    if (invalidFields.length > 0) {
        groupPopupError.textContent = invalidFields[0] +" cannot be empty";
    }
    
    return isValid;
}

// Override the saveUser function with validation
window.saveUser = function() {
    if (validateUserForm()) {
        originalSaveUser();
    }
};

// Override the saveGroup function with validation
window.saveGroup = function() {
    if (validateGroupForm()) {
        originalSaveGroup();
    }
};

// Add input event listeners for real-time validation feedback
userEmailInput.addEventListener("input", function() {
    if (isNewUser) {
        if (!this.value.trim()) {
            this.classList.add("invalid-input");
        } else if (!isValidEmail(this.value)) {
            this.classList.add("invalid-input");
        } else {
            this.classList.remove("invalid-input");
        }
    }
});

groupNameInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else {
        this.classList.remove("invalid-input");
    }
});

firstThresholdInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else if (!isValidPercentage(this.value)) {
        this.classList.add("invalid-input");
    } else {
        this.classList.remove("invalid-input");
        
        // Check relationship with second threshold
        if (secondThresholdInput.value.trim()) {
            const first = parseFloat(this.value) || 0;
            const second = parseFloat(secondThresholdInput.value);
            if (second < first) {
                secondThresholdInput.classList.add("invalid-input");
            } else {
                secondThresholdInput.classList.remove("invalid-input");
            }
        }
    }
});

secondThresholdInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else if (!isValidPercentage(this.value)) {
        this.classList.add("invalid-input");
    } else {
        // Check relationship with first threshold
        if (firstThresholdInput.value.trim()) {
            const first = parseFloat(firstThresholdInput.value);
            const second = parseFloat(this.value) || 0;
            if (second < first) {
                this.classList.add("invalid-input");
            } else {
                this.classList.remove("invalid-input");
            }
        } else {
            this.classList.remove("invalid-input");
        }
    }
});

checkedBagsInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else if (!isPositiveInteger(this.value)) {
        this.classList.add("invalid-input");
    } else {
        this.classList.remove("invalid-input");
    }
});

dateTimeBufferInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else if (!isPositiveInteger(this.value)) {
        this.classList.add("invalid-input");
    } else {
        this.classList.remove("invalid-input");
    }
});

maxLayoversInput.addEventListener("input", function() {
    if (!this.value.trim()) {
        this.classList.add("invalid-input");
    } else if (!isValidLayovers(this.value)) {
        this.classList.add("invalid-input");
    } else {
        this.classList.remove("invalid-input");
    }
});

// Mark all required fields on form open
// function markRequiredFields() {
//     // Add required styling to labels
//     const labels = document.querySelectorAll("#groupPopupInside label");
//     labels.forEach(label => {
//         if (!label.textContent.includes('*')) {
//             label.textContent = label.textContent + '*';
//         }
//     });
    
//     // Also make sure the email field has an asterisk
//     const emailLabel = document.querySelector("label[for='userEmailPopup']");
//     if (emailLabel && !emailLabel.textContent.includes('*')) {
//         emailLabel.textContent = emailLabel.textContent + '*';
//     }
// }

// Initialize validation when popups are opened
document.getElementById("inviteUser").addEventListener("click", function() {
    // Reset error messages
    userPopupError.textContent = "";
    // Mark required fields
    // markRequiredFields();
});

document.getElementById("createGroup").addEventListener("click", function() {
    // Reset error messages
    groupPopupError.textContent = "";
    // Mark required fields
    // markRequiredFields();
});

document.head.appendChild(style);

// Initialize validation on page load
document.addEventListener("DOMContentLoaded", function() {
    console.log("Complete validation script loaded");
    // markRequiredFields();
});