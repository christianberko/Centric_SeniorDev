const fullNameDisplay = document.getElementById("fullName");
const emailDisplay = document.getElementById("smallEmail");

const firstName = document.getElementById("firstName");
const middleName = document.getElementById("middleName");
const lastName = document.getElementById("lastName");
// const suffix = document.getElementById("suffix");
const email = document.getElementById("email");
const birthdate = document.getElementById("birthdate");
const preferredName = document.getElementById("preferredName");
const phoneNumber = document.getElementById("phoneNumber");
const ktn = document.getElementById("KTN");
const gender = document.getElementById("gender");
const title = document.getElementById("title");
const preferredAirport = document.getElementById("preferredAirport");

const resetMFABtn = document.getElementById("resetMFA");
const resetPasswordBtn = document.getElementById("resetPassword");

async function getUserInfo ()
{
    fetch("/user-personal-information")
        .then(response => response.json())
        .then(data => {
            actualData = data;

            firstName.value = actualData.firstName;
            middleName.value = actualData.middleName;
            lastName.value = actualData.lastName;
            // suffix.value = actualData.suffix;
            birthdate.value = actualData.birthdate;
            preferredName.value = actualData.preferredName;
            phoneNumber.value = actualData.phoneNumber.substring(1, 4) + "-" + actualData.phoneNumber.substring(4, 7) + "-" + actualData.phoneNumber.substring(7, 11);
            ktn.value = actualData.KTN;
            gender.value = actualData.gender;
            title.value = actualData.title;
            preferredAirport.value = actualData.preferredAirport;

            updateFullName();
            updateEmail(actualData.email);
        });
}

async function updateUserInfo ()
{
    fetch("/update-user-personal-information/", {
        method: 'POST',
        body: JSON.stringify({
            firstName: firstName.value,
            middleName: middleName.value,
            lastName: lastName.value,
            // suffix: suffix.value,
            birthdate: birthdate.value,
            preferredName: preferredName.value,
            phoneNumber: phoneNumber.value,
            ktn: ktn.value,
            gender: gender.value,
            title: title.value,
            preferredAirport: preferredAirport.value
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            window.location.href = "/userProfileBasic";
    });
}

/** History Page */
async function getFlightHistory ()
{
    const searchResults = document.getElementById("searchResults");

    fetch("/get-all-user-bookings")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            for (let i = 0; i < data.length; i++)
            {
                if (data[i].bookingID)
                {
                    searchResults.appendChild(createFlightEntry(data[i]));
                }
                else if (data[i].hotelBookingID)
                {
                    searchResults.appendChild(createHotelEntry(data[i]));
                }
            }
        });
}

