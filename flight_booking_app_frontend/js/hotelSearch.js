// DOM Elements
const selectedEventInfo = document.getElementById("selected-event-info");
const selectedEventName = document.getElementById("selected-event-name");
const selectedEventOrg = document.getElementById("selected-event-org");
const selectedEventOther = document.getElementById("selected-event-other");
const selectedEventLocation = document.getElementById("selected-event-location");
const selectedEventDates = document.getElementById("selected-event-dates");
const eventList = document.getElementById("eventList");

const stayingCityInput = document.getElementById("staying-city");
const checkInDateInput = document.getElementById("departureDate");
const checkOutDateInput = document.getElementById("returnDate");
const goBtn = document.getElementById("go-hotel-search");

const notificationPopup = document.getElementById("notification-popup");

const searchResults = document.getElementById("searchResults");

var hotelData = {};
var hotelInfoData = {}
var hotelOfferData = {};
var currentAddress = "";

var flightDataHTML = [];

// Flight Tier Data
var flightTierRankings = { "economy": 1, "premium_economy": 2, "business": 3, "first": 4 };

// Filter Data
var availableAirlines = {};

// Passenger Info
var passengerInfo = {};

// Confirmed Flight Offer
var confirmedOffer = {};
var confirmedOfferDivID = 0;

// Hotel Chain Code
const hotelChainCodes = {
    "BW": "Best Western",
    "CT": "Comfort Inn",
    "DI": "Days Inn",
    "DT": "Double Tree",
    "FN": "Fairfield Inn",
    "QI": "Quality Inn",
};

async function userInfo ()
{
    fetch(`/user-passenger-info`)
    .then(response => response.json())
    .then(data => {
        if (data.err)
        {
            window.location.href = "/signIn?prev=hotelSearch";
        }
        passengerInfo = data;
        console.log(passengerInfo);
        populateEvents();
    });
}

async function populateEvents ()
{
    fetch("/get-current-hotel-user-events")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                window.location.href = "/signIn?prev=hotelSearch";
            }
            console.log(data.length);
            if (data.length == 0)
            {
                const noMoreEvents = $ce("div");
                const noMoreEventsHeader = $ce("h3");
                const noMoreEventsText = $ce("p");
                noMoreEventsHeader.appendChild($ctn("No Unbooked Events"));
                noMoreEvents.appendChild(noMoreEventsHeader);
                noMoreEventsText.innerHTML = "You have no more events to book for. Please visit your <a href='/userProfileHistory'>user profile</a> page to view any upcoming bookings.";
                noMoreEvents.appendChild(noMoreEventsText);
                searchResults.appendChild(noMoreEvents);
                eventList.style.display = "none";
                document.getElementById("event").querySelector("h5").textContent = "No Events";
                eventList.disabled = true;
                goBtn.disabled = true;
                cityInput.disabled = true;
                cityInput.classList.add("disabled");
                checkInDateInput.disabled = true;
                checkInDateInput.classList.add("disabled");
                checkOutDateInput.disabled = true;
                checkOutDateInput.classList.add("disabled");
                return;
            }

            for (let i = 0; i < data.length; i++)
            {
                var event = $ce("option");
                event.value = data[i].eventID;
                event.textContent = data[i].eventName;
                event.dataset.startDate = (data[i].startDate + "").substring(0, (data[i].startDate + "").indexOf("T"));
                event.dataset.endDate = (data[i].endDate + "").substring(0, (data[i].endDate + "").indexOf("T"));
                event.dataset.eventLocation = data[i].eventLocation;
                event.dataset.organizationId = data[i].organizationID;
                event.dataset.organizationName = data[i].organizationName;
                event.dataset.eventCity = data[i].cityCode;

                eventList.appendChild(event);
            }

            const urlParams = new URLSearchParams(window.location.search);
            var startingEvent = urlParams.get('startingEvent');
            if (startingEvent)
            {
                eventSwitch(startingEvent);
            }
            else
            {
                eventSwitch();
            }
        });
}

