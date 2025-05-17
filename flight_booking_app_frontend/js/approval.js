// Disabled console.log messages
// console.log = function () {};

// DOM Elements
const organizationNameHeader = document.getElementById("organizationName");
const organizationList = document.getElementById("organizationList");
const eventList = document.getElementById("event-list");
const timeFrameList = document.getElementById("time-frame-list");
const approvalList = document.getElementById("approvals");
const eventDetails = document.getElementById("event-details");

const userOrgRelationship = {};
var eventInfo = {};

const warnDict = {"lateArrival": "Late Arrival.", 
    "earlyArrival": "Early Arrival.", 
    "lateDeparture": "Late Departure.", 
    "earlyDeparture": "Early Departure.",
    "priceOverFirst": "Price Over Max.",
    "priceOverSecond": "Price Over Max (Needs Escalation).",
    "layoversOver": "Stops Over Max.",
    "checkedBagsOver": "Checked Bags Over Max.",
    "flightTierOver": "Flight Class Over Max.",
    "outsideAirport": "Arrival Airport Not Permitted."
};

const tierTranslation = {
    "economy": "Economy",
    "premium_economy": "Premium Economy",
    "business": "Business",
    "first": "First Class"
};

async function populateOrganizations ()
{
    fetch("/get-approver-organizations-from-user")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                window.location.href = "/signIn?prev=approval";
            }
            if (data.length === 0)
            {
                window.location.href = "/organizationSignUp";
            }
            var organizationList = document.getElementById("organizationList");
            for (let i = 0; i < data.length; i++)
            {
                const userAdminRoles = data[i].adminRoles.split("&&");
                userOrgRelationship[data[i].organizationID] = { organizationName: data[i].organizationName, adminRoles: userAdminRoles };

                var option = document.createElement("option");
                option.value = data[i].organizationID;
                option.textContent = data[i].organizationName;

                organizationList.appendChild(option);
            }
            populateEvents();
        });
}

async function switchOrganization ()
{
    var organizationID = document.getElementById("organizationList").value;

    countOrganizationEvents(organizationID);
    populateEvents(organizationID);
    populateApprovals();
}

async function countOrganizationEvents (organizationID)
{
    fetch("/count-organization-events?organizationID=" + organizationID)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                document.getElementById("orgEventNumber").textContent = data[0].numEvents;
            });
}

async function populateEvents ()
{    
    var organizationID = organizationList.value;
    const selectedOrg = organizationList.options[organizationList.selectedIndex];

    organizationNameHeader.textContent = selectedOrg.textContent;
    countOrganizationEvents(organizationID);

    // Remove events from select
    let child = eventList.lastElementChild;
    while (child)
    {
        eventList.removeChild(child);
        child = eventList.lastElementChild;
    }

    fetch("/get-approver-events-organization-from-user?organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            eventInfo = data;

            // ADD IN LATER
            if (data.length === 0)
            {
                var option = $ce("option");
                option.value = -1;
                option.textContent = "No Events";
                eventList.appendChild(option);
                eventList.disabled = true;
                eventList.classList.add("disabled");
                timeFrameList.disabled = true;
                timeFrameList.classList.add("disabled");

                let child = eventDetails.lastElementChild;
                while (child)
                {
                    eventDetails.removeChild(child);
                    child = eventDetails.lastElementChild;
                }

                child = approvalList.lastElementChild;
                while (child)
                {
                    approvalList.removeChild(child);
                    child = approvalList.lastElementChild;
                }
                const noInfoDisplay = $ce("div");
                noInfoDisplay.className = "no-info-div";
                const banSVG = createBanSVG();
                noInfoDisplay.appendChild(banSVG);
                const noInfoWords = $ce("span");
                noInfoWords.textContent = "No approvals were found.";
                noInfoDisplay.appendChild(noInfoWords);
                approvalList.appendChild(noInfoDisplay);

                console.log("New No Info Built");

                return;
            }
            else
            {
                eventList.disabled = false;
                eventList.classList.remove("disabled");
                timeFrameList.disabled = false;
                timeFrameList.classList.remove("disabled");
            }
            
            // Put in All Events option - ADD LATER
            // var option = document.createElement("option");
            // option.value = 0;
            // option.textContent = "All Events";
            // eventList.appendChild(option);

            for (let i = 0; i < data.length; i++)
            {
                var option = document.createElement("option");
                option.value = data[i].eventID;
                option.textContent = data[i].eventName;

                eventList.appendChild(option);
            }

            changeEventInfo();
            populateApprovals();
        });
}

