document.addEventListener('DOMContentLoaded', function() {
    const signInForm = document.querySelector('.login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const signInErr = document.getElementById('sign-in-err');
    const signInBtn = signInForm.querySelector('button');

    // Remove the onclick attribute and use event listener instead
    signInBtn.removeAttribute('onclick');
    signInForm.addEventListener('submit', function(event) {
        event.preventDefault();
        validateAndLogin();
    });

    // Clear error when user starts typing
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('input', function() {
            if (signInErr.style.display === 'block') {
                signInErr.style.display = 'none';
            }
        });
    });

    function showError(message, inputElement = null) {
        signInErr.textContent = message;
        signInErr.style.display = 'block';
        
        // Remove error class from all inputs first
        document.querySelectorAll('.login-form input').forEach(input => {
            input.classList.remove('input-error');
        });
        
        // Add error class to specific input if provided
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.focus();
        }
    }

    function validateAndLogin() {
        // Clear previous errors
        signInErr.style.display = 'none';
        document.querySelectorAll('.login-form input').forEach(input => {
            input.classList.remove('input-error');
        });
        
        const email = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // Email validation
        if (!email) {
            showError('Username (email) is required', usernameInput);
            return false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('Please enter a valid email address', usernameInput);
            return false;
        }
        
        // Password validation
        if (!password) {
            showError('Password is required', passwordInput);
            return false;
        }
        
        // If validation passes, proceed with login
        login(email, password);
        return true;
    }

    function login(email, password) {
        const urlParams = new URLSearchParams(window.location.search);
        let prev = urlParams.get('prev') || 'index';

        fetch('/login', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                password: password,
                prev: prev
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.msg) {
                window.location.href = "/mfa-enter?prev=" + prev;
            } else if (data.err) {
                showError("Invalid username or password");
            } else if (data.errLock) {
                showError("Too many attempts. Please try again in 15 minutes");
            } else if (data.tmp) {
                window.location.href = "/userSignUp";
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError("An error occurred. Please try again.");
        });
    }
});