function eventSwitch (eventID)
{
    if (eventID)
    {
        for (let i = 0; i < eventList.options.length; i++)
        {
            if (eventList.options[i].value == eventID)
            {
                eventList.selectedIndex = i;
                break;
            }
        }
    }

    // Clear hotel listings
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    var selectedOption = eventList.options[eventList.selectedIndex];

    // Populate Selected Event Info
    // Event Name
    // Org Name
    // Event location
    // Event Dates

    selectedEventName.textContent = selectedOption.textContent;
    selectedEventOrg.textContent = "Organization: " + selectedOption.dataset.organizationName;
    selectedEventLocation.textContent = "Location: " + selectedOption.dataset.eventLocation;
    const initialStartDate = new Date(selectedOption.dataset.startDate);
    const startDate = new Date(initialStartDate.valueOf() + initialStartDate.getTimezoneOffset() * 60 * 1000);
    const initialEndDate = new Date(selectedOption.dataset.endDate);
    const endDate = new Date(initialEndDate.valueOf() + initialEndDate.getTimezoneOffset() * 60 * 1000);
    selectedEventDates.textContent = "Date: " +  dateFns.format(startDate, 'MM/dd/yyyy') + " - " + dateFns.format(endDate, 'MM/dd/yyyy');

    // Fill in Start and End Dates
    checkInDateInput.value = selectedOption.dataset.startDate;
    checkOutDateInput.value = selectedOption.dataset.endDate;
    // FILL IN DESTINATION CITY
    stayingCityInput.value = selectedOption.dataset.eventCity;
}

// Add for focus
$(function(){ 
    $('#staying-city').autocomplete({ 
       source: function(req, res){ 
        console.log(req);
          $.ajax({ 
             url:"amadeus-city-search/", 
             dataType: "json", 
             type:"GET", 
             data:req, 
             success: function (data){
                res($.map(data, function(val, i) { 
                    var addressLabel = "";
                    if (val.address.countryCode == "US")
                    {
                        addressLabel = capitalizeWords(val.address.cityName) + ", " + val.address.stateCode + ", " + val.address.countryCode + ` (${val.iataCode})`;
                    }
                    else
                    {
                        addressLabel = capitalizeWords(val.address.cityName) + ", " + val.address.countryCode + ` (${val.iataCode})`;
                    }
                   return { 
                     label: addressLabel, 
                     value: val.iataCode 
                   } 
                })); 
              },  
             error: function(err){ 
               console.log(err.status); 
             } 
          }); 
       }         
    }); 
  }); 

async function hotelSearch ()
{
    goBtn.disabled = true;
    eventList.disabled = true;

    searchResultsLoader();

    const cityCode = stayingCityInput.value;
    fetch("/amadeus-hotel-search?cityCode=" + cityCode)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        hotelData = data;
        if (data.err)
        {
            searchResults.removeChild(searchResults.lastElementChild);
            const searchErrorMessage = $ce("div");
            searchErrorMessage.textContent = "There was a problem searching hotels. Please check your search criteria and retry.";
            searchResults.appendChild(searchErrorMessage);
            goBtn.disabled = false;
            eventList.disabled = false;
        }
        console.log(hotelData);
        populateHotelsHTML();
    });
}

async function hotelOffers (index)
{
    // Clear Loader
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    searchResultsLoader();

    const currentHotel = hotelData[index];
    if (hotelData[index].formattedAddress != "N/A")
    {
        currentAddress = hotelData[index].formattedAddress;
    }
    else
    {
        currentAddress = hotelData[index].geoCode.latitude + ", " + hotelData[index].geoCode.longitude;
    }
    const checkInDate = checkInDateInput.value;
    const checkOutDate = checkOutDateInput.value;
    fetch (`/amadeus-hotel-offers?hotelIds=` + currentHotel.hotelId + "&checkInDate=" + checkInDate + "&checkOutDate=" + checkOutDate)
    .then(response => response.json())
    .then (data => {
        console.log(data);
        if ("err" in data)
        {
            let child = searchResults.lastElementChild;
            while (child)
            {
                searchResults.removeChild(child);
                child = searchResults.lastElementChild;
            }
            
            createGoBackBtn();

            const searchErrorMessage = $ce("div");
            searchErrorMessage.classList.add("search-error-message");
            searchErrorMessage.textContent = "There are no offers for your selected hotel. Please chose another option.";
            searchResults.appendChild(searchErrorMessage);
            goBtn.disabled = false;
            eventList.disabled = false;
            return;
        }
        data = data[0];
        hotelOfferData = data.offers;
        hotelInfoData = data.hotel;
        console.log(hotelOfferData);
        populateHotelOffersHTML();
    });
}

