console.log("Script loaded");

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent the default form submission

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    console.log(email, password);

    try {
        // Send login request to the backend
        const response = await fetch("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Login successful, redirect to the homepage
            localStorage.setItem("token", data.token); // Store the JWT token (for authentication purposes)
            window.location.href = "../flight_booking_app_frontend/index.html";
             // Redirect to the homepage
        } else {
            // Show error message
            alert(data.message || "Login failed");
        }
    } catch (error) {
        alert("An error occurred while trying to log in.");
    }
});