// DOM Elements
const selectedEventInfo = document.getElementById("selected-event-info");
const selectedEventName = document.getElementById("selected-event-name");
const selectedEventOrg = document.getElementById("selected-event-org");
const selectedEventOther = document.getElementById("selected-event-other");
const selectedEventLocation = document.getElementById("selected-event-location");
const selectedEventDates = document.getElementById("selected-event-dates");

const generalWarningMessage = document.getElementById("general-warning-message");
const airportWarningMessage = document.getElementById("airport-warning-msg");
const depWarningMessage = document.getElementById("dep-warning-msg");
const arrWarningMessage = document.getElementById("arr-warning-msg");
const tierWarningMessage = document.getElementById("tier-warning-msg");

const notificationPopup = document.getElementById("notification-popup");
const notificationPopupInside = document.getElementById("notification-popup-inside");
const ancillariesContainer = document.getElementById("duffel-ancillaries-container");

var flightData = {};
flightData['offers'] = [];
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

async function userInfo ()
{
    fetch(`/user-passenger-info`)
    .then(response => response.json())
    .then(data => {
        if (data.err)
        {
            window.location.href = "/signIn?prev=flightSearch";
        }
        passengerInfo = data;
        console.log(passengerInfo);
        populateEvents();
    });
}

function toggleVisibility(menuId) {
    var filterMenu = document.getElementById("filterMenu");
    var sortingMenu = document.getElementById("sortingMenu");

    // Close other menu when opening another one
    if (menuId === "filterMenu") {
        sortingMenu.style.display = "none";
    } else if (menuId === "sortingMenu") {
        filterMenu.style.display = "none";
    }

    var menu = document.getElementById(menuId);
    var isVisible = menu.style.display === "block";

    // Toggle visibility
    menu.style.display = isVisible ? "none" : "block";

    // Add event listener to close menu when clicking outside
    if (!isVisible) {
        document.body.classList.add("active-menu");
        document.addEventListener("click", function closeMenu(event) {
            if (!menu.contains(event.target) && !event.target.matches(".filters-sorting-container button")) {
                menu.style.display = "none";
                document.body.classList.remove("active-menu");
                document.removeEventListener("click", closeMenu);
            }
        });
    }
}

async function populateEvents ()
{
    const eventList = document.getElementById("eventList");

    fetch("/get-current-user-events")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                window.location.href = "/signIn?prev=flightSearch";
            }
            console.log(data.length);
            if (data.length == 0)
            {
                const noMoreEvents = $ce("div");
                const noMoreEventsHeader = $ce("h3");
                const noMoreEventsText = $ce("p");
                noMoreEventsHeader.appendChild($ctn("No Unbooked Events"));
                noMoreEvents.appendChild(noMoreEventsHeader);
                noMoreEventsText.innerHTML = "You have no more events to book for. Please visit your <a href='/userProfileHistory'>user profile</a> page to view any upcoming flights.";
                noMoreEvents.appendChild(noMoreEventsText);
                document.getElementById("searchResults").appendChild(noMoreEvents);
                eventList.style.display = "none";
                document.getElementById("event").querySelector("h5").textContent = "No Events";
                document.getElementById("go-flight-search").disabled = true;
                document.getElementById("departureCity").disabled = true;
                document.getElementById("departureCity").classList.add("disabled");
                document.getElementById("arrivalCity").disabled = true;
                document.getElementById("arrivalCity").classList.add("disabled");
                document.getElementById("departureDate").disabled = true;
                document.getElementById("departureDate").classList.add("disabled");
                document.getElementById("returnDate").disabled = true;
                document.getElementById("returnDate").classList.add("disabled");
                document.getElementById("flightClass").disabled = true;
                document.getElementById("flightClass").classList.add("disabled");
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
                event.dataset.checkedBags = data[i].checkedBags > data[i].groupCheckedBags ? data[i].checkedBags : data[i].groupCheckedBags;
                event.dataset.layoverMax = data[i].layoverMax > data[i].groupMaxLayovers ? data[i].layoverMax : data[i].groupMaxLayovers;
                event.dataset.dateTimeBuffer = data[i].dateTimeBuffer > data[i].groupDateTimeBuffer ? data[i].dateTimeBuffer : data[i].groupDateTimeBuffer;
                console.log("First Threshold", (data[i].groupFirstThreshold / 100 + 1));
                event.dataset.firstThreshold = data[i].firstThreshold * (data[i].groupFirstThreshold / 100 + 1);
                event.dataset.organizationId = data[i].organizationID;
                event.dataset.organizationName = data[i].organizationName;
                event.dataset.flightTier = data[i].maxFlightTier > data[i].groupFlightTierID ? data[i].maxFlightTier : data[i].groupFlightTierID;
                event.dataset.eventAirports = data[i].eventAirports;

                eventList.appendChild(event);
            }

            document.getElementById("departureCity").value = passengerInfo.preferredAirport;

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
    const eventList = document.getElementById("eventList");
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

    // Clear flight listings
    const searchResults = document.getElementById("searchResults");
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
    
    var startDate = "";
    var endDate = "";
    const baseStartDate = new Date(selectedOption.dataset.startDate);
    if (selectedOption.dataset.startDate.includes("T"))
    {
        startDate = new Date(baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000);
        // startDate = new Date( (new Date(selectedOption.dataset.startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
    }
    else
    {
        startDate = new Date(baseStartDate.getTime() + baseStartDate.getTimezoneOffset() * 60 * 1000);
        // startDate = new Date( (new Date(data[i].startDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );startDate = new Date(data[i].startDate + "T00:00:00.000");
    }
    const baseEndDate = new Date(selectedOption.dataset.endDate);
    if (selectedOption.dataset.endDate.includes("T"))
    {
        endDate = new Date(baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000);
        // endDate = new Date( (new Date(selectedOption.dataset.endDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate);
    }
    else
    {
        endDate = new Date(baseEndDate.getTime() + baseEndDate.getTimezoneOffset() * 60 * 1000);
        // endDate = new Date( (new Date(selectedOption.dataset.endDate)).getTime() + baseDate.getTimezoneOffset() * 60 * 1000 );
        // endDate = new Date(data[i].endDate + "T00:00:00.000");
    }
    // const initialStartDate = new Date(selectedOption.dataset.startDate);
    // const startDate = new Date(initialStartDate.valueOf() + initialStartDate.getTimezoneOffset() * 60 * 1000);
    // const initialEndDate = new Date(selectedOption.dataset.endDate);
    // const endDate = new Date(initialEndDate.valueOf() + initialEndDate.getTimezoneOffset() * 60 * 1000);
    selectedEventDates.textContent = "Date: " +  dateFns.format(startDate, 'MM/dd/yyyy') + " - " + dateFns.format(endDate, 'MM/dd/yyyy');

    // Fill in Start and End Dates
    document.getElementById("departureDate").value = (selectedOption.dataset.startDate);
    document.getElementById("returnDate").value = (selectedOption.dataset.endDate);
    document.getElementById("arrivalCity").value = "";
    var eventAirports = selectedOption.dataset.eventAirports;
    eventAirports = eventAirports.split("&&");
    for (let i = 0; i < eventAirports.length; i++)
    {
        if (eventAirports[i].indexOf("true") != -1)
        {
            document.getElementById("arrivalCity").value = eventAirports[i].substring(0, eventAirports[i].indexOf("|"));
        }
    }

    generalWarningMessage.style.visibility = "hidden";
}