async function populateApprovals ()
{
    const organizationID = organizationList.value;
    const eventID = eventList.value;

    console.log("Organization ID - " + organizationID);
    console.log("Event ID - " + eventID);

    fetch("/get-event-approvals?organizationID=" + organizationID + "&eventID=" + eventID)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            let child = approvalList.lastElementChild;
            while (child)
            {
                approvalList.removeChild(child);
                child = approvalList.lastElementChild;
            }
    
            if (data.length === 0)
            {
                const noInfoDisplay = $ce("div");
                noInfoDisplay.className = "no-info-div";
                const banSVG = createBanSVG();
                noInfoDisplay.appendChild(banSVG);
                const noInfoWords = $ce("span");
                noInfoWords.textContent = "No approvals were found.";
                noInfoDisplay.appendChild(noInfoWords);
                approvalList.appendChild(noInfoDisplay);

                return;
            }

            for (let i = 0; i < data.length; i++)
            {
                var approvalEntry = "";
                if (data[i].type == "flight")
                {
                    approvalEntry = createApprovalEntry(data[i]);
                }
                else if (data[i].type == "hotel")
                {
                    approvalEntry = createHotelApprovalEntry(data[i]);
                }
                approvalEntry.dataset.status = data[i].approved;
                var approveBtn = approvalEntry.querySelector(".approve");
                var denyBtn = approvalEntry.querySelector(".deny");
                if (data[i].approved == "escalation")
                {
                    console.log("Needs escalation");
                    const organizationID = organizationList.value;
                    const adminRoles = userOrgRelationship[organizationID].adminRoles;
                    console.log(adminRoles);
                    if (!adminRoles.includes("execApprover"))
                    {
                        approveBtn.disabled = true;
                        approveBtn.classList.add("disabled");
                        denyBtn.disabled = true;
                        denyBtn.classList.add("disabled");
                    }
                    else
                    {
                        approveBtn.disabled = false;
                        approveBtn.classList.remove("disabled");
                        denyBtn.disabled = false;
                        denyBtn.classList.remove("disabled");
                    }
                }
                else if (data[i].approved == "denied" || data[i].approved == "approved")
                {
                    if (approveBtn && denyBtn)
                    {
                        console.log(approveBtn.parentNode.parentNode);
                        approveBtn.style.display = "none";
                        denyBtn.style.display = "none";
                    }
                }
                approvalList.appendChild(approvalEntry);
            }

            filterApprovals();
        });
}

function filterApprovals ()
{
    if (approvalList.querySelector(".no-info-div"))
    {
        approvalList.removeChild(document.getElementsByClassName("no-info-div")[0]);
    }
    const timeFrame = timeFrameList.value;
    // const approvals = approvalList.childNodes;
    const approvals = approvalList.querySelectorAll("div");
    console.log(approvals);
    var acceptableStatus = [];
    if (timeFrame === "Upcoming")
    {
        acceptableStatus = ["pending", "escalation"];
    }
    else if (timeFrame === "All Time")
    {
        acceptableStatus = ["pending", "escalation", "approved", "denied"];
    }
    else if (timeFrame === "Past")
    {
        acceptableStatus = ["approved", "denied"];
    }
    var anyVisible = false;
    console.log(approvals);
    approvals.forEach(approval => {
        if (approval.hasAttribute("data-status"))
        {
            console.log("Status", approval.dataset.status, acceptableStatus.includes(approval.dataset.status));
            acceptableStatus.includes(approval.dataset.status) ? (approval.style.display = "", anyVisible = true) : approval.style.display = "none";   
        }
    });

    if (!anyVisible)
    {
        console.log("New No Info Built");
        const noInfoDisplay = $ce("div");
        noInfoDisplay.className = "no-info-div";
        const banSVG = createBanSVG();
        noInfoDisplay.appendChild(banSVG);
        const noInfoWords = $ce("span");
        noInfoWords.textContent = "No approvals were found.";
        noInfoDisplay.appendChild(noInfoWords);
        approvalList.appendChild(noInfoDisplay);
    }
}

function changeEventInfo ()
{
    let child = eventDetails.lastElementChild;
    while (child)
    {
        eventDetails.removeChild(child);
        child = eventDetails.lastElementChild;
    }
    if (eventList.value == 0)
    {
        const eventHeader = $ce("h3");
        eventHeader.textContent = "All Events";
        eventDetails.appendChild(eventHeader);
    }
    else
    {
        console.log(eventList.selectedIndex);
        const eventSpecifcs = eventList.options[0].value !== 0 ? eventInfo[eventList.selectedIndex] : eventInfo[eventList.selectedIndex] - 1;
        const eventHeader = $ce("h3");
        eventHeader.textContent = eventSpecifcs.eventName;
        eventDetails.appendChild(eventHeader);

        // Overall Budget
        const overallBudget = $ce("h4");
        overallBudget.textContent = "Overall Budget: $" + eventSpecifcs.overallBudget;
        eventDetails.appendChild(overallBudget);

        // First Threshold
        const firstThreshold = $ce("h5");
        firstThreshold.textContent = "First Threshold: $" + eventSpecifcs.firstThreshold;
        eventDetails.appendChild(firstThreshold);

        // Second Threshold
        const secondThreshold = $ce("h5");
        secondThreshold.textContent = "Second Threshold: $" + eventSpecifcs.secondThreshold;
        eventDetails.appendChild(secondThreshold);

        // Difference on Budget

        // Date Range
        var startDate = "";
        var endDate = "";
        const baseStartDate = new Date(eventSpecifcs.startDate);
        if (eventSpecifcs.startDate.includes("T"))
        {
            startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000);
            // startDate = new Date(eventSpecifcs.startDate);
        }
        else
        {
            startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000);
        }
        const baseEndDate = new Date(eventSpecifcs.endDate);
        if (eventSpecifcs.endDate.includes("T"))
        {
            endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000);
        }
        else
        {
            endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000);
            // endDate = new Date(eventSpecifcs.endDate + "T00:00:00.000");
        }
        const dateRange = $ce("h6");
        dateRange.textContent = startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString();
        eventDetails.appendChild(dateRange);

        // Event Location
        const eventLocation = $ce("h6");
        eventLocation.textContent = eventSpecifcs.eventLocation;
        eventDetails.appendChild(eventLocation);

        // Allowed Airports - FINISH THIS
        if (eventSpecifcs.eventAirports)
        {
            const airportsUnsplit = eventSpecifcs.eventAirports.split("&&");
            const airports = $ce("h6");
            airports.textContent = "Allowed Airports:";
            var airportText = "";
            airportsUnsplit.forEach(airport => {
                let splitAirport = airport.split("|");
                airportText += " " + splitAirport[0];
                if (splitAirport[1] == "true")
                {
                    airportText += " (Primary)";
                }
                airportText += ",";
            });            
            airportText = airportText.substring(0, airportText.length - 1);
            airports.textContent += airportText;
            eventDetails.appendChild(airports);
        }

        // Other Info
        const otherInfo = $ce("div");
        // Max Layovers
        const maxLayovers = $ce("span");
        maxLayovers.textContent = "Max Layovers: " + eventSpecifcs.layoverMax + " stop(s)";
        otherInfo.appendChild(maxLayovers);
        // Date Buffer
        const dateTimeBuffer = $ce("span");
        dateTimeBuffer.textContent = "Day Buffer: " + eventSpecifcs.dateTimeBuffer + " day(s)";
        otherInfo.appendChild(dateTimeBuffer);
        eventDetails.appendChild(otherInfo);

        // Flight Tier
        const maxFlightTier = $ce("h6");
        maxFlightTier.textContent = "Max Flight Class: " + tierTranslation[eventSpecifcs.flightTierName];
        eventDetails.appendChild(maxFlightTier);
    }
}

