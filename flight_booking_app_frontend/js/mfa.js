    // DOM Elements
    const mfaConfigForm = document.getElementById("mfa-config-form");
    const mfaCodeForm = document.getElementById("mfaCodeForm");
    const mfaCodeInput = document.getElementById("mfaCode");
    const errMsg = document.getElementById("errorMessage");
    const mfaSubmitBtn = document.getElementById("mfa-submit-btn");
    const sendMFAEmailBtn = document.getElementById("send-mfa-email-btn");
    const mfaTypeDesc = document.getElementById("mfa-type-desc");
    const furtherMFADesc = document.getElementById("further-mfa-desc");
    const mfaEmailRadioBtn = document.getElementById("mfa-email-radio-btn");
    const mfaAuthAppRadioBtn = document.getElementById("mfa-auth-app-radio-btn");
    const qrCode = document.getElementById("qrCode");
    const mfaConfigExplain = document.getElementById("mfa-config-explain");
    const authConfigRadioBtn = document.getElementById("auth-config-radio");
    const emailConfigRadioBtn = document.getElementById("email-config-radio");

document.addEventListener('DOMContentLoaded', function() {
    // Initialize MFA Code Input
    if (mfaCodeInput) {
        setupMFAInputValidation();
    }

    // Form Submission Handling
    if (mfaCodeForm) {
        mfaSubmitBtn.addEventListener("click", function(event) {
            event.preventDefault();
            submitMFACode();
        });
    }

    // MFA Configuration Setup
    if (mfaConfigForm) {
        mfaConfigForm.querySelector("button").addEventListener("click", function(event) {
            event.preventDefault();
            submitMFAType();
        });
        getMFAQRCode();
    }

    // Event Listeners for MFA Type Switching
    setupMFATypeEventListeners();

    // Check cookies for initial MFA type setup
    checkInitialMFAType();

    // Functions
    function setupMFAInputValidation() {
        mfaCodeInput.addEventListener("input", function() {
            // Only allow digits
            this.value = this.value.replace(/\D/g, '');
            // Limit to 6 characters
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
            // Clear error when valid code is entered
            if (this.value.length === 6) {
                clearError();
            }
        });
    }

    function validateMFACode() {
        const code = mfaCodeInput.value.trim();
        clearError();
        
        if (!code) {
            showError("Please enter your 6-digit verification code", mfaCodeInput);
            return false;
        }
        
        if (!/^\d{6}$/.test(code)) {
            showError("Verification code must be exactly 6 digits", mfaCodeInput);
            return false;
        }
        
        return true;
    }

    function showError(message, inputElement = null) {
        errMsg.textContent = message;
        errMsg.classList.remove('hidden');
        errMsg.classList.add('visible');
        
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.focus();
        }
    }

    function clearError() {
        errMsg.classList.add('hidden');
        errMsg.classList.remove('visible');
        if (mfaCodeInput) {
            mfaCodeInput.classList.remove('input-error');
        }
    }

    async function submitMFACode() {
        if (!validateMFACode()) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        let prev = urlParams.get('prev') || 'index';
        const first = urlParams.get('first');

        let mfaChosen = "";
        const mfaTypes = document.getElementsByName("mfaType");
        for (let i = 0; i < mfaTypes.length; i++) {
            if (mfaTypes[i].checked) {
                mfaChosen = mfaTypes[i].value;
                break;
            }
        }

        fetch(`/mfa-auth`, {
            method: 'POST',
            body: JSON.stringify({
                mfaCode: mfaCodeInput.value,
                mfaType: mfaChosen,
                first: first
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.msg) {
                window.location.href = `/${prev}`;
            } 
            else if (data.errAuth) {
                window.location.href = "/signIn";
            }
            else {
                showError("Invalid verification code. Please try again.", mfaCodeInput);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            showError("An error occurred. Please try again.", mfaCodeInput);
        });
    }

    function getMFAQRCode() {
        fetch("/mfa-qr-generate")
        .then(response => response.text())
        .then(data => {
            if (data == "Login expired") {
                window.location.href = "/signIn";
            }
            qrCode.src = data;
        });
    }

    function submitMFAType() {
        let mfaChosen = "";
        const mfaTypes = document.getElementsByName("mfaType");
        for (let i = 0; i < mfaTypes.length; i++) {
            if (mfaTypes[i].checked) {
                mfaChosen = mfaTypes[i].value;
                break;
            }
        }

        fetch(`/mfa-config-chosen`, {
            method: 'POST',
            body: JSON.stringify({
                mfaType: mfaChosen
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.msg) {
                document.cookie = "mfaType=" + data.type;
                window.location.href = `/mfa-first`;
            }
        });
    }

    async function sendMfaEmail() {
        fetch(`mfa-send-email`, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.msg == "Success") {
                // Email sent successfully
            } else if (data.errAuth) {
                window.location.href = "/signIn";
            }
            sendMFAEmailBtn.style.display = "";
            sendMFAEmailBtn.textContent = "Resend Code";
        });
    }

    function setupMFATypeEventListeners() {
        // Email vs Authenticator App radio buttons
        if (mfaEmailRadioBtn) {
            mfaEmailRadioBtn.addEventListener("change", function() {
                if (this.checked) {
                    mfaTypeDesc.textContent = "email";
                    sendMFAEmailBtn.style.display = "";
                    sendMFAEmailBtn.textContent = "Send Code";
                    furtherMFADesc.textContent = " This code will expire in fifteen minutes.";
                }
            });
        }

        if (mfaAuthAppRadioBtn) {
            mfaAuthAppRadioBtn.addEventListener("change", function() {
                if (this.checked) {
                    mfaTypeDesc.textContent = "authenticator app";
                    sendMFAEmailBtn.style.display = "none";
                    furtherMFADesc.textContent = "";
                }
            });
        }

        // Configuration form radio buttons
        if (emailConfigRadioBtn) {
            emailConfigRadioBtn.addEventListener("change", function() {
                if (this.checked) {
                    mfaConfigExplain.textContent = "Six-digit codes will be sent to your email.";
                    qrCode.style.display = "none";
                }
            });
        }

        if (authConfigRadioBtn) {
            authConfigRadioBtn.addEventListener("change", function() {
                if (this.checked) {
                    mfaConfigExplain.textContent = "Scan the QR Code in an authenticator app, where you will receive six-digit codes.";
                    qrCode.style.display = "";
                }
            });
        }

        // Send Email button
        if (sendMFAEmailBtn) {
            sendMFAEmailBtn.addEventListener("click", function(event) {
                event.preventDefault();
                sendMfaEmail();
            });
        }
    }

    function checkInitialMFAType() {
        const cookieArr = document.cookie.split("; ");
        const cookieNameArr = [];
        const cookieValueArr = [];
        
        cookieArr.forEach(cookie => {
            const [name, value] = cookie.split("=");
            cookieNameArr.push(name);
            cookieValueArr.push(value);
        });

        if (cookieNameArr.includes("mfaType")) {
            if (cookieValueArr.includes("emailOnly") && mfaCodeForm) {
                sendMfaEmail();
                if (mfaEmailRadioBtn) {
                    mfaEmailRadioBtn.checked = true;
                    mfaTypeDesc.textContent = "email";
                    furtherMFADesc.textContent = " This code will expire in fifteen minutes.";
                    mfaAuthAppRadioBtn.parentNode.style.display = "none";
                }
            } else if (cookieValueArr.includes("appPref")) {
                if (sendMFAEmailBtn) {
                    sendMFAEmailBtn.style.display = "none";
                }
                if (mfaTypeDesc) {
                    mfaTypeDesc.textContent = "authenticator app";
                }
            }
        }
    }
});