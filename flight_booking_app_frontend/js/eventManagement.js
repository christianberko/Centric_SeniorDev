// CONFIGURE ADMIN INVITES TO EVENTS

// DOM Elements
const orgList = document.getElementById("organizationList");
const organizationNameHeader = document.getElementById("organizationNameHeader");
const createEventBtn = document.getElementById("createEvent");
const eventListDiv = document.getElementById("events");

const eventPopup = document.getElementById("event-popup");
const eventNamePopup = document.getElementById("event-name-popup");
const newUserBtn = document.getElementById("newUserBtn");
const userSection = document.getElementById("userSection");
const startDateField = document.getElementById("startDate");
const endDateField = document.getElementById("endDate");
const eventNameField = document.getElementById("eventName");
const eventLocationField = document.getElementById("eventLocation");
const maxFlightTierField = document.getElementById("maxFlightTier");
const dateTimeBufferField = document.getElementById("dateTimeBuffer");
const layoverMaxField = document.getElementById("layoverMax");
const firstApprovalField = document.getElementById("firstApproval");
const secondApprovalField = document.getElementById("secondApproval");
const totalBudgetField = document.getElementById("totalBudget");
const totalAttendeesSpan = document.getElementById("totalAttendees");

const addAirportBtn = document.getElementById("addAirportBtn");
const allowedAirportList = document.getElementById("allowed-airport-list");
const airportSearch = document.getElementById("airport-search");
const autocompleteMenu = document.getElementById("ui-id-1");
const hotelsAllowedBox = document.getElementById("hotels-allowed");
const citySearch = document.getElementById("city-search");

const financialConfigDiv = document.getElementById("financialConfigurations");

const orgGroupsPopup = document.getElementById("orgGroupsPopup");
const userPopup = document.getElementById("userPopup");

const indivUserPopup = document.getElementById("indivUserPopup");
const indivUserPopupInside = document.getElementById("indivUserPopupInside");
const indivUserPopupHeader = document.getElementById("indivUserPopupHeader");
const indivUserInfo = document.getElementById("indivUserInfo");
const indivUserBookedBtn = document.getElementById("indivUserBookedBtn");
const attendeeFieldset = document.getElementById("attendee-fieldset");
const attendeeFieldsetBoxes = attendeeFieldset.querySelector("div");
const cancelIndivUser = document.getElementById("cancelIndivUser");
const saveIndivUser = document.getElementById("saveIndivUser");

const modifyAdminsBtn = document.getElementById("modifyAdminsBtn");
const adminPopup = document.getElementById("adminPopup");
const adminPopupInside = document.getElementById("adminPopupInside");
const eventPlannerFieldset = document.getElementById("event-planner-fieldset");
const eventPlannerFieldsetBoxes = eventPlannerFieldset.querySelector("div");
const financeFieldset = document.getElementById("finance-fieldset");
const financeFieldsetBoxes = financeFieldset.querySelector("div");
const approverFieldset = document.getElementById("approver-fieldset");
const approverFieldsetBoxes = approverFieldset.querySelector("div");
const cancelAdminBtn = document.getElementById("cancel-admin-btn");
const saveAdminBtn = document.getElementById("save-admin-btn");

const saveEventPopupBtn = document.getElementById("save");
const deleteEventPopupBtn = document.getElementById("deleteEvent");
const csvEventPopupBtn = document.getElementById("csv-history");
const saveBulkUserBtn = document.getElementById("saveUser");

var isNewEvent = true;
var currentEvent = 0;
var inPast = false;
var alreadyStarted = false;
var currentUser = "fake@email.com";
var orgUsers = {};
var orgAdmins = {};
var orgGroups = {};
var orgGroupsOriginal = {};
const userOrgRelationship = {}; // CHECK THIS WHEN THEY CREATE AN EVENT

