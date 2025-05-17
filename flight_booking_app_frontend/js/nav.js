// DOM Elements
const profileDropdown = document.getElementById("profileDropdownList");
const adminDropdown = document.getElementById("admin-dropdown-list");

// Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Check for Administration too
    // Default is organization sign up which would take you to the sign up page (user login in if not yet)
    // Otherwise, you can view what you should be seeing in the dropdown

    const cookieArr = document.cookie.split("; ");
    const cookieNameArr = [];
    cookieArr.forEach(cookie => {
        var cookieName = cookie.substring(0, cookie.indexOf("="));
        cookieNameArr.push(cookieName);
    }); 

    if (profileDropdown)
    {
        console.log(cookieNameArr);
        if (cookieNameArr.includes("jwt"))
        {
            var userInfo = document.createElement("li");
            var userInfoLink = document.createElement("a");
            userInfoLink.className = "dropdown-item";
            userInfoLink.href = "/userProfileBasic";
            userInfoLink.textContent = "User Information";
            userInfo.appendChild(userInfoLink);
            profileDropdown.appendChild(userInfo);

            const userHistory = document.createElement("li");
            const userHistoryLink = document.createElement("a");
            userHistoryLink.className = "dropdown-item";
            userHistoryLink.href = "/userProfileHistory";
            userHistoryLink.textContent = "Flight History";
            userHistory.appendChild(userHistoryLink);
            profileDropdown.appendChild(userHistory);
    
            var divider = document.createElement("li");
            var dividerHR = document.createElement("hr");
            dividerHR.className = "dropdown-divider";
            divider.appendChild(dividerHR);
            profileDropdown.appendChild(divider);
    
            var logout = document.createElement("li");
            var logoutLink = document.createElement("a");
            logoutLink.classList = "dropdown-item";
            logoutLink.href = "/logout";
            logoutLink.textContent = "Logout";
            logout.appendChild(logoutLink);
            profileDropdown.appendChild(logout);
    
            console.log("User logged in");
        }
        else
        {
            var signIn = document.createElement("li");
            var signInLink = document.createElement("a");
            signInLink.className = "dropdown-item";
            signInLink.href = "/signIn";
            signInLink.textContent = "Sign In";
            signIn.appendChild(signInLink);
            profileDropdown.appendChild(signIn);
        }
    }
});