function createHotelApprovalEntry (entry)
{
    const hotelDiv = $ce("div");
    hotelDiv.className = "hotel-offer-listing approval-entry";
    const offer = entry.hotelJSON;

    // Hotel Info
    // Hotel Name
    const hotelInfo = $ce("div");
    const hotelName = $ce("div");
    var hotelNameStr = capitalizeWords((entry.hotelName).replaceAll("&amp;", "&"));
    hotelName.textContent = hotelNameStr;
    hotelInfo.appendChild(hotelName);

    // Location
    // const hotelLocation = $ce("div");
    // hotelLocation.textContent = hotelInfoData.latitude + ", " + hotelInfoData.longitude;
    // hotelInfo.appendChild(hotelLocation);

    hotelDiv.appendChild(hotelInfo);

    // Offer Info
    const room = $ce("div");
    const bed = $ce("div");
    if (offer.room.typeEstimated.bedType)
    {
        bed.textContent = offer.room.typeEstimated.beds + " " + capitalizeWords(offer.room.typeEstimated.bedType) + " Bed(s)";
    }
    else 
    {
        bed.textContent = "Unknown Bed Information";
    }
    room.appendChild(bed);

    hotelDiv.appendChild(room);

    // Price
    const price = $ce("div");
    price.className = "price";
    var currency = "";
    // Handle Currencies
    if (offer.price.currency == "USD")
    {
        currency = "$";
    }
    // Add Difference from Threshold Here
    const hotelPrice = $ce("div");
    hotelPrice.textContent = currency + offer.price.total;
    price.appendChild(hotelPrice);
    const avgHotelPrice = $ce("div");
    avgHotelPrice.className = "avg-hotel-price";
    avgHotelPrice.textContent = currency + offer.price.variations.average.base + " per night";
    price.appendChild(avgHotelPrice);

    hotelDiv.appendChild(price);

    // Requester & Approver Info
    const involvedInfo = $ce("div");
    const requesterInfo = $ce("div");
    requesterInfo.textContent = "Requested by: " + entry.firstName + " " + entry.lastName;
    involvedInfo.appendChild(requesterInfo);
    const approverInfo = $ce("div");
    if (entry.approved == "denied")
    {
        approverInfo.textContent = "Denied by: ";
    }
    else
    {
        approverInfo.textContent = "Approved by: ";
    }
    if (!entry.approverFirstName || !entry.approverLastName)
    {
        approverInfo.textContent += "None";
    }
    else
    {
        approverInfo.textContent += entry.approverFirstName + " " + entry.approverLastName;
    }
    involvedInfo.appendChild(approverInfo);
    hotelDiv.appendChild(involvedInfo);

    var approveButton = document.createElement("button");
    approveButton.className = "approve";
    approveButton.appendChild(document.createTextNode("Approve"));
                    
    var denyButton = document.createElement("button");
    denyButton.className = "deny";
    denyButton.appendChild(document.createTextNode("Deny"));

    approveButton.addEventListener("click", function () {
        approveHotelBooking(entry.hotelBookingID);
    });

    denyButton.addEventListener("click", function () {
        denyHotelBooking(entry.hotelBookingID);
    });

    const btnDiv = $ce("div");
    btnDiv.className = "approval-btn-group";
    btnDiv.appendChild(approveButton);
    btnDiv.appendChild(denyButton);
    hotelDiv.appendChild(btnDiv);

    return hotelDiv;
}