async function populateOrganizations ()
{
    fetch("/get-event-management-organizations-from-user")
        .then(response => response.json())
        .then(data => {
            console.log("Event", data);
            if (data.err)
            {
                window.location.href = "/signIn?prev=eventManagement";
            }
            if (data.length === 0)
            {
                window.location.href = "/organizationSignUp";
            }
            for (let i = 0; i < data.length; i++)
            {
                const userAdminRoles = data[i].adminRoles.split("&&");
                userOrgRelationship[data[i].organizationID] = { organizationName: data[i].organizationName, adminRoles: userAdminRoles };

                const option = document.createElement("option");
                option.value = data[i].organizationID;
                option.textContent = data[i].organizationName;

                orgList.appendChild(option);
            }
            populateInfoFromOrganization();
        });
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

async function populateInfoFromOrganization ()
{
    organizationNameHeader.textContent = orgList.options[orgList.selectedIndex].textContent;
    const organizationID = orgList.value;
    enableCreateEventBtn();
    countOrganizationEvents(organizationID);
    populateEvents(organizationID);
}

function enableCreateEventBtn ()
{
    const organizationID = orgList.value;
    // Enabled or disabled create event button
    const adminRoles = userOrgRelationship[organizationID].adminRoles;
    if (adminRoles.includes("admin") || adminRoles.includes("execEvent") || adminRoles.includes("event"))
    {
        console.log("Event Enabled");
        createEventBtn.disabled = false;
        createEventBtn.className = "";
    }
    else
    {
        console.log("Event Disabled");
        createEventBtn.disabled = true;
        createEventBtn.className = "disabled";
    }
}

async function populateEvents ()
{
    const organizationID = orgList.value;

    let child = eventListDiv.lastElementChild;
    while (child)
    {
        eventListDiv.removeChild(child);
        child = eventListDiv.lastElementChild;
    }

    fetch("/get-admin-events-organization-from-user?organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            console.log("Populate Events", data);
            var eventCount = data.eventCount;
            data = data.events;
            
            // If there are no events
            if (data.length === 0)
            {
                const noInfoDisplay = $ce("div");
                noInfoDisplay.className = "no-info-div";
                const banSVG = createBanSVG();
                noInfoDisplay.appendChild(banSVG);
                const noInfoWords = $ce("span");
                noInfoWords.textContent = "This organization currently has no events.";
                noInfoDisplay.appendChild(noInfoWords);
                eventListDiv.appendChild(noInfoDisplay);

                return;
            }

            for (let i = 0; i < data.length; i++)
            {
                var eventDiv = document.createElement("div");
                eventDiv.className = "event";
                eventDiv.id = "event" + data[i].eventID;

                var eventName = document.createElement("p");
                eventName.className = "eventName";
                eventName.appendChild(document.createTextNode(data[i].eventName));
                eventDiv.appendChild(eventName);
                
                var dateRange = document.createElement("p");
                dateRange.className = "dateRange";
                console.log(data[i].startDate);
                var startDate = "";
                var endDate = "";
                const baseStartDate = new Date (data[i].startDate);
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
                
                dateRange.appendChild(document.createTextNode(startDate.toLocaleDateString() + " - " + endDate.toLocaleDateString()));
                eventDiv.appendChild(dateRange);

                var location = document.createElement("p");
                location.className = "location";
                location.appendChild(document.createTextNode(data[i].eventLocation));
                eventDiv.appendChild(location);

                // Implement real attendee numbers
                var attendeeNumber = document.createElement("p");
                attendeeNumber.className = "attendeeNumber";
                var attendeeNum = data[i].eventID in eventCount ? eventCount[data[i].eventID] : 0
                attendeeNumber.textContent = "Attendees - " + attendeeNum;
                eventDiv.appendChild(attendeeNumber);

                // var pendingInvites = document.createElement("p");
                // pendingInvites.className = "pendingInvites";
                // pendingInvites.appendChild(document.createTextNode("Pending Invites - " + "[]"));
                // eventDiv.appendChild(pendingInvites);

                // Add All Dataset Things
                eventDiv.dataset.eventId = data[i].eventID;
                eventDiv.dataset.eventName = data[i].eventName;
                eventDiv.dataset.eventLocation = data[i].eventLocation;
                eventDiv.dataset.startDate = (data[i].startDate + "").substring(0, (data[i].startDate + "").indexOf("T"));
                eventDiv.dataset.endDate = (data[i].endDate + "").substring(0, (data[i].endDate + "").indexOf("T"));
                eventDiv.dataset.checkedBags = data[i].checkedBags;
                eventDiv.dataset.layoverMax = data[i].layoverMax;
                eventDiv.dataset.dateTimeBuffer = data[i].dateTimeBuffer;
                eventDiv.dataset.firstThreshold = data[i].firstThreshold;
                eventDiv.dataset.secondThreshold = data[i].secondThreshold;
                eventDiv.dataset.overallBudget = data[i].overallBudget;
                eventDiv.dataset.maxFlightTier = data[i].maxFlightTier;
                eventDiv.dataset.eventAirports = data[i].eventAirports;
                eventDiv.dataset.hotelsAllowed = data[i].allowHotels;
                eventDiv.dataset.eventCity = data[i].cityCode == null ? "" : data[i].cityCode; // Would need to configure like eventAirports if upgrading in the future
                eventDiv.dataset.adminRoles = data[i].adminRoles;
                eventDiv.dataset.attendeeNum = attendeeNum;
                eventDiv.dataset.inPast = endDate < new Date();
                eventDiv.dataset.alreadyStarted = startDate < new Date();

                var editButton = document.createElement("button");
                editButton.className = "eventEdit";
                editButton.textContent = eventDiv.dataset.inPast == "true" ? editButton.textContent = "View" : "Edit";
                editButton.style.backgroundColor = eventDiv.dataset.inPast == "true" ? "var(--extra-30)" : "";
                editButton.addEventListener("click", function () { editEventOpen(data[i].eventID) });
                eventDiv.appendChild(editButton);

                eventListDiv.appendChild(eventDiv);
            }
        });

    enableCreateEventBtn();
}

function createOrgEvent ()
{
    const organizationID = orgList.value;
    const adminRoles = userOrgRelationship[organizationID].adminRoles;
    if (!adminRoles.includes("admin") && !adminRoles.includes("execEvent") && !adminRoles.includes("event"))
    {
        console.log("Invalid admin role to create an event");
        return;
    }

    let child = allowedAirportList.lastElementChild;
    while (child)
    {
        allowedAirportList.removeChild(child);
        child = allowedAirportList.lastElementChild;
    }

    isNewEvent = true;
    userSection.style.display = "none";
    financialConfigDiv.style.display = "none";

    eventNamePopup.textContent = "New Event";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    // document.getElementById("totalAttendees").textContent = "[]";
    // document.getElementById("currentAttendees").textContent = "[]";
    // document.getElementById("pendingAttendees").textContent = "[]";
    document.getElementById("eventName").value = "";
    document.getElementById("eventLocation").value = "";
    // document.getElementById("standardCheckedBags").value = "";
    document.getElementById("maxFlightTier").value = "";
    document.getElementById("dateTimeBuffer").value = "";
    document.getElementById("layoverMax").value = "";
    document.getElementById("firstApproval").disabled = true;
    document.getElementById("secondApproval").disabled = true;
    document.getElementById("totalBudget").disabled = true; 
    document.getElementById("firstApproval").value = "500";
    document.getElementById("secondApproval").value = "600";
    document.getElementById("totalBudget").value = "10000";
    airportSearch.value = "";
    hotelsAllowedBox.checked = true;
    hotelsAllowedBox.click();
    citySearch.value = "";

    deleteEventPopupBtn.style.display = "none";
    csvEventPopupBtn.style.display = "none";

    eventPopup.style.display = "flex";
    //eventPopup.className = "popup visibilePopup";
}