async function airportSearchCity (input)
{
    var city = input.value;
    console.log(input.value);

    fetch("/city-and-airport-search/" + city)
        .then(response => response.json())
        .then(data => console.log(data));
}

// Add for focus
$(function(){ 
    $('#departureCity').autocomplete({ 
       source: function(req, res){ 
          $.ajax({ 
             url:"airport-search/", 
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

  $(function(){ 
    $('#arrivalCity').autocomplete({ 
       source: function(req, res){ 
          $.ajax({ 
             url:"airport-search/", 
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

async function flightSearch ()
{
    const eventList = document.getElementById("eventList");
    console.log("Searching");
    const goBtn = document.getElementById("go-flight-search");
    goBtn.disabled = true;
    eventList.disabled = true;

    // Reset Flight Data
    flightData = {};
    flightData['offers'] = [];
    flightDataHTML = [];

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
    loaderText.textContent = "Gathering Flights";
    fullLoader.appendChild(loaderText);
    searchResults.appendChild(fullLoader);

    // Get User Defined Flight Parameters
    var departureCity = document.getElementById("departureCity").value;
    var arrivalCity = document.getElementById("arrivalCity").value;
    var departureDate = document.getElementById("departureDate").value;
    var returnDate = document.getElementById("returnDate").value;
    var flightClass = document.getElementById("flightClass").value;
    var selectedOption = eventList.options[eventList.selectedIndex];
    var maxConnections = selectedOption.dataset.layoverMax;

    var getString = "originCode=" + departureCity + "&destinationCode=" + arrivalCity + "&dateOfDeparture=" + departureDate + "&dateOfReturn=" + returnDate + "&flightClass=" + flightClass + "&maxConnections=" + maxConnections;
    console.log("http://localhost:8000/amadeus-search?originCode=" + departureCity + "&destinationCode=" + arrivalCity + "&dateOfDeparture=" + departureDate + "&dateOfReturn=" + returnDate + "&flightClass=" + flightClass);

    // Fetch to Node.js Server for Duffel
    fetch("/duffel-search?" + getString)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                searchResults.removeChild(searchResults.lastElementChild);
                const searchErrorMessage = $ce("div");
                searchErrorMessage.textContent = "There was a problem searching flights. Please check your search criteria and retry.";
                searchResults.appendChild(searchErrorMessage);
                goBtn.disabled = false;
                eventList.disabled = false;
            }

            for (let i = 0; i < data.offers.offers.length; i++)
            {
                data.offers.offers[i]['client_key'] = data.client_key;
                data.offers.offers[i]['centric_api_tag'] = "duffel";
                flightData['offers'].push(data.offers.offers[i]);
            }
            console.log(data);

            //Fetch to Node JS Server for Amadeus
            fetch("/amadeus-search?" + getString)
            .then(response => response.json())
            .then(data => 
                    {
                        console.log(data);
                        if (data.response) // This is an error
                        {
                            searchResults.removeChild(searchResults.lastElementChild);
                            const searchErrorMessage = $ce("div");
                            searchErrorMessage.textContent = "There was a problem searching flights. Please check your search criteria and retry.";
                            searchResults.appendChild(searchErrorMessage);
                            goBtn.disabled = false;
                            eventList.disabled = false;
                        }
                        for (let i = 0; i < data.data.length; i ++)
                        {
                            data.data[i]['centric_api_tag'] = "amadeus";
                            // for (let j = 0; j < data.data[i].travelerPricings[0].fareDetailsBySegment.length; j++)
                            // {
                            //     data.data[i].travelerPricings[0].fareDetailsBySegment[j].includedCheckedBags.quantity = 1;
                            // }
                            flightData['offers'].push(data.data[i]);
                        }
                        console.log(flightData);
                        if (flightData.length === 0)
                        {
                            searchResults.removeChild(searchResults.lastElementChild);
                            const searchErrorMessage = $ce("div");
                            searchErrorMessage.textContent = "Unfortunately, there are no results for your search. Please revise your search criteria and retry.";
                            searchResults.appendChild(searchErrorMessage);
                            goBtn.disabled = false;
                            eventList.disabled = false;
                        }
                        else
                        {
                            populateHTML();
                        }
                    });
        });
    // Populate Search Results in HTML
}

function populateHTML ()
{
    // Get Event Parameters
    const eventList = document.getElementById("eventList");
    const selectedEvent = eventList.options[eventList.selectedIndex];
    const firstThreshold = parseFloat(selectedEvent.dataset.firstThreshold);
    const checkedBags = selectedEvent.dataset.checkedBags;
    const layoverMax = selectedEvent.dataset.layoverMax;

    const searchResults = document.getElementById("searchResults");

    // Clear Loader
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    // Reset Available Airlines
    availableAirlines = {};

    for (let i = 0; i < flightData.offers.length; i++)
    {
        if (flightData.offers[i]["centric_api_tag"] == "duffel")
        {
            var flightDiv = createDuffelListing(flightData.offers[i], i);
            flightDiv = generateOtherWarnings(flightDiv, firstThreshold, checkedBags, layoverMax);
            flightDataHTML.push(flightDiv);
            searchResults.appendChild(flightDiv);
        }
        else if (flightData.offers[i]["centric_api_tag"] == "amadeus")
        {
            var flightDiv = createAmadeusListing(flightData.offers[i], i);
            flightDiv = generateOtherWarnings(flightDiv, firstThreshold, checkedBags, layoverMax);
            flightDataHTML.push(flightDiv);
            searchResults.appendChild(flightDiv);
        }
    }

    // Populate Filters
    
    // Airline Filter
    const airlineFilter = document.getElementById("airlineList");
    child = airlineFilter.lastElementChild;
    while (child)
    {
        airlineFilter.removeChild(child);
        child = airlineFilter.lastElementChild;
    }

    for (const [airline, count] of Object.entries(availableAirlines))
    {
        var label = document.createElement("label");
        label.setAttribute("for", airline);
        label.textContent = airline + " (" + count + ")";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.name = "airlineSelected";
        input.value = airline;
        label.appendChild(input);

        airlineFilter.appendChild(label);
        airlineFilter.appendChild($ce("br"));
    }

    const goBtn = document.getElementById("go-flight-search");
    goBtn.disabled = false;
    eventList.disabled = false;
}

function generateSearchParameterWarnings ()
{
    const airportWarning = generateAirportWarnings();
    const dateWarnings = generateDateWarnings();
    const arrDateWarning = dateWarnings.arrWarning;
    const depDateWarning = dateWarnings.depWarning;
    const flightTierWarning = generateFlightTierWarnings();
    
    if (airportWarning || arrDateWarning || depDateWarning || flightTierWarning)
    {
        console.log("GENERATING WARNINGS");
        generalWarningMessage.style.visibility = "visible";
        airportWarning ? showError(airportWarning, 'airport-warning') : clearErrorFor('airport-warning');
        // airportWarning ? airportWarningMessage.style.display = "" : airportWarningMessage.style.display = "none";
        arrDateWarning ? showError(arrDateWarning, 'arr-date-warning') : clearErrorFor('arr-date-warning');
        //arrDateWarning ? arrWarningMessage.style.display = "" : arrWarningMessage.style.display = "none";
        depDateWarning ? showError(depDateWarning, 'dep-date-warning') : clearErrorFor('dep-date-warning');
        // depDateWarning ? depWarningMessage.style.display = "" : depWarningMessage.style.display = "none";
        flightTierWarning ? showError(flightTierWarning, 'flight-tier-warning') : clearErrorFor('flight-tier-warning');
        // flightTierWarning ? tierWarningMessage.style.display = "" : tierWarningMessage.style.display = "none";
    }
    else
    {
        generalWarningMessage.style.visibility = "hidden";
    }

    function showError(message, inputElement = null) {
        // First check if this error is already showing
        const errorContainer = generalWarningMessage.querySelector("span");
        const existingErrors = errorContainer.querySelectorAll('.error-message');
        for (let error of existingErrors) {
            if (error.textContent === message) {
                return; // Error already showing
            }
        }

        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        // errorElement.style.textAlign = 'center'; // Center align the text
                
        generalWarningMessage.style.visibility = "visible";
        errorContainer.appendChild(errorElement);
    }

    function clearErrorFor(elementId) {
        const errorContainer = generalWarningMessage.querySelector("span");
        const errors = errorContainer.querySelectorAll('.error-message');
        errors.forEach(error => {
            if (error.dataset.for === elementId) {
                error.remove();
            }
        });
        
        const inputElement = document.getElementById(elementId);
        if (inputElement) {
            inputElement.classList.remove('input-error');
        }
    }

    function clearErrors() {
        const errorContainer = generalWarningMessage.querySelector("span");
        errorContainer.innerHTML = '';
        [departureCityInput, arrivalCityInput, departureDateInput, returnDateInput].forEach(input => {
            input.classList.remove('input-error');
        });
    }
}

function generateAirportWarnings ()
{
    // Allowed Airports
    const eventList = document.getElementById("eventList");
    const selectedEvent = eventList.options[eventList.selectedIndex];
    var eventAirports = selectedEvent.dataset.eventAirports; // PHX|true&&LAX|false&&BWI|false
    eventAirports = eventAirports.split("&&"); // PHX|true, LAX|false, BWI|false
    if (eventAirports[0] === 'null')
    {
        return;
    }

    // Selected Arrival Airport
    const arrAirport = document.getElementById("arrivalCity").value;
    var allowed = false;
    
    for (let i = 0; i < eventAirports.length; i++)
    {
        if (eventAirports[i].indexOf(arrAirport) != -1)
        {
            allowed = true;
        }
    }
    
    if (!allowed)
    {
        //airportWarningMessage.textContent = "Arrival airport not permitted.";
        //console.log("Allowed Airport", allowed);
        return "Arrival airport not permitted.";
    }
    else
    {
        //airportWarningMessage.textContent = "";
        return false;
    }
}

function generateFlightTierWarnings ()
{
    // Flight Tier
    const eventList = document.getElementById("eventList");
    const selectedEvent = eventList.options[eventList.selectedIndex];
    const eventFlightTier = selectedEvent.dataset.flightTier;

    // Selected Flight Tier
    const flightClass = document.getElementById("flightClass").value;
    
    if (flightClass > eventFlightTier)
    {
        // tierWarningMessage.textContent = "Flight class out of range.";
        return "Flight class out of range.";
    }
    else
    {
        // tierWarningMessage.textContent = "";
        return false;
    }
}

function generateDateWarnings ()
{    
    // Event Warnings
    const eventList = document.getElementById("eventList");
    const selectedEvent = eventList.options[eventList.selectedIndex];
    const eventStartDate = new Date (selectedEvent.dataset.startDate);
    const eventEndDate = new Date (selectedEvent.dataset.endDate);

    var arrWarning = false;
    var depWarning = false;

    // Flight Dates Selected
    const departureDate = new Date (document.getElementById("departureDate").value);
    const returnDate = new Date (document.getElementById("returnDate").value);
    
    const earlyArrival = ((departureDate - eventStartDate) / (1000 * 60 * 60 * 24)) + parseInt(selectedEvent.dataset.dateTimeBuffer);
    // Check if flight is a late arrival
    if (departureDate - eventStartDate > 0)
    {
        // arrWarningMessage.textContent = "Late arrival for event.";
        arrWarning = "Late arrival for event.";
    }
    // Check if flight is an arrival arrival
    else if (earlyArrival < 0)
    {
        // arrWarningMessage.textContent = "Early arrival for event.";
        arrWarning = "Early arrival for event.";
    }
    //Check if flight is an early departure
    const lateDeparture = ((returnDate - eventEndDate) / (1000 * 60 * 60 * 24)) - parseInt(selectedEvent.dataset.dateTimeBuffer);
    if (lateDeparture > 0)
    {
        // depWarningMessage.textContent = "Late departure for event.";
        depWarning = "Late departure for event.";
    }    
    else if (returnDate - eventEndDate < 0)
    {
        // depWarningMessage.textContent = "Early departure for event.";
        depWarning = "Early departure for event.";
    }

    return { arrWarning: arrWarning, depWarning: depWarning };
}

/**
 * 
 * @param {Element} flightDiv 
 * @param {*} threshold 
 * @param {*} bags 
 * @param {*} layovers 
 * @returns 
 */
function generateOtherWarnings (flightDiv, threshold, bags, layovers)
{
    const flightWarning = flightDiv.querySelector(".flightWarning");
    const flightWarningText = flightWarning.querySelector(".centric-tooltip-text");

    const flightPrice = parseFloat(flightDiv.dataset.price);
    if (flightPrice > threshold)
    {
        const priceOver = $ce("div");
        priceOver.textContent = "Price over threshold.";
        flightWarningText.appendChild(priceOver);
        flightWarning.style.visibility = "visible";
    }
    const outgoingConnections = flightDiv.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length - 1;
    const returningConnections = flightDiv.querySelector(".returningDiv").querySelectorAll(".flightLeg").length - 1;
    if (outgoingConnections > layovers || returningConnections > layovers)
    {
        const stopsOver = $ce("div");
        stopsOver.textContent = "Stops exceeded.";
        flightWarningText.appendChild(stopsOver);
        flightWarning.style.visibility = "visible";
    }

    return flightDiv;
}

function createDuffelListing (offer, index)
{
    var flightDiv = document.createElement("div");
    flightDiv.className = "flightListing";
    flightDiv.id = "flight-" + index;

    // Airline Image
    var airlineImage = document.createElement("img");
    airlineImage.src = offer.owner.logo_symbol_url;
    airlineImage.alt = offer.owner.name;
    airlineImage.className = "airline-img";
    
    availableAirlines[offer.owner.iata_code] = (availableAirlines[offer.owner.iata_code] || 0) + 1; // Add to available airlines set
    flightDiv.dataset.availableAirlines = "";
    flightDiv.dataset.availableAirlines += offer.owner.iata_code + "|";

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
    price.className = "price";
    priceString = "";
    // Handle Currencies
    if (offer.tax_currency == "USD")
    {
        // priceString += "$";
    }
    else if (offer.price.currency == "EUR")
    {
        // priceString += "€";
    }

    const selectedEvent = eventList.options[eventList.selectedIndex];
    const firstThreshold = parseFloat(selectedEvent.dataset.firstThreshold);
    var priceDiffContent = parseFloat(offer.total_amount) - firstThreshold;
    priceDiffContent = Math.round(priceDiffContent * 100) / 100;

    // priceString += offer.total_amount;
    var flightPrice = $ce("div");
    flightPrice.className = "flight-price";
    flightPrice.appendChild($ctn(moneyFormatter.format(offer.total_amount)));
    price.appendChild(flightPrice);
    var priceDiff = $ce("div");
    priceDiff.className = "price-diff";
    priceDiffContent > 0 ? priceDiff.textContent = "+" + moneyFormatter.format(priceDiffContent) : priceDiff.textContent = "";
    price.appendChild(priceDiff);

    flightDiv.dataset.price = offer.total_amount;    
    flightDiv.appendChild(price);

    // Create Empty Warning Div
    const flightWarning = $ce("div");
    flightWarning.className = "centric-tooltip flightWarning";
    flightWarning.style.visibility = "hidden";
    flightWarning.appendChild(createHazardSVG());
    const tooltipText = $ce("span");
    tooltipText.className = "centric-tooltip-text hover-left";
    flightWarning.appendChild(tooltipText);
    flightDiv.appendChild(flightWarning);

    // Book Button
    var bookButton = $ce("button");
    bookButton.className = "request-booking-btn";
    // bookButton.addEventListener("click", duffelCreateOffer);
    bookButton.addEventListener("click", openAncillaryPopup);
    bookButton.appendChild($ctn("Request Booking"));
    flightDiv.appendChild(bookButton);

    // Ancillary Button
    // var ancillaries = $ce("button");
    // ancillaries.addEventListener("click", openAncillaryPopup);
    // ancillaries.appendChild($ctn("Add Ancillaries"));
    // flightDiv.appendChild(ancillaries);

    return flightDiv;
}

function createAmadeusListing (offer, index)
{
    var flightDiv = $ce("div");
    flightDiv.className = "flightListing";
    flightDiv.id = "flight-" + index;

    if (index == -30)
    {
        console.log(offer);
    }

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
    var localAvailableAirlines = new Set();
    flightDiv.dataset.availableAirlines = "";

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
    // Won't display duration if it is on the confirmation page
    if (index != -30)
    {
        var outgoingDuration = $ce("div");
        outgoingDuration.className = "duration";
        var outgoingDurationContent = (outgoingInfo.duration).substring((outgoingInfo.duration).indexOf("PT") + 2).toLowerCase();
        outgoingDurationContent.indexOf("h") ? outgoingDurationContent = outgoingDurationContent.substring(0, outgoingDurationContent.indexOf("h") + 1) + " " + outgoingDurationContent.substring(outgoingDurationContent.indexOf("h") + 1) : outgoingDurationContent;
        outgoingDuration.appendChild($ctn(outgoingDurationContent));
        outgoingDiv.appendChild(outgoingDuration);
    }

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
        
        localAvailableAirlines.add(airline); // Add to available airlines set
        flightDiv.dataset.availableAirlines += airline + "|";

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
    // Won't display if on the confirmation page
    if (index != -30)
    {
        var returningDuration = $ce("div");
        returningDuration.className = "duration";
        var returningDurationContent = (returningInfo.duration).substring((returningInfo.duration).indexOf("PT") + 2).toLowerCase();
        returningDurationContent.indexOf("h") ? returningDurationContent = returningDurationContent.substring(0, returningDurationContent.indexOf("h") + 1) + " " + returningDurationContent.substring(returningDurationContent.indexOf("h") + 1) : returningDurationContent;
        returningDuration.appendChild($ctn(returningDurationContent));
        returningDiv.appendChild(returningDuration);
    }
    
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
        
        localAvailableAirlines.add(airline); // Add to available airlines set
        flightDiv.dataset.availableAirlines += airline + "|";

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

    // Add airlines to total availableAirlines
    for (let airline of localAvailableAirlines)
    {
        availableAirlines[airline] = (availableAirlines[airline] || 0) + 1;
    }

    // Price Information
    var price = $ce("div");
    price.className = "price";
    priceString = "";
    // Handle Currencies
    if (offer.price.currency == "USD")
    {
        //priceString += "$";
    }
    else if (offer.price.currency == "EUR")
    {
        //priceString += "€";
    }

    const selectedEvent = eventList.options[eventList.selectedIndex];
    const firstThreshold = parseFloat(selectedEvent.dataset.firstThreshold);
    var priceDiffContent = parseFloat(offer.price.total) - firstThreshold;
    priceDiffContent = Math.round(priceDiffContent * 100) / 100;

    // priceString += offer.price.total;
    var flightPrice = $ce("div");
    flightPrice.className = "flight-price";
    flightPrice.appendChild($ctn(moneyFormatter.format(offer.price.total)));
    price.appendChild(flightPrice);
    var priceDiff = $ce("div");
    priceDiff.className = "price-diff";
    priceDiffContent > 0 ? priceDiff.textContent = "+" + moneyFormatter.format(priceDiffContent) : priceDiff.textContent = "";
    price.appendChild(priceDiff);

    flightDiv.dataset.price = offer.price.total;    
    flightDiv.appendChild(price);

    // Create Empty Warning Div
    const flightWarning = $ce("div");
    flightWarning.className = "centric-tooltip flightWarning";
    flightWarning.style.visibility = "hidden";
    flightWarning.appendChild(createHazardSVG());
    const tooltipText = $ce("span");
    tooltipText.className = "centric-tooltip-text hover-left";
    flightWarning.appendChild(tooltipText);
    flightDiv.appendChild(flightWarning);

    // Book Button
    var bookButton = $ce("button");
    bookButton.className = "request-booking-btn";
    bookButton.addEventListener("click", amadeusCreateOffer);
    bookButton.appendChild($ctn("Request Booking"));
    flightDiv.appendChild(bookButton);

    // Ancillary Button
    // var ancillaries = $ce("button");
    // ancillaries.addEventListener("click", getAmadeusSeatMap);
    // ancillaries.appendChild($ctn("Choose Seat"));
    // flightDiv.appendChild(ancillaries);

    return flightDiv;
}

async function duffelCreateOfferTemp (duffelOffer)
{
    fullPageLoader(true);

    try
    {
        console.log(duffelOffer);
        fetch(`/duffel-create-offer?id=` + duffelOffer)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                confirmedOffer = data;
                fullPageLoader(false);
                openNotificationPopup("Final flight information. \nPlease review your flight as some information may have changed.", "confirmDuffel");
            });
    }
    catch (error)
    {
        console.log(error);
        fullPageLoader(false);
        openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
    }
}

async function duffelCreateOffer (optDuffelOffer)
{
    fullPageLoader(true);

    try
    {
        var duffelOffer = "";
        if (optDuffelOffer)
        {
            duffelOffer = optDuffelOffer;
        }
        else
        {
            duffelOffer = flightData.offers[(this.parentNode.id).substring((this.parentNode.id).indexOf("-") + 1)];
        }
        console.log(duffelOffer);
        fetch(`/duffel-create-offer?id=` + duffelOffer.id)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                confirmedOffer = data;
                fullPageLoader(false);
                openNotificationPopup("Final flight information. \nPlease review your flight as some information may have changed.", "confirmDuffel");
            });
    }
    catch (error)
    {
        console.log(error);
        fullPageLoader(false);
        openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
    }
}

async function duffelCreateOrder ()
{
    console.log("Creating Order");
    try
    {
        const eventList = document.getElementById("eventList");
        const eventName = eventList.options[eventList.selectedIndex].textContent;
        const eventID = eventList.value;
        const tierID = document.getElementById("flightClass").value;

        fetch(`/duffel-create-order?id=` + confirmedOffer.data.id + "&passID=" + confirmedOffer.data.passengers[0].id + "&eventID=" + eventID + "&tierID=" + tierID + "&eventName=" + eventName)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                fullPageLoader(false);
                if (data.err || data.response) // Either of these only happen with errors
                {
                    // this.parentNode.parentNode.removeChild(document.getElementById(this.parentNode.id));
                    openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "exit");
                }
                else
                {
                    openNotificationPopup(data.notif, "reload");
                }
            });
    }
    catch (error)
    {
        console.log(error);
        fullPageLoader(false);
        openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
    }
}

async function amadeusCreateOffer ()
{
    fullPageLoader(true);

    var amadeusOffer = flightData.offers[(this.parentNode.id).substring((this.parentNode.id).indexOf("-") + 1)];
    try
    {
        fetch("/amadeus-flight-confirmation", {
            method: 'POST',
            body: JSON.stringify(amadeusOffer),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            }
        })
        .then(response => response.json())
        .then(data => {
            fullPageLoader(false);
            if (data.err)
            {
                openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
            }
            else
            {
                console.log(data);
                confirmedOffer = data;
                confirmedOfferDivID = this.parentNode.id;
                openNotificationPopup("Final flight information. \nPlease review your flight as some information may have changed.", "confirmAmadeus");
            }
        }); 
    }
    catch (err)
    {
        fullPageLoader(false);
        openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
    }
}

async function amadeusCreateOrder ()
{
    const eventList = document.getElementById("eventList");
    const eventID = eventList.value;
    const eventName = eventList.options[eventList.selectedIndex].textContent;
    const tierID = document.getElementById("flightClass").value;

    try
    {
        fetch("/amadeus-flight-booking", {
            method: 'POST',
            body: JSON.stringify({ "offer": confirmedOffer.data.flightOffers, "eventInfo": { "eventID": eventID, "eventName": eventName, "tierID": tierID } }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            fullPageLoader(false);
            if (data.err || data.response) // Either of these only happen with errors
            {
                document.getElementById("searchResults").removeChild(document.getElementById(confirmedOfferDivID));
                openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "exit");
            }
            else
            {
                openNotificationPopup(data.notif, "reload");
            }
        });
    }
    catch (err)
    {
        fullPageLoader(false);
        openNotificationPopup("This flight could not be booked at this time.\nWe apologize for the inconvenience.", "error");
    }
}

// Filtering
function filterFlights ()
{
    // Establish Cost Filter
    const highEndCost = document.getElementById("highEndCost").value; 

    // Establish Time Range Filters
    const outLowEndDepTime = document.getElementById("outLowEndDepTime").value;
    const outHighEndDepTime = document.getElementById("outHighEndDepTime").value;
    const outLowEndArrTime = document.getElementById("outLowEndArrTime").value;
    const outHighEndArrTime = document.getElementById("outHighEndArrTime").value;
    console.log(outLowEndDepTime);

    const retLowEndDepTime = document.getElementById("retLowEndDepTime").value;
    const retHighEndDepTime = document.getElementById("retHighEndDepTime").value;
    const retLowEndArrTime = document.getElementById("retLowEndArrTime").value;
    const retHighEndArrTime = document.getElementById("retHighEndArrTime").value;

    // Establish Stops Filters
    const outgoingConnections = document.getElementById("outgoingConnections").value;
    const returningConnections = document.getElementById("returningConnections").value;

    // Establish Airline Filter
    const airlineSelected = document.getElementsByName("airlineSelected");
    var selectedAirlines = [];
    for (let i = 0; i < airlineSelected.length; i++)
    {
        if (airlineSelected[i].checked)
        {
            selectedAirlines.push(airlineSelected[i].value);
        }
    }

    flightDataHTML.forEach(flight => {
        var visible = true;

        // Examine Cost
        var cost = flight.dataset.price;
        if (cost > highEndCost && highEndCost)
        {
            visible = false;
        }

        // Examine Time Ranges
        var overallDepTimeOutgoing = flight.querySelector(".outgoingDiv").dataset.overallDepTime;
        overallDepTimeOutgoing = overallDepTimeOutgoing.substring(overallDepTimeOutgoing.indexOf("T") + 1);
        var overallArrTimeOutgoing = flight.querySelector(".outgoingDiv").dataset.overallArrTime;
        overallArrTimeOutgoing = overallArrTimeOutgoing.substring(overallArrTimeOutgoing.indexOf("T") + 1);
        if (overallDepTimeOutgoing < outLowEndDepTime && outLowEndDepTime)
        {
            visible = false;
        }
        if (overallDepTimeOutgoing > outHighEndDepTime && outHighEndDepTime)
        {
            visible = false;
        }
        if (overallArrTimeOutgoing < outLowEndArrTime && outLowEndArrTime)
        {
            visible = false;
        }
        if (overallArrTimeOutgoing > outHighEndArrTime && outHighEndArrTime)
        {
            visible = false;
        }
         
        var overallDepTimeReturning = flight.querySelector(".returningDiv").dataset.overallDepTime;
        overallDepTimeReturning = overallDepTimeReturning.substring(overallDepTimeReturning.indexOf("T") + 1);
        var overallArrTimeReturning = flight.querySelector(".returningDiv").dataset.overallArrTime;
        overallArrTimeReturning = overallArrTimeReturning.substring(overallArrTimeReturning.indexOf("T") + 1);
        if (overallDepTimeReturning < retLowEndDepTime && retLowEndDepTime)
        {
            visible = false;
        }
        if (overallDepTimeReturning > retHighEndDepTime && retHighEndDepTime)
        {
            visible = false;
        }
        if (overallArrTimeReturning < retLowEndArrTime && retLowEndArrTime)
        {
            visible = false;
        }
        if (overallArrTimeReturning > retHighEndArrTime && retHighEndArrTime)
        {
            visible = false;
        }


        // Examine Stops
        var flightOutStops = flight.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length - 1;
        var flightRetStops = flight.querySelector(".returningDiv").querySelectorAll(".flightLeg").length - 1;
        if (flightOutStops > outgoingConnections && outgoingConnections)
        {
            visible = false;
        }
        if (flightRetStops > returningConnections && returningConnections)
        {
            visible = false;
        }

        // Examine Airlines
        var airlines = flight.dataset.availableAirlines;
        airlines = airlines.split("|");
        airlines.pop();

        var intersect = selectedAirlines.filter(element => airlines.includes(element));
        if (intersect.length === 0 && selectedAirlines.length !== 0)
        {
            visible = false;
        }

        // Determine if flight should be hidden
        if (visible)
        {
            flight.className = "flightListing";
        }
        else
        {
            flight.className = "flightListing hiddenListing";
        }
    });
}

function resetFilters ()
{
    const highEndCost = document.getElementById("highEndCost");
    const outLowEndDepTime = document.getElementById("outLowEndDepTime");
    const outHighEndDepTime = document.getElementById("outHighEndDepTime");
    const outLowEndArrTime = document.getElementById("outLowEndArrTime");
    const outHighEndArrTime = document.getElementById("outHighEndArrTime");
    const retLowEndDepTime = document.getElementById("retLowEndDepTime");
    const retHighEndDepTime = document.getElementById("retHighEndDepTime");
    const retLowEndArrTime = document.getElementById("retLowEndArrTime");
    const retHighEndArrTime = document.getElementById("retHighEndArrTime");
    const outgoingConnections = document.getElementById("outgoingConnections");
    const returningConnections = document.getElementById("returningConnections");
    const airlineSelected = document.getElementsByName("airlineSelected");

    highEndCost.value = "";
    outLowEndDepTime.value = "";
    outHighEndDepTime.value = "";
    outLowEndArrTime.value = "";
    outHighEndArrTime.value = "";
    retLowEndDepTime.value = "";
    retHighEndDepTime.value = "";
    retLowEndArrTime.value = "";
    retHighEndArrTime.value = "";
    outgoingConnections.value = "";
    returningConnections.value = "";
    for (let i = 0; i < airlineSelected.length; i++)
    {
        airlineSelected[i].checked = false;
    }
}

// Sorting
function sortFlights ()
{
    var orderRadio = document.getElementsByName("orderOfFlights");
    var selectedOrder = "";

    for (let i = 0; i < orderRadio.length; i++)
    {
        if (orderRadio[i].checked)
        {
            selectedOrder = orderRadio[i].id;
            console.log(selectedOrder);
            break;
        }
    }

    var sortRadio = document.getElementsByName("sortingOption");
    var selectedSort = "";
    
    for (let i = 0; i < sortRadio.length; i++)
    {
        if (sortRadio[i].checked)
        {
            selectedSort = sortRadio[i].id;
            console.log(selectedSort);
            break;
        }
    }

    if (selectedSort == "cost" && selectedOrder == "ascending")
    {
        flightDataHTML.sort(comparePrice);
    }
    else if (selectedSort == "cost" && selectedOrder == "descending")
    {
        flightDataHTML.sort(comparePriceInv);
    }
    else if (selectedSort == "dateTimeCloseness" && selectedOrder == "ascending")
    {
        flightDataHTML.sort(compareDateTimeCloseness);
    }
    else if (selectedSort == "dateTimeCloseness" && selectedOrder == "descending")
    {
        flightDataHTML.sort(compareDateTimeClosenessInv);
    }
    else if (selectedSort == "numberOfOutgoingConnections" && selectedOrder == "ascending")
    {
        flightDataHTML.sort(compareNumberOfOutgoingConnections);
    }
    else if (selectedSort == "numberOfOutgoingConnections" && selectedOrder == "descending")
    {
        flightDataHTML.sort(compareNumberOfOutgoingConnectionsInv);
    }
    else if (selectedSort == "numberOfReturningConnections" && selectedOrder == "ascending")
    {
        flightDataHTML.sort(compareNumberOfReturningConnections);
    }
    else if (selectedSort == "numberOfReturningConnections" && selectedOrder == "descending")
    {
        flightDataHTML.sort(compareNumberOfReturningConnectionsInv);
    }


    const searchResults = document.getElementById("searchResults");
    // Clear children
    let child = searchResults.lastElementChild;
    while (child)
    {
        searchResults.removeChild(child);
        child = searchResults.lastElementChild;
    }

    flightDataHTML.forEach(element => {
        searchResults.appendChild(element);
    });
}

function comparePrice (a, b)
{
    if (a.dataset.price < b.dataset.price)
    {
        return -1;
    }
    else if (a.dataset.price > b.dataset.price)
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function comparePriceInv (a, b)
{
    if (a.dataset.price < b.dataset.price)
    {
        return 1;
    }
    else if (a.dataset.price > b.dataset.price)
    {
        return -1;
    }
    else
    {
        return 0;
    }
}

function compareDateTimeCloseness (a, b)
{
    var aDate = a.querySelector(".outgoingDiv").dataset.overallDepTime;
    var bDate = b.querySelector(".outgoingDiv").dataset.overallDepTime;
    aDate = new Date(aDate);
    bDate = new Date(bDate);

    if (aDate < bDate)
    {
        return -1;
    }
    else if (aDate > bDate)
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function compareDateTimeClosenessInv (a, b)
{
    var aDate = a.querySelector(".outgoingDiv").dataset.overallDepTime;
    var bDate = b.querySelector(".outgoingDiv").dataset.overallDepTime;
    aDate = new Date(aDate);
    bDate = new Date(bDate);

    if (aDate < bDate)
    {
        return 1;
    }
    else if (aDate > bDate)
    {
        return -1;
    }
    else
    {
        return 0;
    }
}

function compareNumberOfOutgoingConnections (a, b)
{
    aConnections = a.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length;
    bConnections = b.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length;

    if (aConnections < bConnections)
    {
        return -1;
    }
    else if (aConnections > bConnections)
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function compareNumberOfOutgoingConnectionsInv (a, b)
{
    aConnections = a.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length;
    bConnections = b.querySelector(".outgoingDiv").querySelectorAll(".flightLeg").length;

    if (aConnections < bConnections)
    {
        return 1;
    }
    else if (aConnections > bConnections)
    {
        return -1;
    }
    else
    {
        return 0;
    }
}

function compareNumberOfReturningConnections (a, b)
{
    aConnections = a.querySelector(".returningDiv").querySelectorAll(".flightLeg").length;
    bConnections = b.querySelector(".returningDiv").querySelectorAll(".flightLeg").length;

    if (aConnections < bConnections)
    {
        return -1;
    }
    else if (aConnections > bConnections)
    {
        return 1;
    }
    else
    {
        return 0;
    }
}

function compareNumberOfReturningConnectionsInv (a, b)
{
    aConnections = a.querySelector(".returningDiv").querySelectorAll(".flightLeg").length;
    bConnections = b.querySelector(".returningDiv").querySelectorAll(".flightLeg").length;

    if (aConnections < bConnections)
    {
        return 1;
    }
    else if (aConnections > bConnections)
    {
        return -1;
    }
    else
    {
        return 0;
    }
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
        loaderText.textContent = "Booking flight...";
        fullLoader.appendChild(loaderText);
        fullPageLoader.appendChild(fullLoader);
    }
    else
    {
        if (fullPageLoader.lastElementChild)
        {
            fullPageLoader.style.display = "";
            fullPageLoader.removeChild(fullPageLoader.lastElementChild);
        }
    }
}

function openNotificationPopup (text, action)
{
    let child = notificationPopupInside.lastElementChild;
    while (child)
    {
        notificationPopupInside.removeChild(child);
        child = notificationPopupInside.lastElementChild;
    }

    const innerDiv = $ce("div");

    const notificationMsg = $ce("p");
    notificationMsg.innerHTML = text;
    innerDiv.appendChild(notificationMsg);

    const notificationButton = $ce("button");
    
    if (action === "reload" || action === "error")
    {
        notificationButton.textContent = "Okay";
        notificationButton.addEventListener("click", function () {
            window.location.reload();
        });
        innerDiv.appendChild(notificationButton);
    }
    else if (action === "exit")
    {
        notificationButton.textContent = "Okay";
        notificationButton.addEventListener("click", function () {
            closeNotificationPopup();
        });
        innerDiv.appendChild(notificationButton);
    }
    else if (action === "confirmDuffel")
    {
        console.log(confirmedOffer);
        const duffelListing = createDuffelListing(confirmedOffer.data, -29);
        duffelListing.querySelector(".request-booking-btn").style.visibility = "hidden";
        innerDiv.appendChild(duffelListing);
        notificationButton.textContent = "Confirm";
        notificationButton.addEventListener("click", function () {
            closeNotificationPopup();
            fullPageLoader(true);
            duffelCreateOrder();
        });
        const cancelButton = $ce("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", function () {
            closeNotificationPopup();
        });
        cancelButton.className = "notif-cancel-btn cancel-btn";
        innerDiv.appendChild(cancelButton);
        innerDiv.appendChild(notificationButton);
    }
    else if (action === "confirmAmadeus")
    {
        const amadeusListing = createAmadeusListing(confirmedOffer.data.flightOffers[0], -30);
        amadeusListing.querySelector(".request-booking-btn").style.visibility = "hidden";
        innerDiv.appendChild(amadeusListing);
        notificationButton.textContent = "Confirm";
        notificationButton.addEventListener("click", function () {
            closeNotificationPopup();
            fullPageLoader(true);
            amadeusCreateOrder();
        });
        const cancelButton = $ce("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", function () {
            closeNotificationPopup();
        });
        cancelButton.className = "notif-cancel-btn cancel-btn";
        innerDiv.appendChild(cancelButton);
        innerDiv.appendChild(notificationButton);
    }

    notificationPopupInside.appendChild(innerDiv);

    notificationPopup.style.display = "flex";
}

function closeNotificationPopup ()
{
    notificationPopup.style.display = "";
}

async function openAncillaryPopup ()
{
    const duffelOffer = flightData.offers[(this.parentNode.id).substring((this.parentNode.id).indexOf("-") + 1)];
    console.log(duffelOffer);

    confirmedOffer = duffelOffer;


        const ancillaryInnerContainer = $ce("div");
        ancillaryInnerContainer.className = "ancillary-inner-container";
        const duffelAncillaries = $ce("duffel-ancillaries");
        duffelAncillaries.style.zIndex = 99;
        duffelAncillaries.style.backgroundColor = "white";
        ancillariesContainer.replaceChildren();
        ancillaryInnerContainer.appendChild(duffelAncillaries);
        const duffelAncillariesInside = $ce("div");
        duffelAncillariesInside.className = "duffel-ancillaries-inside";
        duffelAncillariesInside.appendChild(ancillaryInnerContainer);
        const cancelBtn = $ce("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.className = "cancel-btn notif-cancel-btn";
        cancelBtn.addEventListener("click", function () {
            ancillariesContainer.style.display = "";
        });
        const skipBtn = $ce("button");
        skipBtn.textContent = "Skip";
        skipBtn.className = "skip-btn";
        skipBtn.addEventListener("click", function () {
            ancillariesContainer.style.display = "";
            duffelCreateOffer(confirmedOffer);
        });
        
        const ancillaryBtnContainer = $ce("div");
        ancillaryBtnContainer.className = "ancillary-btn-container";
        ancillaryBtnContainer.appendChild(cancelBtn);
        ancillaryBtnContainer.appendChild(skipBtn);
        duffelAncillariesInside.appendChild(ancillaryBtnContainer);

        ancillariesContainer.appendChild(duffelAncillariesInside);
        document.querySelector('duffel-ancillaries').render({
            debug: true,
            services: ['seats'],
            markup: {
                seats: { amount: 0, rate: 0 }
              },
            client_key: duffelOffer.client_key,
            offer_id: confirmedOffer.id,
            passengers: [
              {
                id: confirmedOffer.passengers[0].id,
                given_name: passengerInfo.firstName,
                family_name: passengerInfo.lastName,
                gender: passengerInfo.gender,
                title: passengerInfo.title,
                born_on: passengerInfo.birthdate,
                email: passengerInfo.email,
                phone_number: '+' + passengerInfo.phoneNumber,
              }
            ],     
        });
    
        document.querySelector('duffel-ancillaries').addEventListener('onPayloadReady', (event) => {
            /**
             * In a real environment, instead of logging the data, you'd post the payload
             * to your server so it can be used to
             * create an order with the Duffel API.
             *
             * For more information on creating orders, see
             * https://duffel.com/docs/guides/quick-start#creating-a-booking-using-the-selected-offer
             */
            console.log(event.detail.data);
            event.detail.data.type = "hold";
            console.log(event.detail.data.type);
            delete event.detail.data.payments;
            //delete event.detail.data.payments;
            //delete event.detail.data.services;
            //event.detail.data.type = "hold";
            console.log('Ancillaries selected. Order payload:', event.detail.data)
            console.log(
              'Ancillaries selected. Ancillary services chose:',
              event.detail.metadata
            )
    
            console.log(event.detail.data.selected_offers[0]);
            // duffelCreateOfferTemp(event.detail.data.selected_offers[0]);
            ancillariesContainer.style.display = "";

            const eventName = eventList.options[eventList.selectedIndex].textContent;
            const eventID = eventList.value;

            fullPageLoader(true);
            fetch("/duffel-create-offer?id=" + confirmedOffer.id)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                fetch("/duffel-seat-create-order", {
                    method: "POST",
                    body: JSON.stringify({ offer: event.detail.data, eventName: eventName, eventID: eventID, flightTierID: document.getElementById("flightClass").value }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                }).then(response => response.json()).then(data => {
                    console.log(data);
                    if (data.err)
                    {
                        fullPageLoader(false);
                        console.log("Unable to book seats");
                        duffelCreateOffer(duffelOffer);
                    }
                    else
                    {
                        fullPageLoader(false);
                        openNotificationPopup(data.notif, "reload");
                    }
                });
            });
          });
        
    ancillariesContainer.style.display = "flex"; 
}

async function getAmadeusSeatMap ()
{
    var amadeusOffer = flightData.offers[(this.parentNode.id).substring((this.parentNode.id).indexOf("-") + 1)];

    fetch("/amadeus-seat-maps", {
        method: 'POST',
        body: JSON.stringify(amadeusOffer),
        headers: {
            'Content-type': 'application/json; charset=UTF-8',
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);

        // Choose seats
        // This is a placeholder
        var seatNum = [];
        for (let i = 0; i < data.data.length; i++)
        {
            var seatPicked = false;
            const seats = data.data[i].decks[0].seats;
            for (let j = 0; j < seats.length; j++)
            {
                if (seatPicked)
                {
                    break;
                }
                if (seats[j].travelerPricing[0].seatAvailabilityStatus == "AVAILABLE")
                {
                    seatNum.push(seats[j].number);
                    seatPicked = true;
                }
            }
        }

        console.log(amadeusOffer.travelerPricings[0].fareDetailsBySegment);
        for (let i = 0; i < amadeusOffer.travelerPricings[0].fareDetailsBySegment.length; i++)
        {
            amadeusOffer.travelerPricings[0].fareDetailsBySegment[i]['additionalServices'] = {
                'chargeableSeatNumber': seatNum[i]
            };
        }
        flightData.offers[(this.parentNode.id).substring((this.parentNode.id).indexOf("-") + 1)] = amadeusOffer;
        console.log(flightData);
    })
}

document.addEventListener('DOMContentLoaded', function () {
    // Disable everything until this is finished?
    userInfo();
});