function createApprovalEntry (entry)
{
    var bookingJSON = entry.json.data;
    var flightDiv;
    if (entry.api == "duffel")
    {
        flightDiv = createDuffelListing(bookingJSON);
    }
    else if (entry.api == "amadeus")
    {
        flightDiv = createAmadeusListing(bookingJSON.flightOffers[0]);
    }

    // Warnings
    if (entry.warnings)
    {
        console.log("Warnings exist");
        const flightWarning = flightDiv.querySelector(".flightWarning");
        const warningToolTipText = flightWarning.querySelector(".centric-tooltip-text");
        const warnArr = (entry.warnings).split("&&");
        console.log("Warning Arr", warnArr);
        warnArr.forEach(warning => {
            let warn = $ce("div");
            warn.textContent = warnDict[warning];
            warningToolTipText.appendChild(warn);
        });
        flightWarning.style.visibility = 'visible';
    }

    // Requester & Approver Info
    const involvedInfo = $ce("div");
    const requesterInfo = $ce("div");
    requesterInfo.textContent = "Requested by: " + entry.firstName + " " + entry.lastName;
    involvedInfo.appendChild(requesterInfo);
    const approverInfo = $ce("div");
    if (entry.approved == "denied")
    {
        approverInfo.textContent = "Denied by: ";
    }
    else
    {
        approverInfo.textContent = "Approved by: ";
    }
    if (!entry.approverFirstName || !entry.approverLastName)
    {
        approverInfo.textContent += "None";
    }
    else
    {
        approverInfo.textContent += entry.approverFirstName + " " + entry.approverLastName;
    }
    involvedInfo.appendChild(approverInfo);
    flightDiv.appendChild(involvedInfo);

    var approveButton = document.createElement("button");
    approveButton.className = "approve";
    approveButton.appendChild(document.createTextNode("Approve"));
                    
    var denyButton = document.createElement("button");
    denyButton.className = "deny";
    denyButton.appendChild(document.createTextNode("Deny"));
                    
    if (entry.api == "duffel")
    {
        approveButton.addEventListener('click', function () {
            approveDuffelBooking(entry.bookingID);
        });

        denyButton.addEventListener('click', function () {
            denyDuffelBooking(entry.bookingID);
        });
    }
    else if (entry.api == "amadeus")
    {
        approveButton.addEventListener('click', function () {
            approveAmadeusBooking(entry.bookingID);
        });

        denyButton.addEventListener('click', function () {
            denyAmadeusBooking(entry.bookingID);
        });
    }

    const btnDiv = $ce("div");
    btnDiv.className = "approval-btn-group";
    btnDiv.appendChild(approveButton);
    btnDiv.appendChild(denyButton);
    flightDiv.appendChild(btnDiv);

    return flightDiv;
}