function editEventOpen (eventID)
{
    isNewEvent = false;
    currentEvent = eventID;
    const eventDiv = document.getElementById("event" + eventID);
    inPast = eventDiv.dataset.inPast == "true" ? true : false;
    alreadyStarted = eventDiv.dataset.alreadyStarted == "true" ? true : false;
    if (inPast)
    {
        saveEventPopupBtn.style.display = "none";
        deleteEventPopupBtn.style.display = "none";
    }
    else if (alreadyStarted)
    {
        deleteEventPopupBtn.style.display = "none";
    }
    else
    {
        saveEventPopupBtn.style.display = "";
        deleteEventPopupBtn.style.display = "none";
    }
    csvEventPopupBtn.style.display = "";

    userSection.style.display = "";
    financialConfigDiv.style.display = "";

    eventNamePopup.textContent = eventDiv.dataset.eventName;
    var attendeeNum = $ce("span");
    attendeeNum.className = "attendee-num-popup";
    attendeeNum.textContent = "Attendees - " + eventDiv.dataset.attendeeNum;
    eventNamePopup.appendChild(attendeeNum);
    startDateField.value = eventDiv.dataset.startDate;
    endDateField.value = eventDiv.dataset.endDate;
    // document.getElementById("currentAttendees").textContent = "[]";
    // document.getElementById("pendingAttendees").textContent = "[]";
    eventNameField.value = eventDiv.dataset.eventName;
    eventLocationField.value = eventDiv.dataset.eventLocation;
    // document.getElementById("standardCheckedBags").value = eventDiv.dataset.checkedBags;
    maxFlightTierField.value = eventDiv.dataset.maxFlightTier;
    dateTimeBufferField.value = eventDiv.dataset.dateTimeBuffer;
    layoverMaxField.value = eventDiv.dataset.layoverMax;
    firstApprovalField.value = eventDiv.dataset.firstThreshold;
    secondApprovalField.value = eventDiv.dataset.secondThreshold;
    totalBudgetField.value = eventDiv.dataset.overallBudget;

    // Hotel Toggle
    hotelsAllowedBox.checked = eventDiv.dataset.hotelsAllowed == "true" ? true : hotelsAllowedBox.checked = false;
    citySearch.value = eventDiv.dataset.eventCity;

    console.log(eventDiv.dataset.eventAirports);
    // Event Airports
    let child = allowedAirportList.lastElementChild;
    while (child)
    {
        allowedAirportList.removeChild(child);
        child = allowedAirportList.lastElementChild;
    }
    if (eventDiv.dataset.eventAirports != "null")
    {
        const eventAirports = (eventDiv.dataset.eventAirports).split("&&");
        console.log(eventAirports);
        eventAirports.forEach(airport => {
            const iataCode = airport.substring(0, airport.indexOf("|"));
            const primary = airport.substring(airport.indexOf("|") + 1);
    
            // List Item
            const airportLi = $ce("li");
            airportLi.id = iataCode + "li";

            // Airport Name
            const airportName = $ce("span");
            airportName.textContent = iataCode;
            airportLi.appendChild(airportName);
        
            // Primary Selecton

            const primarySpan = $ce("span");
            // Radio Button
            const primaryRadio = $ce("input");
            primaryRadio.setAttribute("type", "radio");
            primaryRadio.id = iataCode + "airport";
            primaryRadio.setAttribute("name", "primaryAirport");
            primaryRadio.setAttribute("value", iataCode);
            primary == "true" ? primaryRadio.checked = true : undefined;
            primarySpan.appendChild(primaryRadio);
            airportLi.appendChild(primarySpan);
            // Label
            const primaryLabelSpan = $ce("span");
            const primaryLabel = $ce("label");
            primaryLabel.setAttribute("for", iataCode + "airport");
            primaryLabel.textContent = "Primary?";
            primaryLabelSpan.appendChild(primaryLabel);
            airportLi.appendChild(primaryLabelSpan);
        
            const trashSpan = $ce("span");
            const trashSVG = createTrashSVG();
            trashSVG.addEventListener("click", function () {
                removeFromAirportList(this.parentNode.parentNode.id);
            });
            trashSpan.appendChild(trashSVG);
            airportLi.appendChild(trashSpan);
        
            allowedAirportList.appendChild(airportLi);
        });
    }

    startDateField.disabled = true
    startDateField.className = "disabled";
    endDateField.disabled = true;
    endDateField.className = "disabled";
    eventNameField.disabled = true;
    eventNameField.className = "disabled";
    eventLocationField.disabled = true;
    eventLocationField.className = "disabled";
    maxFlightTierField.disabled = true;
    maxFlightTierField.className = "disabled";
    dateTimeBufferField.disabled = true;
    dateTimeBufferField.className = "disabled";
    layoverMaxField.disabled = true;
    layoverMaxField.className = "disabled";
    airportSearch.disabled = true;
    airportSearch.className = "disabled";
    hotelsAllowedBox.disabled = true;
    hotelsAllowedBox.className = "disabled";
    citySearch.disabled = true;
    citySearch.className = "disabled";
    firstApprovalField.disabled = true;
    firstApprovalField.className = "disabled";
    secondApprovalField.disabled = true;
    secondApprovalField.className = "disabled";
    totalBudgetField.disabled = true;
    totalBudgetField.className = "disabled";
    //checkedBags.disabled
    userSection.style.display = "none";

    const organizationID = orgList.value;
    const adminRoles = eventDiv.dataset.adminRoles.split("&&");
    console.log(adminRoles);
    if (adminRoles.includes("admin") || adminRoles.includes("execEvent") || adminRoles.includes("event"))
    {
        startDateField.disabled = "";
        startDateField.className = "";
        endDateField.disabled = "";
        endDateField.className = "";
        eventNameField.disabled = "";
        eventNameField.className = "";
        eventLocationField.disabled = "";
        eventLocationField.className = "";
        maxFlightTierField.disabled = "";
        maxFlightTierField.className = "";
        dateTimeBufferField.disabled = "";
        dateTimeBufferField.className = "";
        layoverMaxField.disabled = "";
        layoverMaxField.className = "";
        airportSearch.disabled = "";
        airportSearch.className = "";
        hotelsAllowedBox.disabled = "";
        hotelsAllowedBox.checked ? (citySearch.disabled = false, citySearch.className = "") : (citySearch.disabled = true, citySearch.className = "disabled");
        userSection.style.display = "";
    }
    if (adminRoles.includes("admin") || adminRoles.includes("finance"))
    {
        firstApprovalField.disabled = "";
        firstApprovalField.className = "";
        secondApprovalField.disabled = "";
        secondApprovalField.className = "";
        totalBudgetField.disabled = "";
        totalBudgetField.className = "";
    }

    fetch(`/get-organization-groups?organizationID=` + organizationID)
    .then(response => response.json())
    .then(data => {
        orgGroupsOriginal = data;
        orgGroups = structuredClone(orgGroupsOriginal);
        console.log("Org Groups", orgGroups);

        let child = attendeeFieldsetBoxes.lastElementChild;
        while (child)
        {
            attendeeFieldsetBoxes.removeChild(child);
            child = attendeeFieldsetBoxes.lastElementChild;
        }

        orgGroups.attendeeGroups.forEach(role => {
            // Add group to checkboxes in popups
            var div = $ce("div");
            div.className = "attendee-indiv-group-popup";
            var popupLabel = document.createElement("label");
            popupLabel.setAttribute("for", "attendeeGroup" + role.groupID);
            popupLabel.textContent = role.groupName;
            var popupBox = document.createElement("input");
            popupBox.type = "checkbox";
            popupBox.name = "attendeeGroup" + role.groupID;
            popupBox.id = "attendeeGroup" + role.groupID;
            popupBox.value = role.groupID;
            div.appendChild(popupBox);
            div.appendChild(popupLabel);
            attendeeFieldsetBoxes.appendChild(div);
        });
    });

    eventPopup.style.display = "flex";
    //eventPopup.className = "popup visibilePopup";

    console.log(eventID);
}