async function requestHotelOfferBooking (index)
{
    var selectedOffer = hotelOfferData[index];
    const hotelName = hotelInfoData.name;
    const eventName = eventList.options[eventList.selectedIndex].textContent;
    const eventID = eventList.value;

    fullPageLoader(true);
    fetch("/amadeus-hotel-offer-confirm?offerId=" + selectedOffer.id)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if (data.err)
        {
            if (data.err)
            {
                fullPageLoader(false);
                let child = searchResults.lastElementChild;
                while (child)
                {
                    searchResults.removeChild(child);
                    child = searchResults.lastElementChild;
                }
                createGoBackBtn();
                const searchErrorMessage = $ce("div");
                searchErrorMessage.classList.add("search-error-message");
                searchErrorMessage.textContent = "There was a problem confirming your hotel offer. Please try searching for a different offer";
                searchResults.appendChild(searchErrorMessage);
                eventList.disabled = false;
                return;
            }
        }
        fetch("/amadeus-request-hotel-booking", {
            method: 'POST',
            body: JSON.stringify({
                eventID: eventID,
                eventName: eventName,
                offer: selectedOffer,
                hotelName: hotelName
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            fullPageLoader(false);
            if (data.err)
            {
                let child = searchResults.lastElementChild;
                while (child)
                {
                    searchResults.removeChild(child);
                    child = searchResults.lastElementChild;
                }
                createGoBackBtn();
                const searchErrorMessage = $ce("div");
                searchErrorMessage.classList.add("search-error-message");
                searchErrorMessage.textContent = "There was a problem confirming your hotel offer. Please try searching for a different offer";
                searchResults.appendChild(searchErrorMessage);
                eventList.disabled = false;
                return;
            }
            else
            {
                window.location.reload();
            }
        });
    });
}

function populateHotelsHTML ()
{
    // Clear Loader
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    if (!hotelData || hotelData.length === 0)
    {
        searchResults.lastElementChild ? searchResults.removeChild(searchResults.lastElementChild) : undefined;
        const searchErrorMessage = $ce("div");
        searchErrorMessage.textContent = "There was a problem searching hotels. Please check your search criteria and retry.";
        searchResults.appendChild(searchErrorMessage);
        goBtn.disabled = false;
        eventList.disabled = false;
        return;
    }

    for (let i = 0; i < hotelData.length; i++)
    {
        var hotelListing = $ce("div");
        hotelListing.id = "hotel-listing-" + i;
        hotelListing.className = "hotel-listing";

        var hotelName = $ce("div");
        hotelName.textContent = capitalizeWords(hotelData[i].name);
        hotelListing.appendChild(hotelName);

        if (hotelData[i].formattedAddress != "N/A")
        {
            var formattedAddress = $ce("div");
            formattedAddress.className = "formatted-address";
            formattedAddress.textContent = hotelData[i].formattedAddress;
            hotelListing.appendChild(formattedAddress);
        }
        else
        {
            var latitudeAndLongitude = $ce("div");
            latitudeAndLongitude.textContent = hotelData[i].geoCode.latitude + ", " + hotelData[i].geoCode.longitude;
            hotelListing.appendChild(latitudeAndLongitude);
        }
            
        var viewOffersBtn = $ce("button");
        viewOffersBtn.addEventListener("click", function () {
            hotelOffers(i);
        });
        viewOffersBtn.textContent = "View Offers";
        hotelListing.appendChild(viewOffersBtn);

        searchResults.appendChild(hotelListing);
    }
    
    goBtn.disabled = false;
    eventList.disabled = false;
}

function populateHotelOffersHTML ()
{
    // Clear Loader
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    createGoBackBtn();

    if (hotelOfferData.length === 0)
    {
        const searchErrorMessage = $ce("div");
        searchErrorMessage.classList.add("search-error-message");
        searchErrorMessage.textContent = "There are no offers for your selected hotel. Please chose another option.";
        searchResults.appendChild(searchErrorMessage);
        goBtn.disabled = false;
        eventList.disabled = false;
    }

    for (let i = 0; i < hotelOfferData.length; i++)
    {
        var offerListing = createHotelOfferListing(hotelOfferData[i], i);
        searchResults.appendChild(offerListing);
    }

    goBtn.disabled = false;
    eventList.disabled = false;
}