function createDuffelListing (offer)
{
    var flightDiv = document.createElement("div");
    flightDiv.className = "flightListing aproval-entry";

    // Airline Image
    var airlineImage = document.createElement("img");
    airlineImage.src = offer.owner.logo_symbol_url;
    airlineImage.alt = offer.owner.name;
    airlineImage.className = "airline-img";
    
    flightDiv.appendChild(airlineImage);

    const legInfo = $ce("div");
    legInfo.className = "leg-info";

     // Outgoing Flight
     var outgoingDiv = document.createElement("div");
     outgoingDiv.className = "outgoingDiv";
     const departureHeader = $ce("div");
     departureHeader.textContent = "Departure";
     departureHeader.className = "departure-header";
     outgoingDiv.appendChild(departureHeader);
 
     var outgoingInfo = offer.slices[0];
     var outgoingDuration = $ce("div");
     outgoingDuration.className = "duration";
     var outgoingDurationContent = (outgoingInfo.duration).substring((outgoingInfo.duration).indexOf("PT") + 2).toLowerCase();
     outgoingDurationContent.indexOf("h") ? outgoingDurationContent = outgoingDurationContent.substring(0, outgoingDurationContent.indexOf("h") + 1) + " " + outgoingDurationContent.substring(outgoingDurationContent.indexOf("h") + 1) : outgoingDurationContent;
     outgoingDuration.appendChild($ctn(outgoingDurationContent));
     outgoingDiv.appendChild(outgoingDuration);

    for (let i = 0; i < outgoingInfo.segments.length; i++)
    {
        var legDiv = $ce("div");
        legDiv.className = "flightLeg";
        var airline = outgoingInfo.segments[i].operating_carrier.iata_code;
        var aircraft = outgoingInfo.segments[i].aircraft;
        aircraft = aircraft == null ? "N/A" : aircraft;
        var flightNum = outgoingInfo.segments[i].marketing_carrier_flight_number;
        var depTime = outgoingInfo.segments[i].departing_at;
        var arrTime = outgoingInfo.segments[i].arriving_at;
        var depCity = outgoingInfo.segments[i].origin.iata_code;
        var arrCity = outgoingInfo.segments[i].destination.iata_code;

        // Define Attributes
        legDiv.dataset.airline = airline;
        legDiv.dataset.aircraft = aircraft;
        legDiv.dataset.depTime = depTime;
        legDiv.dataset.arrTime = arrTime;

        // Define Overall Departure and Arrival Times
        if (i === 0)
        {
            outgoingDiv.dataset.overallDepTime = depTime;
        }
        if (i === (outgoingInfo.segments.length - 1))
        {
            outgoingDiv.dataset.overallArrTime = arrTime;
        }
        
        // City to City
        var cityToCity = $ce("div");
        cityToCity.className = "city-to-city";
        cityToCity.textContent = depCity + " - " + arrCity;
        legDiv.appendChild(cityToCity);

        // Time Info
        var timeInfo = $ce("div");
        timeInfo.className = "time-info";
        var depTimeDate = (new Date(depTime)).toLocaleTimeString();
        depTimeDate = depTimeDate.substring(0, depTimeDate.lastIndexOf(":")) + depTimeDate.substring(depTimeDate.lastIndexOf(" "));
        var arrTimeDate = (new Date(arrTime)).toLocaleTimeString();
        arrTimeDate = arrTimeDate.substring(0, arrTimeDate.lastIndexOf(":")) + arrTimeDate.substring(arrTimeDate.lastIndexOf(" "));
        timeInfo.textContent = (depTimeDate + " - " + arrTimeDate);

        // Plane Info
        var planeInfo = $ce("span");
        planeInfo.className = "plane-info";
        planeInfo.textContent = airline + " " + flightNum;
        timeInfo.appendChild(planeInfo);

        legDiv.appendChild(timeInfo);

        // Ancillary Details
        var ancillaryDetail = $ce("div");
        ancillaryDetail.className = "ancillary-detail";
        var flightClassSpan = $ce("span");
        flightClassSpan.className = "flight-class";
        flightClassSpan.textContent = outgoingInfo.fare_brand_name;
        var checkedBagsSpan = $ce("span");
        checkedBagsSpan.className = "checked-bags";
        checkedBagsSpan.textContent = "1 Checked Bag";
        ancillaryDetail.appendChild(flightClassSpan);
        ancillaryDetail.appendChild($ctn(" | "));
        ancillaryDetail.appendChild(checkedBagsSpan);
        legDiv.appendChild(ancillaryDetail);

        outgoingDiv.appendChild(legDiv);
    }

    legInfo.appendChild(outgoingDiv);

    // Returning Flight
    var returningDiv = $ce("div");
    returningDiv.className = "returningDiv";
    const returningHeader = $ce("div");
    returningHeader.textContent = "Returning";
    returningHeader.className = "returning-header";
    returningDiv.appendChild(returningHeader);
    var returningInfo = offer.slices[1];
    var returningDuration = $ce("div");
    returningDuration.className = "duration";
    var returningDurationContent = (returningInfo.duration).substring((returningInfo.duration).indexOf("PT") + 2).toLowerCase();
    returningDurationContent.indexOf("h") ? returningDurationContent = returningDurationContent.substring(0, returningDurationContent.indexOf("h") + 1) + " " + returningDurationContent.substring(returningDurationContent.indexOf("h") + 1) : returningDurationContent;
    returningDuration.appendChild($ctn(returningDurationContent));
    returningDiv.appendChild(returningDuration);

    for (let i = 0; i < returningInfo.segments.length; i++)
    {
        var legDiv = $ce("div");
        legDiv.className = "flightLeg";
        var airline = outgoingInfo.segments[i].operating_carrier.iata_code;
        var aircraft = returningInfo.segments[i].aircraft;
        aircraft = aircraft == null ? "N/A" : aircraft;
        var flightNum = returningInfo.segments[i].marketing_carrier_flight_number;
        var depTime = returningInfo.segments[i].departing_at;
        var arrTime = returningInfo.segments[i].arriving_at;
        var depCity = returningInfo.segments[i].origin.iata_code;
        var arrCity = returningInfo.segments[i].destination.iata_code;
        
        // Define Attributes
        legDiv.dataset.airline = airline;
        legDiv.dataset.aircraft = aircraft;
        legDiv.dataset.depTime = depTime;
        legDiv.dataset.arrTime = arrTime;

        // Define Overall Departure and Arrival Times
        if (i === 0)
        {
            returningDiv.dataset.overallDepTime = depTime;
        }
        if (i === (returningInfo.segments.length - 1))
        {
            returningDiv.dataset.overallArrTime = arrTime;
        }
        
        // City to City
        var cityToCity = $ce("div");
        cityToCity.className = "city-to-city";
        cityToCity.textContent = depCity + " - " + arrCity;
        legDiv.appendChild(cityToCity);

        // Time Info
        var timeInfo = $ce("div");
        timeInfo.className = "time-info";
        var depTimeDate = (new Date(depTime)).toLocaleTimeString();
        depTimeDate = depTimeDate.substring(0, depTimeDate.lastIndexOf(":")) + depTimeDate.substring(depTimeDate.lastIndexOf(" "));
        var arrTimeDate = (new Date(arrTime)).toLocaleTimeString();
        arrTimeDate = arrTimeDate.substring(0, arrTimeDate.lastIndexOf(":")) + arrTimeDate.substring(arrTimeDate.lastIndexOf(" "));
        timeInfo.textContent = (depTimeDate + " - " + arrTimeDate);

        // Plane Info
        var planeInfo = $ce("span");
        planeInfo.className = "plane-info";
        planeInfo.textContent = airline + " " + flightNum;
        timeInfo.appendChild(planeInfo);

        legDiv.appendChild(timeInfo);

        // Ancillary Details
        var ancillaryDetail = $ce("div");
        ancillaryDetail.className = "ancillary-detail";
        var flightClassSpan = $ce("span");
        flightClassSpan.className = "flight-class";
        flightClassSpan.textContent = returningInfo.fare_brand_name;
        var checkedBagsSpan = $ce("span");
        checkedBagsSpan.className = "checked-bags";
        checkedBagsSpan.textContent = "1 Checked Bag";
        ancillaryDetail.appendChild(flightClassSpan);
        ancillaryDetail.appendChild($ctn(" | "));
        ancillaryDetail.appendChild(checkedBagsSpan);
        legDiv.appendChild(ancillaryDetail);
            
        returningDiv.appendChild(legDiv);
    }

    legInfo.appendChild(returningDiv);

    flightDiv.appendChild(legInfo);

    // Create Empty Warning Div
    const flightWarning = $ce("div");
    flightWarning.className = "centric-tooltip flightWarning";
    flightWarning.style.visibility = "hidden";
    flightWarning.appendChild(createHazardSVG());
    const tooltipText = $ce("span");
    tooltipText.className = "centric-tooltip-text hover-left";
    flightWarning.appendChild(tooltipText);
    flightDiv.appendChild(flightWarning);

    // Price Information
    var price = document.createElement("div");
    price.className = "price";
    priceString = "";
    // Handle Currencies
    if (offer.tax_currency == "USD")
    {
        priceString += "$";
    }
    else if (offer.price.currency == "EUR")
    {
        priceString += "€";
    }

    const eventSpecifcs = eventList.options[0].value !== 0 ? eventInfo[eventList.selectedIndex] : eventInfo[eventList.selectedIndex] - 1;
    const firstThreshold = parseFloat(eventSpecifcs.firstThreshold);
    var priceDiffContent = parseFloat(offer.total_amount) - firstThreshold;
    priceDiffContent = Math.round(priceDiffContent * 100) / 100; 

    priceString += offer.total_amount;
    var flightPrice = $ce("div");
    flightPrice.className = "flight-price";
    flightPrice.appendChild($ctn(priceString));
    price.appendChild(flightPrice);
    var priceDiff = $ce("div");
    priceDiff.className = "price-diff";
    priceDiffContent > 0 ? priceDiff.textContent = "+$" + priceDiffContent : priceDiff.textContent = "-$" + (priceDiffContent + "").substring(1);
    price.appendChild(priceDiff);

    flightDiv.dataset.price = offer.total_amount;    
    flightDiv.appendChild(price);

    return flightDiv;
}