async function createOrModifyEvent ()
{
    const eventName = eventNameField.value;
    const eventLocation = eventLocationField.value;
    const startDate = startDateField.value;
    const endDate = endDateField.value;
    // const standardCheckedBags = document.getElementById("standardCheckedBags").value;
    const maxFlightTier = maxFlightTierField.value;
    const dateTimeBuffer = dateTimeBufferField.value;
    const layoverMax = layoverMaxField.value;
    const firstApproval = firstApprovalField.value;
    const secondApproval = secondApprovalField.value;
    const totalBudget = totalBudgetField.value;
    const organizationID = orgList.value;
    const hotelsAllowed = hotelsAllowedBox.checked;
    const cityCode = citySearch.value;

    const allowedAirports = [];
    try
    {
        const allAllowedAirports = allowedAirportList.querySelectorAll("input[type='radio']");
        const primaryAllowedAirport = allowedAirportList.querySelector("input[type='radio']:checked") ? allowedAirportList.querySelector("input[type='radio']:checked").value : 0;
        allAllowedAirports.forEach(airport => {
            const primary = primaryAllowedAirport == airport.value ? "true" : "false";
            allowedAirports.push([airport.value, primary]);
        });
        console.log(allowedAirports);
    }
    catch (err)
    {
        console.log("Allowed airports not present");
    }

    if(isNewEvent)
    {
        fetch("/create-event", {
            method: 'POST',
            body: JSON.stringify({
                eventName: eventName,
                eventLocation: eventLocation,
                startDate: startDate,
                endDate: endDate,
                checkedBags: 1,
                maxFlightTier: maxFlightTier,
                dateTimeBuffer: dateTimeBuffer,
                layoverMax: layoverMax,
                firstThreshold: firstApproval,
                secondThreshold: secondApproval,
                overallBudget: totalBudget,
                organizationID: organizationID,
                allowedAirports: allowedAirports,
                hotelsAllowed: hotelsAllowed,
                cityCode: cityCode
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            window.location.href = "/eventManagement";
        });
    }
    else
    {  
        // Look for previously checked airports
        const currentAllowedAirports = document.getElementById("event" + currentEvent).dataset.eventAirports.split("&&");
        for (let i = 0; i < currentAllowedAirports.length; i++)
        {
            currentAllowedAirports[i] = currentAllowedAirports[i].split("|");
        }
        console.log("Current Allowed Airports", currentAllowedAirports);
        fetch("/modify-event", {
            method: 'POST',
            body: JSON.stringify({
                eventID: currentEvent,
                eventName: eventName,
                eventLocation: eventLocation,
                startDate: startDate,
                endDate: endDate,
                checkedBags: 1,
                maxFlightTier: maxFlightTier,
                dateTimeBuffer: dateTimeBuffer,
                layoverMax: layoverMax,
                firstThreshold: firstApproval,
                secondThreshold: secondApproval,
                overallBudget: totalBudget,
                organizationID: organizationID,
                allowedAirports: allowedAirports,
                currentAllowedAirports: currentAllowedAirports,
                hotelsAllowed: hotelsAllowed,
                cityCode: cityCode
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            window.location.href = "/eventManagement";
        })
    }
}

async function exportEventHistoryCSV ()
{
    const organizationID = orgList.value;
    fetch("/export-event-history-csv?organizationID=" + organizationID + "&eventID=" + currentEvent)
    .then(response => response.url)
    .then(data => {
        console.log(data);
        var link = $ce("a");
        link.download = "Event";
        link.href = data;
        link.click();
    });
}

async function populateAdminUsers ()
{
    const organizationID = orgList.value;
    
    let child = eventPlannerFieldsetBoxes.lastElementChild;
    while (child)
    {
        eventPlannerFieldsetBoxes.removeChild(child);
        child = eventPlannerFieldsetBoxes.lastElementChild;
    }

    child = financeFieldsetBoxes.lastElementChild;
    while (child)
    {
        financeFieldsetBoxes.removeChild(child);
        child = financeFieldsetBoxes.lastElementChild;
    }

    child = approverFieldsetBoxes.lastElementChild;
    while (child)
    {
        approverFieldsetBoxes.removeChild(child);
        child = approverFieldsetBoxes.lastElementChild;
    }

    fetch(`/get-event-admins?organizationID=` + organizationID + "&eventID=" + currentEvent)
    .then(response => response.json())
    .then(data => {
        console.log("Event Admins", data);
        orgAdmins = data;
        const eventUsers = data.event;
        const financeUsers = data.finance;
        const approverUsers = data.approver;
        for (const [key, value] of Object.entries(eventUsers))
        {
            var div = $ce("div");
            div.className = "admin-user";

            var label = $ce("label");
            label.setAttribute("for", "eventUser:" + value.email);

            var input = $ce("input");
            input.type = "checkbox";
            input.id = "eventUser:" + value.email;
            input.name = "eventUser";
            input.value = value.email;
            if (value.assignedToEvent)
            {
                input.checked = true;
            }
            div.appendChild(input);

            if (value.name == "null null")
            {
                label.textContent = value.email;
            }
            else
            {
                label.textContent = value.name;
            }
            div.appendChild(label);

            eventPlannerFieldsetBoxes.appendChild(div);
        }
        for (const [key, value] of Object.entries(financeUsers))
        {
            var div = $ce("div");
            div.className = "admin-user";

            var label = $ce("label");
            label.setAttribute("for", "financeUser:" + value.email);

            var input = $ce("input");
            input.type = "checkbox";
            input.id = "financeUser:" + value.email;
            input.name = "financeUser";
            input.value = value.email;
            if (value.assignedToEvent)
            {
                input.checked = true;
            }
            div.appendChild(input);

            if (value.name == "null null")
            {
                label.textContent = value.email;
            }
            else
            {
                label.textContent = value.name;
            }
            div.appendChild(label);

            financeFieldsetBoxes.appendChild(div);
        }
        for (const [key, value] of Object.entries(approverUsers))
        {
            var div = $ce("div");
            div.className = "admin-user";

            var label = $ce("label");
            label.setAttribute("for", "approverUser:" + value.email);

            var input = $ce("input");
            input.type = "checkbox";
            input.id = "approverUser:" + value.email;
            input.name = "approverUser";
            input.value = value.email;
            if (value.assignedToEvent)
            {
                input.checked = true;
            }
            div.appendChild(input);

            if (value.name == "null null")
            {
                label.textContent = value.email;
            }
            else
            {
                label.textContent = value.name;
            }
            div.appendChild(label);

            approverFieldsetBoxes.appendChild(div);
        }
    });
}

async function populateAttendeeUsers ()
{
    const organizationID = orgList.value;

    const orgUsersPopup = document.getElementById("orgUsersPopup");

    var child = orgUsersPopup.lastElementChild;
    while (child)
    {
        orgUsersPopup.removeChild(child);
        child = orgUsersPopup.lastElementChild;
    }

    fetch("/get-event-attendees?organizationID=" + organizationID + "&eventID=" + currentEvent)
        .then(response => response.json())
        .then(data => {
            orgUsers = data;
            console.log(orgUsers);

            for (const [key, value] of Object.entries(data)) 
            {
                var div = $ce("div");
                div.className = "existing-attendee-user";

                var label = document.createElement("label");
                label.setAttribute("for", "user:" + value.email);

                var input = document.createElement("input");
                input.type = "checkbox";
                input.id = "user:" + value.email;
                input.name = "user";
                input.value = value.email;
                if (value.inEvent)
                {
                    input.checked = true;
                }
                input.addEventListener("change", function () { matchAttendeeGroups(); });

                div.appendChild(input);

                if (value.name == "null null")
                {
                    label.textContent = value.email;
                }
                else
                {
                    label.textContent = value.name + " (" + value.email + ")";
                }
                div.appendChild(label);

                const pip = createPIPSVG();
                pip.addEventListener("click", function (e) { 
                    e.preventDefault();
                    openIndividualUserPopup(value.email, value.name);
                });
                div.appendChild(pip);

                orgUsersPopup.appendChild(div); 
            }
        });
}

function populateAttendeeGroups ()
{
    let child = orgGroupsPopup.lastElementChild;
    while (child)
    {
        orgGroupsPopup.removeChild(child);
        child = orgGroupsPopup.lastElementChild;
    }

    for (const [key, value] of Object.entries(orgGroups.attendeeGroups))
    {
        var div = $ce("div");
        div.className = "attendee-group-listing";

        const label = document.createElement("label");
        label.setAttribute("for", "group:" + value.groupName);
        label.textContent = value.groupName;

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = "group:" + value.groupName;
        input.name = "group";
        input.value = value.groupName;
        input.dataset.groupId = value.groupID;
        
        div.appendChild(input);
        div.appendChild(label);
        orgGroupsPopup.appendChild(div);
    }
}

function matchAttendeeGroups ()
{
    orgGroups = structuredClone(orgGroupsOriginal);
    console.log(orgUsers)
    const orgUsersChecked = (document.getElementById("orgUsersPopup")).querySelectorAll('input[type="checkbox"]:checked');
    // const orgUsersUnchecked = (document.getElementById("orgUsersPopup")).querySelectorAll('input[type="checkbox"]:not(:checked)');

    for (let i = 0; i < orgGroups.attendeeGroups.length; i++)
    {
        var groupBox = document.getElementById("group:" + orgGroups.attendeeGroups[i].groupName);
        console.log("Group Box", groupBox);
        var groupID = orgGroups.attendeeGroups[i].groupID;
        orgUsersChecked.forEach(user => {
            orgUsers[user.value].eventAttendeeRoles.forEach(role => {
                if (groupID == role.groupID)
                {
                    orgGroups.attendeeGroups[i].num++;
                }
            });
        });
        (orgGroups.attendeeGroups[i].num == orgUsersChecked.length && orgUsersChecked.length != 0) ? groupBox.checked = true : groupBox.checked = false;
    }
    console.log(orgGroups);
}

async function saveUser ()
{
    const selectedOrg = orgList.options[orgList.selectedIndex];
    const organizationID = orgList.value;
    const organizationName = selectedOrg.textContent;
    
    const userTypes = document.getElementsByName("userType");
    var userType;
    for (let i = 0; i < userTypes.length; i++)
    {
        if (userTypes[i].checked)
        {
            userType = userTypes[i].value;
            break;
        }
    }

    if (userType == "new")
    {
        const selectedOrg = orgList.options[orgList.selectedIndex];
        const organizationID = orgList.value;
        const organizationName = selectedOrg.textContent;
        const email = document.getElementById("userEmailPopup").value;
        const orgGroupsChecked = orgGroupsPopup.querySelectorAll('input[type="checkbox"]:checked');
        const roles = [];
        orgGroupsChecked.forEach(element => {
            roles.push(element.dataset.groupId);
        });

        var userObj = {
            email: email,
            organizationID: organizationID,
            organizationName: organizationName,
            roles: roles,
            eventID: currentEvent
        };

        fetch("/invite-user", {
            method: 'POST',
            body: JSON.stringify(userObj),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            cancelUserPopup();
        });
    }
    else if (userType == "existing")
    {
        const orgUsersChecked = (document.getElementById("orgUsersPopup")).querySelectorAll('input[type="checkbox"]:checked');
        const orgUsersUnchecked = (document.getElementById("orgUsersPopup")).querySelectorAll('input[type="checkbox"]:not(:checked)');
        const orgGroupsChecked = orgGroupsPopup.querySelectorAll('input[type="checkbox"]:checked');
        const orgGroupsUnchecked = orgGroupsPopup.querySelectorAll('input[type="checkbox"]:not(:checked)');

        
        var orgUsersCheckedArr = [];
        var orgUsersUncheckedArr = [];
        orgUsersChecked.forEach(element => {
            orgUsersCheckedArr.push(element.value);
        });
        orgUsersUnchecked.forEach(element => {
            orgUsersUncheckedArr.push(element.value);
        });
        console.log(orgUsersCheckedArr);
        console.log(orgUsersUncheckedArr);
        var orgGroupsCheckedArr = [];
        var orgGroupsUncheckedArr = [];
        orgGroupsChecked.forEach(element => {
            orgGroupsCheckedArr.push(parseInt(element.dataset.groupId));
        });
        orgGroupsUnchecked.forEach(element => {
            orgGroupsUncheckedArr.push(parseInt(element.dataset.groupId));
        });
        
        console.log("Org Groups Checked", orgGroupsCheckedArr);
        console.log("Org Groups Unchecked", orgGroupsUncheckedArr);

        const newlyChecked = [];
        const newlyUnchecked = [];
        // Checked updates for existing users only
        const newlyCheckedGroups = [];
        const newlyUncheckedGroups = [];
        for (const [key, value] of Object.entries(orgUsers))
        {
            if (value.inEvent && orgUsersUncheckedArr.includes(value.email))
            {
                newlyUnchecked.push(value.email);
            }
            if (!value.inEvent && orgUsersCheckedArr.includes(value.email))
            {
                newlyChecked.push(value.email);
            }
            if (value.inEvent && orgUsersCheckedArr.includes(value.email))
            {
                for (let i = 0; i < value.eventAttendeeRoles.length; i++)
                {
                    if (!orgGroupsCheckedArr.includes(value.eventAttendeeRoles[i].groupID))
                    {
                        newlyUncheckedGroups.push({ user: value.email, group: value.eventAttendeeRoles[i].groupID });
                    }
                }
            }
        }

        console.log("Newly Checked - " + newlyChecked);
        console.log("Newly Unchecked - " + newlyUnchecked);
        console.log("Newly Unchecked Groups", newlyUncheckedGroups);

        if (orgUsersCheckedArr.length > 0)
        {
            fetch(`/add-event-user-association`, {
                method: 'POST',
                body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, users: orgUsersCheckedArr, groups: orgGroupsCheckedArr }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                cancelUserPopup();
            });
        }
        if (newlyUnchecked.length > 0)
        {
            fetch(`/remove-event-user-association`, {
                method: 'POST',
                body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, users: newlyUnchecked }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log(data);
                cancelUserPopup();
            });
        }
        if (newlyUncheckedGroups.length > 0)
        {
            fetch(`/remove-event-user-group-association`, {
                method: 'POST',
                body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, userGroup: newlyUncheckedGroups }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log("Remove Group Assoc", data);
                cancelUserPopup();
            });
        }
    }
}

async function saveAdminUser ()
{
    const organizationID = orgList.value;

    // Event Planners
    const eventUsersChecked = eventPlannerFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const eventUsersCheckedArr = [];
    const eventUsersNewlyUnchecked = [];
    eventUsersChecked.forEach(box => {
        eventUsersCheckedArr.push(box.value);
    });
    for (const [key, value] of Object.entries(orgAdmins.event))
    {
        if (!eventUsersCheckedArr.includes(value.email) && value.assignedToEvent)
        {
            eventUsersNewlyUnchecked.push(value.email);
        }
    }

    // Finance
    const financeUsersChecked = financeFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const financeUsersCheckedArr = [];
    const financeUsersNewlyUnchecked = [];
    financeUsersChecked.forEach(box => {
        financeUsersCheckedArr.push(box.value);
    });
    for (const [key, value] of Object.entries(orgAdmins.finance))
    {
        if (!financeUsersCheckedArr.includes(value.email) && value.assignedToEvent)
        {
            financeUsersNewlyUnchecked.push(value.email);
        }
    }

    const approverUsersChecked = approverFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const approverUsersCheckedArr = [];
    const approverUsersNewlyUnchecked = [];
    approverUsersChecked.forEach(box => {
        approverUsersCheckedArr.push(box.value);
    });
    for (const [key, value] of Object.entries(orgAdmins.approver))
    {
        if (!approverUsersCheckedArr.includes(value.email) && value.assignedToEvent)
        {
            approverUsersNewlyUnchecked.push(value.email);
        }
    }

    if (eventUsersCheckedArr.length > 0 || financeUsersCheckedArr.length > 0 || approverUsersCheckedArr.length > 0)
    {
        fetch(`/add-event-user-admin-association`, {
            method: 'POST',
            body: JSON.stringify({ 
                eventID: currentEvent, 
                organizationID: organizationID, 
                eventUsers: eventUsersCheckedArr, 
                financeUsers: financeUsersCheckedArr,
                approverUsers: approverUsersCheckedArr
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            cancelAdminPopup();
        });
    }
    if (eventUsersNewlyUnchecked.length > 0 || financeUsersNewlyUnchecked.length > 0 || approverUsersNewlyUnchecked.length > 0)
    {
        console.log("Finance Unchecked", financeUsersNewlyUnchecked);
        fetch(`/remove-event-user-admin-association`, {
            method: 'POST',
            body: JSON.stringify({ 
                eventID: currentEvent, 
                organizationID: organizationID, 
                eventUsers: eventUsersNewlyUnchecked, 
                financeUsers: financeUsersNewlyUnchecked,
                approverUsers: approverUsersNewlyUnchecked
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            cancelAdminPopup();
        });
    }
}

async function saveIndivUserGroups ()
{
    const organizationID = orgList.value;

    const attendeeBoxesChecked = attendeeFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const attendeeBoxesCheckedArr = [];
    attendeeBoxesChecked.forEach(box => {
        attendeeBoxesCheckedArr.push(parseInt(box.value));
    });
    const eventAttendeeRoles = orgUsers[currentUser].eventAttendeeRoles;
    const eventAttendeeRoleIDArr = [];
    eventAttendeeRoles.forEach(role => {
        eventAttendeeRoleIDArr.push(role.groupID);
    });

    const newlyUnchecked = [];
    eventAttendeeRoleIDArr.forEach(groupID => {
        if (!attendeeBoxesCheckedArr.includes(groupID))
        {
            newlyUnchecked.push({ user: currentUser, group: groupID });
        }
    });

    if (attendeeBoxesCheckedArr.length > 0)
    {
        // Call upsert fetch for single user
        fetch(`/add-event-user-association`, {
            method: 'POST',
            body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, users: [currentUser], groups: attendeeBoxesCheckedArr }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            cancelIndivUserPopup();
        });
    }

    if (newlyUnchecked.length > 0)
    {
        fetch(`/remove-event-user-group-association`, {
            method: 'POST',
            body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, userGroup: newlyUnchecked }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Removed from Event", data);
            cancelIndivUserPopup();
        });
    }
}

async function openIndividualUserPopup (email, pendingName)
{
    currentUser = email;
    const organizationID = orgList.value;

    const inEvent = orgUsers[email].inEvent ? true : false;

    fetch(`/get-attendee-info`, {
        method: 'POST',
        body: JSON.stringify({ eventID: currentEvent, organizationID: organizationID, email: email, inEvent: inEvent }),
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(response => response.json())
    .then(data => {
        data = data[0];
        console.log(data);

        let child = indivUserInfo.lastElementChild;
        while (child)
        {
            indivUserInfo.removeChild(child);
            child = indivUserInfo.lastElementChild;
        }

        if (pendingName == "null null")
        {
            // Display nothing but email
            indivUserPopupHeader.textContent = data.email;

            const basicInfo = $ce("div");
            const attendeeEmail = $ce("p");
            attendeeEmail.textContent = "Email: " + data.email;
            basicInfo.appendChild(attendeeEmail);
            indivUserInfo.appendChild(basicInfo);
        }
        else
        {
            var name = "";
            if (data.middleName)
            {
                name = data.firstName + " " + data.middleName + " " + data.lastName;
            }
            else
            {
                name = data.firstName + " " + data.lastName;
            }
            if (data.suffix)
            {
                name += " " + data.suffix;
            }
            indivUserPopupHeader.textContent = name;
            // Standard Info
            const basicInfo = $ce("div");
            const attendeeName = $ce("p");
            attendeeName.textContent = "Name: " + name;
            basicInfo.appendChild(attendeeName);
            const attendeeEmail = $ce("p");
            attendeeEmail.textContent = "Email: " + data.email;
            basicInfo.appendChild(attendeeEmail);
            indivUserInfo.appendChild(basicInfo);

            // Secondary Info
            const secInfo = $ce("div");
            if (data.preferredName)
            {
                const attendeePrefName = $ce("p");
                attendeePrefName.textContent = "Preferred Name: " + data.preferredName;
                secInfo.appendChild(attendeePrefName);
            }
            const attendeeGender = $ce("p");
            attendeeGender.textContent = "Gender: " + data.gender;
            secInfo.appendChild(attendeeGender);
            const attendeePhoneNumber = $ce("p");
            const attendeeBirthdate = $ce("p");
            attendeeBirthdate.textContent = "Birthdate: " + data.birthdate;
            secInfo.appendChild(attendeeBirthdate);
            attendeePhoneNumber.textContent = "Phone Number: +" + data.phoneNumber;
            secInfo.appendChild(attendeePhoneNumber);
            if (data.preferredAirport)
            {
                const attendeePreferredAirport = $ce("p");
                attendeePreferredAirport.textContent = "Departure Airport: " + data.preferredAirport;
                secInfo.appendChild(attendeePreferredAirport);
            }
            indivUserInfo.appendChild(secInfo);
        }

        // Booked Button
        if (!data.approved)
        {
            indivUserBookedBtn.textContent = "Not Booked";
            indivUserBookedBtn.className = "notBookedBtn";
        }
        else if (data.approved === "notIn")
        {
            indivUserBookedBtn.textContent = "Not In Event";
            indivUserBookedBtn.className = "notInEventBtn";
        }
        else if (data.approved === "denied")
        {
            indivUserBookedBtn.textContent = "Denied";
            indivUserBookedBtn.className = "deniedBtn";
        }
        else if (data.approved === "approved")
        {
            indivUserBookedBtn.textContent = "Confirmed";
            indivUserBookedBtn.className = "confirmedBtn";
        }
        else if (data.approved === "escalation" || data.approved === "pending")
        {
            indivUserBookedBtn.textContent = "Pending";
            indivUserBookedBtn.className = "pendingBtn";
        }

        // Check boxes if in group
        const eventAttendeeRoles = orgUsers[email].eventAttendeeRoles;
        const eventAttendeeRoleIDArr = [];
        eventAttendeeRoles.forEach(role => {
            eventAttendeeRoleIDArr.push(role.groupID);
        });
        const attendeeBoxes = attendeeFieldsetBoxes.querySelectorAll('input');
        attendeeBoxes.forEach(box => {
            box.checked = eventAttendeeRoleIDArr.includes(parseInt(box.value)) ? true : false;
        });

        indivUserPopup.style.display = "flex";
    });
}

function inviteUser (type)
{
    userPopup.style.display = "flex";
    saveBulkUserBtn.style.display = inPast ? "none" : "";
    
    if (type == "attendee")
    {
        document.getElementById("userPopupHeader").textContent = "Attendees";
        document.getElementById("userEmailPopup").value = "";
        populateAttendeeUsers();
        populateAttendeeGroups();
        newUserBtn.checked = true;
        newUserVisible(true);
    }
}

function inviteAdminUser ()
{
    adminPopup.style.display = "flex";
    saveAdminBtn.style.display = inPast ? "none" : "";
    populateAdminUsers();
}

function newUserVisible (newUser)
{
    const newUserSection = document.getElementById("userInput");
    const existingUserSection = document.getElementById("orgUsersPopup").parentNode.parentNode;
    if (newUser)
    {
        newUserSection.parentNode.style.display = "block";
        existingUserSection.parentNode.style.display = "none";
    }
    else
    {
        newUserSection.parentNode.style.display = "none";
        existingUserSection.parentNode.style.display = "block";
        saveIndivUser.style.display = inPast ? "none" : "";
        matchAttendeeGroups();
    }
}

function cancelAdminPopup ()
{
    adminPopup.style.display = "none";
}

function cancelIndivUserPopup ()
{
    indivUserPopup.style.display = "none";
    cancelUserPopup();
}

function cancelUserPopup ()
{
    userPopup.style.display = "none";
}

function cancelEventPopup ()
{
    eventPopup.style.display = "";
    //eventPopup.className = "popup hiddenPopup";
}

// Allowed Airports
function addToAirportList (iataCode)
{
        // List Item
        const airportLi = $ce("li");
        airportLi.id = iataCode + "li";

        // Airport Name
        const airportName = $ce("span");
        airportName.textContent = iataCode;
        airportLi.appendChild(airportName);
        
        // Primary Selecton

        // Radio Button
        const primaryRadioSpan = $ce("span");
        const primaryRadio = $ce("input");
        primaryRadio.setAttribute("type", "radio");
        primaryRadio.id = iataCode + "airport";
        primaryRadio.setAttribute("name", "primaryAirport");
        primaryRadio.setAttribute("value", iataCode);
        primaryRadioSpan.appendChild(primaryRadio);
        airportLi.appendChild(primaryRadioSpan)

        // Label
        const primaryLabelSpan = $ce("span");
        const primaryLabel = $ce("label");
        primaryLabel.setAttribute("for", iataCode + "airport");
        primaryLabel.textContent = "Primary?";
        primaryLabelSpan.appendChild(primaryLabel);
        airportLi.appendChild(primaryLabelSpan);
        
        const trashSpan = $ce("span");
        const trashSVG = createTrashSVG();
        trashSVG.addEventListener("click", function () {
            removeFromAirportList(this.parentNode.parentNode.id);
        });
        trashSpan.appendChild(trashSVG);
        airportLi.appendChild(trashSpan);

    allowedAirportList.appendChild(airportLi);

    airportSearch.value = "";
}

function removeFromAirportList (airportLiID)
{
    const airportLi = document.getElementById(airportLiID);
    allowedAirportList.removeChild(airportLi);
}

$(function(){ 
    $('#airport-search').autocomplete({ 
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
                console.log(err);
                console.log(err.status); 
              } 
          }); 
       }         
    }); 
  }); 

  $(function(){ 
    $('#city-search').autocomplete({ 
       source: function(req, res){ 
        console.log(req);
          $.ajax({ 
             url:"amadeus-city-search/", 
             dataType: "json", 
             type:"GET", 
             data:req, 
             success: function (data){ 
                console.log(data);
               res($.map(data, function(val, i){ 
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

// On Load
document.addEventListener('DOMContentLoaded', () => {
    if (addAirportBtn)
    {
        addAirportBtn.addEventListener("click", function () {
            const selectedAirport = airportSearch.value;
            if (!validateIATACode(selectedAirport))
            {
                // SHOW ERROR
                return;
            }
            addToAirportList(selectedAirport);
        });
    }

    if (autocompleteMenu)
    {
        // const menu = document.removeChild(document.getElementById("ui-id-1"));
        // airportSearch.appendChild(menu);
    }

    if (hotelsAllowedBox)
    {
        hotelsAllowedBox.addEventListener("click", function () {
            if (this.checked)
            {
                citySearch.disabled = false;
                citySearch.classList.remove("disabled");
            }
            else
            {
                citySearch.disabled = true;
                citySearch.classList.add("disabled");
            }
        });
    }

    if (modifyAdminsBtn)
    {
        modifyAdminsBtn.addEventListener("click", function () {
            inviteAdminUser();
        });
    }

    if (cancelAdminBtn)
    {
        cancelAdminBtn.addEventListener("click", function () {
            cancelAdminPopup();
        });
    }

    if (saveAdminBtn)
    {
        saveAdminBtn.addEventListener("click", function () {
            saveAdminUser();
        });
    }

    if (cancelIndivUser)
    {
        cancelIndivUser.addEventListener("click", function () {
            cancelIndivUserPopup();
        });
    }

    if (saveIndivUser)
    {
        saveIndivUser.addEventListener("click", function () {
            saveIndivUserGroups();
        });
    }

    if (csvEventPopupBtn)
    {
        csvEventPopupBtn.addEventListener("click", function () {
            exportEventHistoryCSV();
        });
    }
});

