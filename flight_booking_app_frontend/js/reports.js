// DOM Elements
const organizationNameHeader = document.getElementById("organizationName");
const orgList = document.getElementById("organizationList");
const eventList = document.getElementById("event-list");
const bookingTypeList = document.getElementById("booking-type-list");
const exportCSVBtn = document.getElementById("export-csv-btn");
const exportXLSXBtn = document.getElementById("export-xlsx-btn");

const eventDetails = document.getElementById("event-details");

const reportTableDiv = document.getElementById("report-table-div");
const reportTable = document.getElementById("report-table");

var orgInfo = [];
var eventInfo = {};

async function populateOrganizations ()
{
    fetch("/get-event-management-organizations-from-user")
        .then(response => response.json())
        .then(data => {
            orgInfo = data;
            if (data.err)
            {
                window.location.href = "/signIn?prev=reports";
            }
            if (data.length === 0)
            {
                window.location.href = "/organizationSignUp";
            }
            console.log(orgInfo);
            for (let i = 0; i < data.length; i++)
            {
                var option = document.createElement("option");
                option.value = data[i].organizationID;
                option.textContent = data[i].organizationName;

                orgList.appendChild(option);
            }
            populateEvents();
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

async function populateEvents ()
{    
    const selectedOrg = orgList.options[orgList.selectedIndex];
    const organizationID = selectedOrg.value;

    // Remove existing table rows
    let child = eventList.lastElementChild;
    while (child)
    {
        eventList.removeChild(child);
        child = eventList.lastElementChild;
    }

    organizationNameHeader.textContent = selectedOrg.textContent;
    countOrganizationEvents(organizationID);

    fetch("/get-admin-events-organization-from-user?organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            // Store event information
            eventInfo = data.events;
            
            // Put in All Events option if an admin
            const orgRoles = orgInfo[orgList.selectedIndex].adminRoles.split("&&");
            // if (orgRoles.includes("admin"))
            // {
            //     var option = document.createElement("option");
            //     option.value = 0;
            //     option.textContent = "All Events";
            //     eventList.appendChild(option);
            // }

            if (eventInfo.length === 0)
            {
                eventList.disabled = true;
                eventList.classList.add("disabled");
            }

            for (let i = 0; i < eventInfo.length; i++)
            {
                var option = document.createElement("option");
                option.value = eventInfo[i].eventID;
                option.textContent = eventInfo[i].eventName;

                eventList.appendChild(option);
            }
            populateBookings();
            changeEventInfo();
        });
}

async function populateBookings ()
{
    const organizationID = orgList.value;
    const eventID = eventList.value;

    // Clear report table
    let child = reportTable.lastElementChild;
    while (child)
    {
        reportTable.removeChild(child);
        child = reportTable.lastElementChild;
    }

    // Get report data
    fetch("/get-report-data?organizationID=" + organizationID + "&eventID=" + eventID)
    .then(response => response.json())
    .then(data => {
        originalData = data;
        console.log(data);

        if (bookingTypeList.value === "flight")
        {
            data = data.flights;
        }
        else if (bookingTypeList.value === "hotel")
        {
            data = data.hotels;
        }

        if (document.getElementById("no-booking-display"))
        {
            reportTableDiv.removeChild(document.getElementById("no-booking-display"));
        }

        if (originalData.err || data.length === 0)
        {
            const noBookingDisplay = $ce("div");
            noBookingDisplay.className = "no-info-div";
            noBookingDisplay.id = "no-booking-display";
            const banSVG = createBanSVG();
            noBookingDisplay.appendChild(banSVG);
            const noBookingWords = $ce("span");
            noBookingWords.textContent = "This event currently has no data.";
            noBookingDisplay.appendChild(noBookingWords);
            reportTableDiv.appendChild(noBookingDisplay);
            
            // Disable Export Buttons
            exportCSVBtn.disabled = true;
            exportCSVBtn.classList.add("disabled");
            exportXLSXBtn.disabled = true;
            exportXLSXBtn.classList.add("disabled");

            console.log("No Bookings");
            return;
        }

        // Enable Export Buttons
        exportCSVBtn.disabled = false;
        exportCSVBtn.classList.remove("disabled");
        exportXLSXBtn.disabled = false;
        exportXLSXBtn.classList.remove("disabled");

        const headerRow = $ce("tr");
        const headerValues = [];
        for (const [key, value] of Object.entries(data[0]))
        {
            headerValues.push(key);

            var th = $ce("th");
            th.textContent = key;
            headerRow.appendChild(th);
        }
        reportTable.appendChild(headerRow);
        
        data.forEach(booking => {
            var tr = $ce("tr");
            headerValues.forEach(key => {
                var td = $ce("td");

                // Check for specific keys and circumstances
                if (key === "Approver Last Name" && booking[key] == null)
                {
                    booking[key] = "None";
                }
                if (key === "Approver First Name" && booking[key] == null)
                {
                    booking[key] = "None";
                }
                if (key === "Approval Status")
                {
                    if (booking[key] === "denied") booking[key] = "Denied";
                    if (booking[key] === "approved") booking[key] = "Confirmed";
                    if (booking[key] === "escalation" || booking[key] === "pending") booking[key] = "Pending";
                }
                if (key === "Hotel Name")
                {
                    booking[key] = booking[key].replaceAll("&amp;", "&");
                }

                td.textContent = booking[key];
                tr.appendChild(td);
            });
            reportTable.appendChild(tr);
        });
    });
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
        eventHeader.textContent = "No Event";
        eventDetails.appendChild(eventHeader);
    }
    else
    {
        console.log(eventList.selectedIndex);
        const eventSpecifcs = eventList.options[0].value !== 0 ? eventInfo[eventList.selectedIndex] : eventInfo[eventList.selectedIndex] - 1;
        console.log(eventSpecifcs);
        const eventHeader = $ce("h3");
        eventHeader.textContent = eventSpecifcs.eventName;
        eventDetails.appendChild(eventHeader);

        // Overall Budget
        const overallBudget = $ce("h4");
        overallBudget.textContent = "Overall Budget: " + moneyFormatter.format(eventSpecifcs.overallBudget);
        eventDetails.appendChild(overallBudget);

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
    }
}

/** Convert to CSV */
function tableToCSV() 
{

    // Variable to store the final csv data
    let csv_data = [];

    // Get each row data
    let rows = reportTable.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {

        // Get each column data
        let cols = rows[i].querySelectorAll('td,th');

        // Stores each csv row data
        let csvrow = [];
        for (let j = 0; j < cols.length; j++) {

            // Get the text data of each cell of
            // a row and push it to csvrow
            csvrow.push(cols[j].innerHTML);
        }

        // Combine each column value with comma
        csv_data.push(csvrow.join(","));
    }
    // Combine each row data with new line character
    csv_data = csv_data.join('\n');

    /* We will use this function later to download
    the data in a csv file downloadCSVFile(csv_data);
    */
   downloadCSVFile(csv_data);
}

function downloadCSVFile(csv_data) 
{
    const eventName = eventList.options[eventList.selectedIndex].textContent;
    const dateStamp = (new Date()).toLocaleDateString().replaceAll("/", "-");

    // Create CSV file object and feed our
    // csv_data into it
    CSVFile = new Blob([csv_data], { type: "text/csv" });

    // Create to temporary link to initiate
    // download process
    let temp_link = document.createElement('a');

    // Download csv file
    temp_link.download =  eventName + "-report-" + dateStamp + ".csv";
    let url = window.URL.createObjectURL(CSVFile);
    temp_link.href = url;

    // This link should not be displayed
    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    // Automatically click the link to trigger download 
    temp_link.click();
    document.body.removeChild(temp_link);
}

function downloadXLSXFile () 
{
    const eventName = eventList.options[eventList.selectedIndex].textContent;
    const dateStamp = (new Date()).toLocaleDateString().replaceAll("/", "-");

    const html = reportTable.outerHTML;

    const blob = new Blob([html], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    // Create to temporary link to initiate
    // download process
    let temp_link = document.createElement('a');
 
    let url = window.URL.createObjectURL(blob);
    temp_link.href = url;

    // This link should not be displayed
    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    // Download csv file
    temp_link.download =  eventName + "-report-" + dateStamp + ".xls";

    // Automatically click the link to trigger download 
    temp_link.click();
    document.body.removeChild(temp_link);
}


// On Load
document.addEventListener('DOMContentLoaded', function () {
    populateOrganizations();

    if (orgList)
    {
        orgList.addEventListener("change", function () {
            populateEvents();
        });
    }
    
    if (eventList)
    {
        eventList.addEventListener("change", function () {
            changeEventInfo();
            populateBookings();
        });
    }

    if (bookingTypeList)
    {
        bookingTypeList.addEventListener("change", function () {
            populateBookings();
        });
    }

    if (exportCSVBtn)
    {
        exportCSVBtn.addEventListener("click", function () {
            tableToCSV();
        });
    }

    if (exportXLSXBtn)
    {
        exportXLSXBtn.addEventListener("click", function () {
            downloadXLSXFile();
        });
    }
});