function createAmadeusListing (offer)
{
    var flightDiv = $ce("div");
    flightDiv.className = "flightListing approval-entry";

    // Airline Image
    if (offer.itineraries[0].segments[0].carrierCode == "UA")
    {
        var airlineImage = document.createElement("img");
        airlineImage.src = "img/ua.png";
        airlineImage.alt = "United Airlines Logo";
        airlineImage.className = "airline-img";
        flightDiv.appendChild(airlineImage);
    }
    else if (offer.itineraries[0].segments[0].carrierCode == "B6")
    {
        var airlineImage = document.createElement("img");
        airlineImage.src = "img/b6.png";
        airlineImage.alt = "JetBlue Logo";
        airlineImage.className = "airline-img";
        flightDiv.appendChild(airlineImage);
    }
    else if (offer.itineraries[0].segments[0].carrierCode == "AS")
    {
        var airlineImage = document.createElement("img");
        airlineImage.src = "img/as.png";
        airlineImage.alt = "Alaska Airlines Logo";
        airlineImage.className = "airline-img";
        flightDiv.appendChild(airlineImage);
    }
    else if (offer.itineraries[0].segments[0].carrierCode == "NK")
    {
        var airlineImage = document.createElement("img");
        airlineImage.src = "img/nk.jpg";
        airlineImage.alt = "Spirit Airlines Logo";
        airlineImage.className = "airline-img";
        flightDiv.appendChild(airlineImage);
    }
    else if (offer.itineraries[0].segments[0].carrierCode == "F9")
    {
        var airlineImage = document.createElement("img");
        airlineImage.src = "img/f9.png";
        airlineImage.alt = "Frontier Airlines Logo";
        airlineImage.className = "airline-img";
        flightDiv.appendChild(airlineImage);
    }

    const legInfo = $ce("div");
    legInfo.className = "leg-info";

    // Outgoing Flight
    var outgoingDiv = $ce("div");
    outgoingDiv.className = "outgoingDiv";
    const departureHeader = $ce("div");
    departureHeader.textContent = "Departure";
    departureHeader.className = "departure-header";
    outgoingDiv.appendChild(departureHeader);

    var outgoingInfo = offer.itineraries[0];
    // var outgoingDuration = $ce("div");
    // outgoingDuration.className = "duration";
    // var outgoingDurationContent = (outgoingInfo.duration).substring((outgoingInfo.duration).indexOf("PT") + 2).toLowerCase();
    // outgoingDurationContent.indexOf("h") ? outgoingDurationContent = outgoingDurationContent.substring(0, outgoingDurationContent.indexOf("h") + 1) + " " + outgoingDurationContent.substring(outgoingDurationContent.indexOf("h") + 1) : outgoingDurationContent;
    // outgoingDuration.appendChild($ctn(outgoingDurationContent));
    // outgoingDiv.appendChild(outgoingDuration);

    for (let i = 0; i < outgoingInfo.segments.length; i++)
    {
        var legDiv = $ce("div");
        legDiv.className = "flightLeg";
        var aircraft = outgoingInfo.segments[i].aircraft.code;
        var airline = outgoingInfo.segments[i].carrierCode;
        var flightNum = outgoingInfo.segments[i].number;
        var depTime = outgoingInfo.segments[i].departure.at;
        var arrTime = outgoingInfo.segments[i].arrival.at;
        var depCity = outgoingInfo.segments[i].departure.iataCode;
        var arrCity = outgoingInfo.segments[i].arrival.iataCode;

        // Define Attributes
        legDiv.dataset.airline = airline;
        legDiv.dataset.aircraft = aircraft;
        legDiv.dataset.depTime = depTime;
        legDiv.dataset.arrTime = arrTime;

        // Define Overall Departure and Arrival Times
        if (i === 0)
        {
            outgoingDiv.dataset.overallDepTime = depTime;
        }
        if (i === (outgoingInfo.segments.length - 1))
        {
            outgoingDiv.dataset.overallArrTime = arrTime;
        }
        
        // City to City
        var cityToCity = $ce("div");
        cityToCity.className = "city-to-city";
        cityToCity.textContent = depCity + " - " + arrCity;
        legDiv.appendChild(cityToCity);

        // Time Info
        var timeInfo = $ce("div");
        timeInfo.className = "time-info";
        var depTimeDate = (new Date(depTime)).toLocaleTimeString();
        depTimeDate = depTimeDate.substring(0, depTimeDate.lastIndexOf(":")) + depTimeDate.substring(depTimeDate.lastIndexOf(" "));
        var arrTimeDate = (new Date(arrTime)).toLocaleTimeString();
        arrTimeDate = arrTimeDate.substring(0, arrTimeDate.lastIndexOf(":")) + arrTimeDate.substring(arrTimeDate.lastIndexOf(" "));
        timeInfo.textContent = (depTimeDate + " - " + arrTimeDate);

        // Plane Info
        var planeInfo = $ce("span");
        planeInfo.className = "plane-info";
        planeInfo.textContent = airline + " " + flightNum;
        timeInfo.appendChild(planeInfo);

        legDiv.appendChild(timeInfo);

        // Ancillary Details
        var ancillaryDetail = $ce("div");
        ancillaryDetail.className = "ancillary-detail";
        // var flightClassSpan = $ce("span");
        // flightClassSpan.className = "flight-class";
        // flightClassSpan.textContent = outgoingInfo.fare_brand_name;
        var checkedBagsSpan = $ce("span");
        checkedBagsSpan.className = "checked-bags";
        checkedBagsSpan.textContent = "1 Checked Bag";
        // ancillaryDetail.appendChild(flightClassSpan);
        // ancillaryDetail.appendChild($ctn(" | "));
        ancillaryDetail.appendChild(checkedBagsSpan);
        legDiv.appendChild(ancillaryDetail);

        outgoingDiv.appendChild(legDiv);
    }

    legInfo.appendChild(outgoingDiv);

    // Returning Flight
    var returningDiv = $ce("div");
    returningDiv.className = "returningDiv";
    var returningInfo = offer.itineraries[0];
    const returningHeader = $ce("div");
    returningHeader.textContent = "Returning";
    returningHeader.className = "returning-header";
    returningDiv.appendChild(returningHeader);
    // var returningDuration = $ce("div");
    // returningDuration.className = "duration";
    // var returningDurationContent = (returningInfo.duration).substring((returningInfo.duration).indexOf("PT") + 2).toLowerCase();
    // returningDurationContent.indexOf("h") ? returningDurationContent = returningDurationContent.substring(0, returningDurationContent.indexOf("h") + 1) + " " + returningDurationContent.substring(returningDurationContent.indexOf("h") + 1) : returningDurationContent;
    // returningDuration.appendChild($ctn(returningDurationContent));
    // returningDiv.appendChild(returningDuration);

    for (let i = 0; i < returningInfo.segments.length; i++)
    {
        var legDiv = $ce("div");
        legDiv.className = "flightLeg";
        var aircraft = returningInfo.segments[i].aircraft.code;
        var airline = returningInfo.segments[i].carrierCode;
        var flightNum = returningInfo.segments[i].number;
        var depTime = returningInfo.segments[i].departure.at;
        var arrTime = returningInfo.segments[i].arrival.at;
        var depCity = returningInfo.segments[i].departure.iataCode;
        var arrCity = returningInfo.segments[i].arrival.iataCode;

        // Define Attributes
        legDiv.dataset.airline = airline;
        legDiv.dataset.aircraft = aircraft;
        legDiv.dataset.depTime = depTime;
        legDiv.dataset.arrTime = arrTime;

        // Define Overall Departure and Arrival Times
        if (i === 0)
        {
            returningDiv.dataset.overallDepTime = depTime;
        }
        if (i === (returningInfo.segments.length - 1))
        {
            returningDiv.dataset.overallArrTime = arrTime;
        }
        
        // City to City
        var cityToCity = $ce("div");
        cityToCity.className = "city-to-city";
        cityToCity.textContent = depCity + " - " + arrCity;
        legDiv.appendChild(cityToCity);

        // Time Info
        var timeInfo = $ce("div");
        timeInfo.className = "time-info";
        var depTimeDate = (new Date(depTime)).toLocaleTimeString();
        depTimeDate = depTimeDate.substring(0, depTimeDate.lastIndexOf(":")) + depTimeDate.substring(depTimeDate.lastIndexOf(" "));
        var arrTimeDate = (new Date(arrTime)).toLocaleTimeString();
        arrTimeDate = arrTimeDate.substring(0, arrTimeDate.lastIndexOf(":")) + arrTimeDate.substring(arrTimeDate.lastIndexOf(" "));
        timeInfo.textContent = (depTimeDate + " - " + arrTimeDate);

        // Plane Info
        var planeInfo = $ce("span");
        planeInfo.className = "plane-info";
        planeInfo.textContent = airline + " " + flightNum;
        timeInfo.appendChild(planeInfo);

        legDiv.appendChild(timeInfo);

        // Ancillary Details
        var ancillaryDetail = $ce("div");
        ancillaryDetail.className = "ancillary-detail";
        // var flightClassSpan = $ce("span");
        // flightClassSpan.className = "flight-class";
        // flightClassSpan.textContent = outgoingInfo.fare_brand_name;
        var checkedBagsSpan = $ce("span");
        checkedBagsSpan.className = "checked-bags";
        checkedBagsSpan.textContent = "1 Checked Bag";
        // ancillaryDetail.appendChild(flightClassSpan);
        // ancillaryDetail.appendChild($ctn(" | "));
        ancillaryDetail.appendChild(checkedBagsSpan);
        legDiv.appendChild(ancillaryDetail);

        returningDiv.appendChild(legDiv);
    }
    legInfo.appendChild(returningDiv);

    flightDiv.appendChild(legInfo);

    // Create Empty Warning Div
    const flightWarning = $ce("div");
    flightWarning.className = "centric-tooltip flightWarning";
    flightWarning.style.visibility = "hidden";
    flightWarning.appendChild(createHazardSVG());
    const tooltipText = $ce("span");
    tooltipText.className = "centric-tooltip-text hover-left";
    flightWarning.appendChild(tooltipText);
    flightDiv.appendChild(flightWarning);

    // Price Information
    var price = $ce("div");
    priceString = "";
    // Handle Currencies
    if (offer.price.currency == "USD")
    {
        priceString += "$";
    }
    else if (offer.price.currency == "EUR")
    {
        priceString += "€";
    }

    const eventSpecifcs = eventList.options[0].value !== 0 ? eventInfo[eventList.selectedIndex] : eventInfo[eventList.selectedIndex] - 1;
    const firstThreshold = parseFloat(eventSpecifcs.firstThreshold);
    var priceDiffContent = parseFloat(offer.price.total) - firstThreshold;
    priceDiffContent = Math.round(priceDiffContent * 100) / 100;

    priceString += offer.price.total;
    var flightPrice = $ce("div");
    flightPrice.className = "flight-price";
    flightPrice.appendChild($ctn(priceString));
    price.appendChild(flightPrice);
    var priceDiff = $ce("div");
    priceDiff.className = "price-diff";
    priceDiffContent > 0 ? priceDiff.textContent = "+$" + priceDiffContent : priceDiff.textContent = "-$" + (priceDiffContent + "").substring(1);
    price.appendChild(priceDiff);

    flightDiv.dataset.price = offer.price.total;    
    flightDiv.appendChild(price);

    return flightDiv;
}