function createHotelEntry (entry)
{
    var entryDiv = $ce("div");
    entryDiv.className = "flight-entry";
    var eventName = $ce("h3");
    eventName.appendChild($ctn(entry.eventName));
    entryDiv.appendChild(eventName);
    var eventLocation = $ce("h6");
    eventLocation.appendChild($ctn(entry.eventLocation));
    entryDiv.appendChild(eventLocation);
    var eventDates = $ce("h6");
    var startDate = "";
    var endDate = "";
    const baseDate = new Date();
    if (entry.startDate.includes("T"))
    {
        startDate = new Date( (new Date(entry.startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
    }
    else
    {
        startDate = new Date( (new Date(entry.startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
        // startDate = new Date( (new Date(data[i].startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );startDate = new Date(data[i].startDate + "T00:00:00.000");
    }

    if (entry.endDate.includes("T"))
    {
        endDate = new Date( (new Date(entry.endDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate);
    }
    else
    {
        endDate = new Date( (new Date(entry.endDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate + "T00:00:00.000");
    }
    eventDates.appendChild($ctn(startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString()));
    entryDiv.appendChild(eventDates);

    const hotelDiv = $ce("div");
    hotelDiv.className = "flightListing hotel-offer-listing";
    const hotelInfo = $ce("div");
    const hotelName = $ce("div");
    var hotelNameStr = capitalizeWords((entry.hotelName).replaceAll("&amp;", "&"));
    hotelName.textContent = hotelNameStr;
    hotelInfo.appendChild(hotelName);
    hotelDiv.appendChild(hotelInfo);

    const room = $ce("div");
    const bed = $ce("div");
    const offer = entry.hotelJSON;
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

    entryDiv.appendChild(hotelDiv);

    // Status Button
    const statusBtn = $ce("button");
    if (entry.approved === "denied")
    {
        statusBtn.textContent = "Denied";
        statusBtn.className = "deniedBtn";
    }
    else if (entry.approved === "approved")
    {
        statusBtn.textContent = "Confirmed";
        statusBtn.className = "confirmedBtn";
    }
    else if (entry.approved === "escalation" || entry.approved === "pending")
    {
        statusBtn.textContent = "Pending";
        statusBtn.className = "pendingBtn";
    }
    entryDiv.appendChild(statusBtn);
    return entryDiv;
}

function createFlightEntry (entry)
{
    var entryDiv = $ce("div");
    entryDiv.className = "flight-entry";
    var eventName = $ce("h3");
    eventName.appendChild($ctn(entry.eventName));
    entryDiv.appendChild(eventName);
    var eventLocation = $ce("h6");
    eventLocation.appendChild($ctn(entry.eventLocation));
    entryDiv.appendChild(eventLocation);
    var eventDates = $ce("h6");
    var startDate = "";
    var endDate = "";
    const baseStartDate = new Date(entry.startDate);
    if (entry.startDate.includes("T"))
    {
        startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000 );
    }
    else
    {
        startDate = new Date( baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000 );
        // startDate = new Date( (new Date(data[i].startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );startDate = new Date(data[i].startDate + "T00:00:00.000");
    }
    const baseEndDate = new Date(entry.endDate);
    if (entry.endDate.includes("T"))
    {
        endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate);
    }
    else
    {
        endDate = new Date( baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate + "T00:00:00.000");
    }
    eventDates.appendChild($ctn(startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString()));
    entryDiv.appendChild(eventDates);

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

    entryDiv.appendChild(flightDiv);

    // Status Button
    const statusBtn = $ce("button");
    if (entry.approved === "denied")
    {
        statusBtn.textContent = "Denied";
        statusBtn.className = "deniedBtn";
    }
    else if (entry.approved === "approved")
    {
        statusBtn.textContent = "Confirmed";
        statusBtn.className = "confirmedBtn";
    }
    else if (entry.approved === "escalation" || entry.approved === "pending")
    {
        statusBtn.textContent = "Pending";
        statusBtn.className = "pendingBtn";
    }
    entryDiv.appendChild(statusBtn);
    return entryDiv;
}

function createDuffelListing (offer)
{
    var flightDiv = document.createElement("div");
    flightDiv.className = "flightListing";

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

    // Price Information
    var price = document.createElement("div");
    price.className = "flight-history-price";
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

    priceString += offer.total_amount;
    price.appendChild($ctn(priceString));
    flightDiv.dataset.price = offer.total_amount;    
    flightDiv.appendChild(price);

    return flightDiv;
}

function createAmadeusListing (offer)
{
    var flightDiv = $ce("div");
    flightDiv.className = "flightListing";

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

    // Price Information
    var price = $ce("div");
    price.className = "flight-history-price";
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

    priceString += offer.price.total;
    price.appendChild($ctn(priceString));
    flightDiv.dataset.price = offer.price.total;    
    flightDiv.appendChild(price);

    return flightDiv;
}

// Function to update the full name display
function updateFullName() {
    const newFirstName = firstName.value.trim();
    const newLastName = lastName.value.trim();
    fullNameDisplay.textContent = (newFirstName) + " " + (newLastName);
}

// Function to update the email display
function updateEmail(email) {
    emailDisplay.textContent = email.trim();
}

// display the user's full name and email address
document.addEventListener("DOMContentLoaded", async function () {
    if (document.getElementById("personal").classList.contains("active"))
    {
        getUserInfo();
        // Attach event listeners to input fields
        firstName.addEventListener("input", updateFullName);
        lastName.addEventListener("input", updateFullName);
    }

    if (resetMFABtn)
    {
        resetMFABtn.addEventListener("click", function () {
            fetch("/mfa-reset")
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.err)
                {
                    // Display error
                    console.log(err);
                }
                else if (data.msg)
                {
                    window.location.href = "/mfaConfig";
                }
            });
        });
    }

    if (resetPasswordBtn)
    {
        resetPasswordBtn.addEventListener("click", function () {
            window.location.href = "/resetPassword";
        });
    }

    if (preferredAirport) {
        $(function () {
            $('#preferredAirport').autocomplete({
                source: function (req, res) {
                    $.ajax({
                        url: "airport-search/",
                        dataType: "json",
                        type: "GET",
                        data: req,
                        success: function (data) {
                            res($.map(data, function (val) {
                                var addressLabel = val.address.countryCode == "US"
                                    ? `${capitalizeWords(val.address.cityName)}, ${val.address.stateCode}, ${val.address.countryCode} (${val.iataCode})`
                                    : `${capitalizeWords(val.address.cityName)}, ${val.address.countryCode} (${val.iataCode})`;
                                return { label: addressLabel, value: val.iataCode };
                            }));
                        },
                        error: function (err) {
                            console.log(err);
                        }
                    });
                }
            });
        });
    }
});