function createHotelOfferListing (offer, index)
{
    const hotelDiv = $ce("div");
    hotelDiv.className = "hotel-offer-listing";
    hotelDiv.id = "hotel-offer-listing-" + index;

    // Hotel Info
    // Hotel Name
    const hotelInfo = $ce("div");
    const hotelName = $ce("div");
    hotelName.textContent = capitalizeWords(hotelInfoData.name) ? hotelInfoData.name : "Unknown Hotel";
    hotelInfo.appendChild(hotelName);

    // Location
    const hotelLocation = $ce("div");
    hotelLocation.textContent = currentAddress;
    hotelInfo.appendChild(hotelLocation);

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

    // Book Button
    var bookButton = $ce("button");
    bookButton.className = "request-booking-btn";
    bookButton.textContent = "Request Booking";
    bookButton.addEventListener("click", function () {
        requestHotelOfferBooking(index);
    });
    
    hotelDiv.appendChild(bookButton);

    return hotelDiv;
}

function searchResultsLoader ()
{
    // Clear children & display loader
    const searchResults = document.getElementById("searchResults");
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }
    const fullLoader = document.createElement("div");
    fullLoader.className = "fullLoader";
    const loader = document.createElement("div");
    loader.className = "loader";
    fullLoader.appendChild(loader);
    const loaderText = document.createElement("div");
    loaderText.className = "loaderText";
    loaderText.textContent = "Gathering Hotels";
    fullLoader.appendChild(loaderText);
    searchResults.appendChild(fullLoader);
}

function fullPageLoader (toggle)
{
    const fullPageLoader = document.getElementById("full-page-loader");

    if (toggle)
    {
        fullPageLoader.style.display = "flex";
        const fullLoader = document.createElement("div");
        fullLoader.className = "fullLoader";
        const loader = document.createElement("div");
        loader.className = "loader";
        fullLoader.appendChild(loader);
        const loaderText = document.createElement("div");
        loaderText.className = "loaderText";
        loaderText.style.color = "white";
        loaderText.textContent = "Loading...";
        fullLoader.appendChild(loaderText);
        fullPageLoader.appendChild(fullLoader);
    }
    else
    {
        fullPageLoader.style.display = "";
        fullPageLoader.removeChild(fullPageLoader.lastElementChild); // Check this
    }
}

function createGoBackBtn ()
{
    const goBackBtn = $ce("button");
    goBackBtn.className = "go-back-btn";
    goBackBtn.textContent = "Go Back";
    goBackBtn.addEventListener("click", function () {
        populateHotelsHTML();
    }); 
    searchResults.appendChild(goBackBtn);
}

function openNotificationPopup (text, action)
{
    if (notificationPopup.querySelector("flightListing"))
    {
        document.getElementById("notification-popup-inside").querySelector("div").removeChild(notificationPopup.querySelector("flightListing"));
    }
    notificationPopup.style.display = "flex";

    const notificationText = document.getElementById("notification-message");
    notificationText.innerHTML = text;

    const notificationButton = notificationPopup.querySelector("button");
    var newNotificationButton = notificationButton.cloneNode(true);
    notificationButton.parentNode.replaceChild(newNotificationButton, notificationButton);

    if (action === "reload")
    {
        console.log(notificationPopup.querySelector("button"));
        newNotificationButton.addEventListener("click", function () { window.location.href = "/flightSearch" });
    }
    else if (action === "confirmDuffel")
    {
        // ADD A CANCEL HERE AND REMOVE THIS DUFFEL LISTING
        const duffelListing = createDuffelListing(confirmedOffer.data, -29);
        duffelListing.querySelector(".request-booking-btn").style.visibility = "hidden";
        newNotificationButton.parentNode.insertBefore(duffelListing, newNotificationButton);
        newNotificationButton.textContent = "Confirm";
        newNotificationButton.addEventListener("click", function () {
            closeNotificationPopup();
            fullPageLoader(true);
            duffelCreateOrder();
        });
    }
    else if (action === "confirmAmadeus")
    {
        // DISPLAY FLIGHT INFO
        const amadeusListing = createAmadeusListing(confirmedOffer.data.flightOffers[0], -30);
        amadeusListing.querySelector(".request-booking-btn").style.visibility = "hidden";
        newNotificationButton.parentNode.insertBefore(amadeusListing, newNotificationButton);
        newNotificationButton.textContent = "Confirm";
        newNotificationButton.addEventListener("click", function () {
            closeNotificationPopup();
            fullPageLoader(true);
            amadeusCreateOrder();
        });
    }
}

function closeNotificationPopup ()
{
    notificationPopup.style.display = "";
}

document.addEventListener('DOMContentLoaded', function () {
    // Disable everything until this is finished?
    userInfo();

    if (goBtn)
    {
        goBtn.addEventListener("click", function () {
            // hotelSearch();
        });
    }

    if (checkInDateInput)
    {

    }

    if (checkOutDateInput)
    {

    }
});