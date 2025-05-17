// DOM Elements
const eventDashboard = document.getElementById("event-dashboard");

// Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Check for Administration too
    // Default is organization sign up which would take you to the sign up page (user login in if not yet)
    // Otherwise, you can view what you should be seeing in the dropdown

    if (eventDashboard)
    {
        fetch(`/get-event-dashboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                const noEvents = document.createElement("h3");
                noEvents.textContent = "Sign in to view your events";
                eventDashboard.appendChild(noEvents);
            }
            else
            {
                if (data.length === 0)
                {
                    const noInfoDisplay = $ce("div");
                    noInfoDisplay.className = "no-info-div";
                    const banSVG = createBanSVG();
                    noInfoDisplay.appendChild(banSVG);
                    const noInfoWords = $ce("span");
                    noInfoWords.textContent = "You have no upcoming events.";
                    noInfoDisplay.appendChild(noInfoWords);
                    eventDashboard.appendChild(noInfoDisplay);
                }

                for (let i = 0; i < data.length; i++)
                {
                    const eventDiv = document.createElement("div");
                    eventDiv.className = "event-dash-listing";

                    // Event Name
                    const eventName = document.createElement("span");
                    eventName.className = "event-dash-name";
                    eventName.textContent = data[i].eventName;
                    eventDiv.appendChild(eventName);

                    // Event Location
                    const eventLocation = document.createElement("span");
                    eventLocation.className = "event-dash-loc";
                    eventLocation.textContent = data[i].eventLocation;
                    eventDiv.appendChild(eventLocation);

                    // Event Date
                    const eventDate = document.createElement("span");
                    eventDate.className = "event-dash-date";
                    var startDate = "";
                    var endDate = "";
                    const baseStartDate = new Date(data[i].startDate);
                    if (data[i].startDate.includes("T"))
                    {
                        startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000 );
                    }
                    else
                    {
                        startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000 );
                        // startDate = new Date( (new Date(data[i].startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );startDate = new Date(data[i].startDate + "T00:00:00.000");
                    }
                    const baseEndDate = new Date (data[i].endDate);
                    if (data[i].endDate.includes("T"))
                    {
                        endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000 );
                        // endDate = new Date(data[i].endDate);
                    }
                    else
                    {
                        endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000 );
                        // endDate = new Date(data[i].endDate + "T00:00:00.000");
                    }
                    eventDate.textContent = (startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString());
                    eventDiv.appendChild(eventDate);

                    // Organization Name
                    const organizationName = document.createElement("span");
                    organizationName.className = "event-dash-org-name";
                    organizationName.textContent = "Organization: " + data[i].organizationName;
                    eventDiv.appendChild(organizationName);

                    // Booking Type
                    const bookingType = document.createElement("span");
                    bookingType.className = "event-dash-booking-type";
                    bookingType.textContent = "Type: " + data[i].type;
                    eventDiv.appendChild(bookingType);

                    // Status
                    const approved = data[i].approved;
                    const approvalStatus = document.createElement("button");
                    if (approved === "approved")
                    {
                        approvalStatus.className = "confirmedBtn";
                        approvalStatus.textContent = "Confirmed";
                        eventDiv.addEventListener("click", function () {
                            window.location.href = "/userProfileHistory";
                        });
                    }
                    else if (approved === "pending" || approved === "escalation")
                    {
                        approvalStatus.className = "pendingBtn";
                        approvalStatus.textContent = "Pending";
                        eventDiv.addEventListener("click", function () {
                            window.location.href = "/userProfileHistory";
                        });
                    }
                    else
                    {
                        approvalStatus.className = "notBookedBtn";
                        approvalStatus.textContent = "Not Booked";
                        if (data[i].type == "Flight")
                        {
                            eventDiv.addEventListener("click", function () {
                                window.location.href = "/flightSearch?eventID=" + data[i].eventID;
                            });
                        }
                        else if (data[i].type == "Hotel")
                        {
                            eventDiv.addEventListener("click", function () {
                                window.location.href = "/hotelSearch?eventID=" + data[i].eventID;
                            });
                        }
                    }
                    eventDiv.appendChild(approvalStatus);


                    eventDashboard.appendChild(eventDiv);
                }
            }
        });
    }
});