async function approveDuffelBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/duffel-order-payment?bookingID=" + bookingID + "&organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            fullPageLoader(false);
            console.log(data);
            if (data.err)
            {
                return;
            }
            window.location.href = "/approval";
        });
}

async function approveAmadeusBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/amadeus-approve-booking?bookingID=" + bookingID + "&organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            fullPageLoader(false);
            console.log(data);
            if (data.err)
            {
                return;
            }
            window.location.href = "/approval";
        });
}

async function denyDuffelBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/duffel-order-cancel?bookingID=" + bookingID + "&organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            fullPageLoader(false);
            console.log(data);
            if (data.err)
            {
                return;
            }
            window.location.href = "/approval";
        });
}

async function denyAmadeusBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/amadeus-deny-booking?bookingID=" + bookingID + "&organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            fullPageLoader(false);
            console.log(data);
            if (data.err)
            {
                return;
            }
            window.location.href = "/approval";
        });
}

async function approveHotelBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/amadeus-approve-hotel-booking?bookingID=" + bookingID + "&organizationID=" + organizationID)
    .then(response => response.json())
    .then(data => {
        fullPageLoader(false);
        console.log(data);
        if (data.err)
        {
            return;
        }
        window.location.href = "/approval";
    });
}

async function denyHotelBooking (bookingID)
{
    fullPageLoader(true);
    const organizationID = organizationList.value;
    fetch("/amadeus-deny-hotel-booking?bookingID=" + bookingID + "&organizationID=" + organizationID)
    .then(response => response.json())
    .then(data => {
        fullPageLoader(false);
        console.log(data);
        if (data.err)
        {
            return;
        }
        window.location.href = "/approval";
    });
}

// On Load
document.addEventListener('DOMContentLoaded', function () {
    if (organizationList)
    {
        populateOrganizations();
    }

    if (eventList)
    {
        eventList.addEventListener("change", function () {
            changeEventInfo();
            populateApprovals();
        });
    }

    if (timeFrameList)
    {
        timeFrameList.addEventListener("change", function () {
            filterApprovals();
        });
    }
});