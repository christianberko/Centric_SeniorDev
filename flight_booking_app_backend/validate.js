import sanitizeHtml from 'sanitize-html';

// More restrictive sanitization tags
const allowedHTML = {
    allowedTags: [ 'b', 'i', 'em', 'strong', 'a' ],
    allowedAttributes: {
        'a': [ 'href' ]
    }
};

// Regular expressions for validation
const nameRegex = /^[A-Za-z]{2,}$/;
const middleNameRegex = /^[A-Za-z.]*$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const ktnRegex = /^\d{8,9}$/;
const airportRegex = /^[A-Z]{3}$/;
const eventNameRegex = /^[a-zA-Z0-9\s\-.,'()&]+$/;
const groupNameRegex = /^[a-zA-Z0-9\s\-.,'()&]+$/;
const locationRegex = /^[a-zA-Z0-9\s\-.,'()&]+$/;

// Other validation variables
const titleArr = ['mrs', 'mr', 'ms', 'miss', 'dr'];

export function validateID (id)
{
    const num = parseInt(id);
    if (isNaN(num) || num < 0)
    {
        return false;
    }
    return num;
}

export function validateExpectedBoolean (value)
{
    const strValue = value + "";
    if (strValue != "false" && strValue != "true")
    {
        return false;
    }
    return true;
}

export function validateOrganizationName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!name || name.length < 3 || name.length > 50)
    {
        return false;
    }
    return name;
}

export function validateGroupName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!groupNameRegex.test(name) || name.length > 25)
    {
        return false;
    }
    return name;
}

export function validateEventName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!eventNameRegex.test(name) || name.length > 40)
    {
        return false;
    }
    return name;
}

function validateEventLocation (location)
{
    location = sanitizeHtml(location, allowedHTML);
    if (!locationRegex.test(location) || location.length > 250)
    {
        return false;
    }
    return location;
}

function validateRequiredName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!nameRegex.test(name) || name.length > 25)
    {
        return false;
    }
    return name;
}

function validateNonRequiredName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!name || name.length == 0)
    {
        return null;
    }
    if (!middleNameRegex.test(name) || name.length > 25)
    {
        return false;
    }
    return name;
}

export function validateEmail (email)
{
    email = sanitizeHtml(email, allowedHTML);
    if (!emailRegex.test(email))
    {
        return false;
    }
    return email;
}

function validateBirthdate (birthdate)
{
    birthdate = sanitizeHtml(birthdate, allowedHTML);
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    if (age < 18 || birthdate.value == '' || birthdate.length == 0)
    {
        return false;
    }
    return birthdate;
}

function validatePhoneNumber (phoneNumber)
{
    phoneNumber = sanitizeHtml(phoneNumber);
    if (!phoneRegex.test(phoneNumber))
    {
        return false;
    }
    return "1" + phoneNumber.replaceAll("-", "");
}

function validateKTN (ktn)
{
    ktn = sanitizeHtml(ktn);
    if (!ktn || ktn.length == 0)
    {
        return null;
    }
    if (!ktnRegex.test(ktn))
    {
        return false;
    }
    return ktn;
}

function validateGender (gender)
{
    if (gender != "F" && gender != "M")
    {
        return false;
    }
    return gender;
}

function validateTitle (title)
{
    if (!titleArr.includes(title))
    {
        return false;
    }
    return title;
}

export function validateAirport (airport)
{
    airport = sanitizeHtml(airport);
    if (!airport || airport.length == 0)
    {
        return null;
    }
    if (!airportRegex.test(airport))
    {
        return false;
    }
    return airport;
}

function validatePassword (password, confirmPassword)
{
    if (!passwordRegex.test(password) || password !== confirmPassword)
    {
        return false;
    }
    return password;
}

function validateReset (reset)
{

}

export function validateMFAType (mfaType)
{
    if (mfaType != "email" && mfaType != "authApp")
    {
        return false;
    }
    return mfaType;
}

export function validateMFACode (code)
{
    if (!code || !/^\d{6}$/.test(code))
    {
        return false;
    }
    return code;
}

function validateDepartureAndReturnDates (departureDate, returnDate)
{
    const today = new Date();
    departureDate = new Date(departureDate);
    returnDate = new Date(returnDate);

    var isValid = true;

    if (isNaN(departureDate) || isNaN(returnDate))
    {
        isValid = false;
    }

    if (!departureDate) 
    {
        isValid = false;
    }
    else if (departureDate < today)
    {
        // Allow today's date by comparing just the date part
        const departureDateOnly = new Date(departureDate);
        departureDateOnly.setHours(0, 0, 0, 0);
        
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        
        if (departureDateOnly < todayOnly) 
        {
            isValid = false;
        }
    }

    // Validate return date
    if (!returnDate)
    {
        isValid = false;
    } 
    else if (returnDate)
    {
        if (!departureDate) 
        {
            isValid = false;
        } 
        else 
        {
            // Compare dates without time components
            const departureDateOnly = new Date(departureDate);
            departureDateOnly.setHours(0, 0, 0, 0);
            
            const returnDateOnly = new Date(returnDate);
            returnDateOnly.setHours(0, 0, 0, 0);
            
            if (returnDateOnly < departureDateOnly) 
            {
                isValid = false;
            }
        }
    }

    return isValid;
}

export function validateCheckInAndCheckOutDates (checkInDate, checkOutDate)
{
    const today = new Date();
    checkInDate = new Date(checkInDate);
    checkOutDate = new Date(checkOutDate);

    var isValid = true;

    if (isNaN(checkInDate) || isNaN(checkOutDate))
    {
        isValid = false;
    }

    if (!checkInDate) 
    {
        isValid = false;
    }
    else if (checkInDate < today)
    {
        // Allow today's date by comparing just the date part
        const checkInDateOnly = new Date(checkInDate);
        checkInDateOnly.setHours(0, 0, 0, 0);
        
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        
        if (checkInDateOnly < todayOnly) 
        {
            isValid = false;
        }
    }

    // Validate return date
    if (!checkOutDate)
    {
        isValid = false;
    } 
    else if (checkOutDate)
    {
        if (!checkInDate) 
        {
            isValid = false;
        } 
        else 
        {
            // Compare dates without time components
            const checkInDateOnly = new Date(checkInDate);
            checkInDateOnly.setHours(0, 0, 0, 0);
            
            const checkOutDateOnly = new Date(checkOutDate);
            checkOutDateOnly.setHours(0, 0, 0, 0);
            
            if (checkOutDateOnly < checkInDateOnly) 
            {
                isValid = false;
            }
        }
    }

    return isValid;
}

export function validateFlightTierID (id)
{
    id = validateID(id);
    if (!id)
    {
        return false;
    }
    if (id < 1 || id > 4)
    {
        return false;
    }
    return id;
}

function validateMaxConnections (connections)
{
    connections = validateID(connections);
    if (!connections)
    {
        return false;
    }
    if (connections > 2)
    {
        connections = 2;
    }
    return connections;
}

export function validateHotelName (name)
{
    name = sanitizeHtml(name, allowedHTML);
    if (!name || name.length == 0 || name.length > 255)
    {
        return false;
    }
    return name;
}

function validateCheckedBags (num)
{
    num = validateID(num);
    if (!num)
    {
        return false;
    }
    if (num != 1)
    {
        num = 1;
    }
    return num;
}

function validateEventThresholds (firstApproval, secondApproval)
{
    if (isNaN(firstApproval) || firstApproval <= 0 || firstApproval > 9999)
    {
        return { firstApproval: false, secondApproval: false };
    }
    if (isNaN(secondApproval) || secondApproval <= 0 || secondApproval > 9999)
    {
        return {firstApproval: false, secondApproval: false};
    }
    if (secondApproval < firstApproval)
    {
        return {firstApproval: false, secondApproval: false};
    }

    firstApproval = Math.round(firstApproval * 100) / 100;
    secondApproval = Math.round(secondApproval * 100) / 100;

    return { firstApproval: firstApproval, secondApproval: secondApproval };
}

function validateOverallBudget (overallBudget)
{
    if (isNaN(overallBudget) || overallBudget > 999999)
    {
        return false;
    }
    return Math.round(overallBudget * 100) / 100;
}

function validateGroupThresholds (firstThreshold, secondThreshold)
{
    var firstNum = parseFloat(firstThreshold);
    if (isNaN(firstNum) || (firstNum < 0 && firstNum > 100))
    {
        return { firstThreshold: false, secondThreshold: false };
    }
    var secondNum = parseFloat(secondThreshold);
    if (isNaN(secondNum) || (secondNum < 0 && secondNum > 100))
    {
        return { firstThreshold: false, secondThreshold: false };
    }
    if (secondNum < firstNum)
    {
        return { firstThreshold: false, secondThreshold: false };
    }
    firstNum = Math.round(firstNum * 100) / 100;
    secondNum = Math.round(secondNum * 100) / 100;

    return { firstThreshold: firstNum, secondThreshold: secondNum };
}

/**
 * 
 * @param {*} allowedAirports Expected to be an array of airports
 */
function validateAirportArray (allowedAirports)
{
    var isValid = true;
    var trueCounter = 0;

    try
    {
        allowedAirports.forEach(airport => {
            if (!validateAirport(airport[0]) || (airport[1] != "true" && airport[1] != "false"))
            {
                isValid = false;
            }
            if (airport[1] == "true")
            {
                trueCounter++;
            }
        });

        if (allowedAirports.length === 0)
        {
            isValid = false;
        }
    }
    catch (err)
    {
        console.log("Not an Array of Airports");
        return false;
    }

    if (!isValid || trueCounter > 1)
    {
        return false;
    }

    return allowedAirports;
}

function validateHotelsAllowed (hotelsAllowed)
{
    if (hotelsAllowed !== "true" && hotelsAllowed !== "false")
    {
        return false;
    }
    return hotelsAllowed;
}

function validateCityCode (cityCode)
{
    cityCode = sanitizeHtml(cityCode);
    if (!airportRegex.test(cityCode))
    {
        return "";
    }
    return cityCode;
}

export function validateUserInfo (firstName, middleName, lastName, email, birthdate, preferredName, phoneNumber, ktn, gender, title, preferredAirport, password, confirmPassword)
{
    firstName = validateRequiredName(firstName);
    middleName = validateNonRequiredName(middleName);
    lastName = validateRequiredName(lastName);
    email = validateEmail(email);
    birthdate = validateBirthdate(birthdate);
    preferredName = validateNonRequiredName(preferredName);
    phoneNumber = validatePhoneNumber(phoneNumber);
    ktn = validateKTN(ktn);
    gender = validateGender(gender);
    title = validateTitle(title);
    preferredAirport = validateAirport(preferredAirport);
    password = validatePassword(password, confirmPassword);

    const userObj = {
        firstName: firstName,
        middleName: middleName,
        lastName: lastName, 
        email: email,
        birthdate: birthdate,
        preferredName: preferredName,
        phoneNumber: phoneNumber,
        ktn: ktn,
        gender: gender,
        title: title,
        preferredAirport: preferredAirport,
        password: password
    };
    console.log("User Obj", userObj);
    if (!firstName || (!middleName && middleName != null) || !lastName || !email || !birthdate || (!preferredName && preferredName != null) || 
        !phoneNumber || (!ktn && ktn != null) || !gender || !title || (!preferredAirport && preferredAirport != null) || !password)
    {
        console.log("Failed User Validation");
        return false;
    }
    return userObj;
}

// console.log(validateUserInfo("Nick", "", "Ward", "explodypan@gmail.com", "2000-01-01", "N", "222-222-2929", "123456789", "M", "mr", "ROC", "reallySecure34$", "reallySecure34$"));

export function validateAttendeeInfo (eventID, organizationID, email, inEvent)
{
    eventID = validateID(eventID);
    organizationID = validateID(organizationID);
    email = validateEmail(email);
    
    const attendeeObj = {
        eventID: eventID,
        organizationID: organizationID,
        email: email,
        inEvent: inEvent
    };
    console.log(attendeeObj);
    if (!eventID || !organizationID || !email || !validateExpectedBoolean(inEvent))
    {
        return false;
    }
    return attendeeObj;
}

// console.log(validateAttendeeInfo("2", "1", "assassin@thefilter.com", false));

/**
 * 
 * @param {*} eventID Expected to be an eventID
 * @param {*} organizationID Expected to be an organizationID
 * @param {*} users Expected to be an array of emails
 * @param {*} groups Expected to be an array of groupIDs
 */
export function validateEventUserAssociation (eventID, organizationID, users, groups)
{
    eventID = validateID(eventID);
    organizationID = validateID(organizationID);

    if (users.constructor !== Array || groups.constructor !== Array)
    {
        return false;
    }

    // Check every value in the arrays
    var valid = true;

    for (let i = 0; i < users.length; i++)
    {
        users[i] = validateEmail(users[i]);
        if (!users[i])
        {
            valid = false;
        }
    }

    for (let i = 0; i < groups.length; i++)
    {
        groups[i] = validateID(groups[i]);
        if (!groups[i])
        {
            valid = false;
        }
    }

    if (!eventID || !organizationID || !valid)
    {
        return false;
    }

    const eventUserAssocObj = {
        eventID: eventID,
        organizationID: organizationID,
        users: users,
        groups: groups
    };
    return eventUserAssocObj;
}

// console.log(validateEventUserAssociation("1", '2', ["assassin@thefiler.com", "test@test.com", "harper@zahn.com"], [1, 2, '3', "4", 29]));

export function validateRemoveEventUserAssociation (eventID, organizationID, usersToRemove)
{
    eventID = validateID(eventID);
    organizationID = validateID(organizationID);

    if (usersToRemove.constructor !== Array)
    {
        return false;
    }

    var valid = true;

    for (let i = 0; i < usersToRemove.length; i++)
    {
        usersToRemove[i] = validateEmail(usersToRemove[i]);
        if (!usersToRemove[i])
        {
            valid = false;
        }
    }

    if (!eventID || !organizationID || !valid)
    {
        return false;
    }

    const removeEventUserAssocObj = {
        eventID: eventID,
        organizationID: organizationID,
        usersToRemove: usersToRemove
    };
    return removeEventUserAssocObj;
}

/**
 * 
 * @param {*} eventID Expected to be an eventID 
 * @param {*} organizationID Expected to be an organizationID
 * @param {*} userGroup Expected to be an array of objects with an email and groupID { user: "assassin@thefilter.com", group: 2 }
 */
export function validateRemoveEventUserGroupAssociation (eventID, organizationID, userGroup)
{
    eventID = validateID(eventID);
    organizationID = validateID(organizationID);

    if (userGroup.constructor !== Array)
    {
        return false;
    }

    var valid = true;
    for (let i = 0; i < userGroup.length; i++)
    {
        userGroup[i].user = validateEmail(userGroup[i].user);
        userGroup[i].group = validateID(userGroup[i].group);
        if (!userGroup[i].user || !userGroup[i].group)
        {
            valid = false;
        }
    }

    if (!eventID || !organizationID || !valid)
    {
        return false;
    }

    const removeEventUserGroupAssocObj = {
        eventID: eventID,
        organizationID: organizationID,
        userGroup: userGroup
    };
    return removeEventUserGroupAssocObj;
}

export function validateEventUserAdminAssociation (eventID, organizationID, eventUsers, financeUsers, approverUsers)
{
    eventID = validateID(eventID);
    organizationID = validateID(organizationID);

    if (eventUsers.constructor !== Array || financeUsers.constructor !== Array || approverUsers.constructor !== Array)
    {
        return false;
    }

    var valid = true;
    for (let i = 0; i < eventUsers.length; i++)
    {
        eventUsers[i] = validateEmail(eventUsers[i]);
        if (!eventUsers[i])
        {
            valid = false;
        }
    }    

    for (let i = 0; i < financeUsers.length; i++)
    {
        financeUsers[i] = validateEmail(financeUsers[i]);
        if (!financeUsers[i])
        {
            valid = false;
        }
    }

    for (let i = 0; i < approverUsers.length; i++)
    {
        approverUsers[i] = validateEmail(approverUsers[i]);
        if (!approverUsers[i])
        {
            valid = false;
        }
    }

    if (!eventID || !organizationID || !valid)
    {
        return false;
    }

    const eventUserAdminAssocObj = {
        eventID: eventID,
        organizationID: organizationID,
        eventUsers: eventUsers,
        financeUsers: financeUsers,
        approverUsers: approverUsers
    };
    return eventUserAdminAssocObj;
}

// console.log(validateRemoveEventUserAssociation("29", "29.19", ["test@test.com", "harper@zahn.com", "troy@bates.com"]));
// console.log(validateRemoveEventUserGroupAssociation(29, "21", [{ user: "assassin@thefilter.com", group: 1 }]));
// console.log(validateEventUserAdminAssociation(1, "29", ["esme@kanter.com", "rand@zimmeramnn.com"], ["assassin@thefilter.com"], []));

/**
 * 
 * @param {*} email 
 * @param {*} organizationID 
 * @param {*} organizationName 
 * @param {*} roles Expected to be an array of groupIDs 
 */
export function validateInviteUser (email, organizationID, organizationName, roles)
{
    email = validateEmail(email);
    organizationID = validateID(organizationID);
    organizationName = validateOrganizationName(organizationName);

    if (roles.constructor !== Array)
    {
        return false;
    }

    var valid = true;
    for (let i = 0; i < roles.length; i++)
    {
        roles[i] = validateID(roles[i]);
        if (!roles[i])
        {
            valid = false;
        }
    }    

    if (!email || !organizationID || !organizationName || !valid)
    {
        return false;
    }

    const inviteUserObj = {
        email: email,
        organizationID: organizationID,
        organizationName: organizationName,
        roles: roles
    };
    return inviteUserObj;
}

/**
 * 
 * @param {*} email 
 * @param {*} organizationID 
 * @param {*} organizationName 
 * @param {*} roles Expected to be an array of groupIDs 
 * @param {*} removeRoles Expected to be an array of groupIDs
 */
export function validateEditUser (email, organizationID, organizationName, roles, removeRoles)
{
    email = validateEmail(email);
    organizationID = validateID(organizationID);
    organizationName = validateOrganizationName(organizationName);

    if (roles.constructor !== Array || removeRoles.constructor !== Array)
    {
        return false;
    }

    var valid = true;
    for (let i = 0; i < roles.length; i++)
    {
        roles[i] = validateID(roles[i]);
        if (!roles[i])
        {
            valid = false;
        }
    }    

    for (let i = 0; i < removeRoles.length; i++)
    {
        removeRoles[i] = validateID(removeRoles[i]);
        if (!removeRoles[i])
        {
            valid = false;
        }
    }

    if (!email || !organizationID || !organizationName || !valid)
    {
        return false;
    }

    const editUserObj = {
        email: email,
        organizationID: organizationID,
        organizationName: organizationName,
        roles: roles,
        removeRoles
    };
    return editUserObj;
}

// console.log(validateInviteUser("assassin@thefilter.com", "29.0", "The Filter", ["Test", 1, 29, 12] ));
// console.log(validateEditUser("assassin@thefilter.com", "29.0", "The Filter", ["2", 1, 29, 12], [] ));

export function validateFlightSearch (originCode, destinationCode, dateOfDeparture, dateOfReturn, flightTierID, maxConnections)
{
    originCode = validateAirport(originCode);
    destinationCode = validateAirport(destinationCode);
    flightTierID = validateFlightTierID(flightTierID);
    maxConnections = validateMaxConnections(maxConnections);
    
    if (!originCode || !destinationCode || !validateDepartureAndReturnDates(dateOfDeparture, dateOfReturn) || !flightTierID || !maxConnections)
    {
        return false;
    }

    const flightSearchObj = {
        originCode: originCode,
        destinationCode: destinationCode,
        dateOfDeparture: dateOfDeparture,
        dateOfReturn: dateOfReturn,
        flightTierID: flightTierID,
        maxConnections: maxConnections
    };
    return flightSearchObj;
}

// console.log(validateFlightSearch("ROC", "PHX", "Testing", "2025-11-11", "3", "29"));

export function validatePasswordReset (email, reset, pass, confirmPass)
{
    email = validateEmail(email);
    pass = validatePassword(pass, confirmPass);

    if (!email || !pass || !reset)
    {
        return false;
    }

    const passResetObj = {
        email: email,
        reset: reset,
        pass: pass
    };
    return passResetObj;
}

export function validateEventInfo (eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, hotelsAllowed, cityCode)
{
    eventName = validateEventName(eventName);
    eventLocation = validateEventLocation(eventLocation);
    checkedBags = validateCheckedBags(checkedBags);
    maxFlightTier = validateFlightTierID(maxFlightTier);
    dateTimeBuffer = validateID(dateTimeBuffer);
    layoverMax = validateMaxConnections(layoverMax);
    const thresholds = validateEventThresholds(firstThreshold, secondThreshold);
    firstThreshold = thresholds.firstApproval;
    secondThreshold = thresholds.secondApproval;
    overallBudget = validateOverallBudget(overallBudget);
    organizationID = validateID(organizationID);
    allowedAirports = validateAirportArray(allowedAirports);
    // hotelsAllowed = validateHotelsAllowed(hotelsAllowed);
    cityCode = validateCityCode(cityCode);

    const eventInfoObj = {
        eventName: eventName,
        eventLocation: eventLocation,
        startDate: startDate,
        endDate: endDate,
        checkedBags: checkedBags,
        maxFlightTier: maxFlightTier,
        dateTimeBuffer: dateTimeBuffer,
        layoverMax: layoverMax,
        firstThreshold: firstThreshold,
        secondThreshold: secondThreshold,
        overallBudget: overallBudget,
        organizationID: organizationID,
        allowedAirports: allowedAirports,
        hotelsAllowed: hotelsAllowed + "",
        cityCode: cityCode
    };
    if (!eventName || !eventLocation || !validateDepartureAndReturnDates(startDate, endDate) || !checkedBags || !maxFlightTier || !dateTimeBuffer ||
        !layoverMax || !firstThreshold || !secondThreshold || !overallBudget || !organizationID || !allowedAirports || !validateExpectedBoolean(hotelsAllowed))
    {
        // console.log("Failed Event Info Validation");
        // console.log("Event Name", !eventName);
        // console.log("Event Location", !eventLocation);
        // console.log("Dates", !validateDepartureAndReturnDates(startDate, endDate));
        // console.log("Checked", !checkedBags);
        // console.log("Tier", !maxFlightTier);
        // console.log("Buffer", !dateTimeBuffer);
        // console.log("Layover", !layoverMax);
        // console.log("First", !firstThreshold);
        // console.log("Sec", !secondThreshold);
        // console.log("Overall", !overallBudget);
        // console.log("Org ID", !organizationID);
        // console.log("Allowed Airports", allowedAirports);
        // console.log("Hotels Allowed", !validateExpectedBoolean(hotelsAllowed));
        // console.log("City Code", !cityCode);
        return false;
    }
    console.log(eventInfoObj);
    return eventInfoObj;
}

// console.log(validateEventInfo("Camlar Rescue", "1 Main St.", '2025-04-08', '2025-04-09', "1", 2, 2, 4, 550.296, 550.297, 19990, 1, [['BWI', 'false']], "false", 'ROC'));

export function validateEventModifyInfo (eventID, eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, currentAllowedAirports, hotelsAllowed, cityCode)
{
    eventID = validateID(eventID);
    eventName = validateEventName(eventName);
    eventLocation = validateEventLocation(eventLocation);
    checkedBags = validateCheckedBags(checkedBags);
    maxFlightTier = validateFlightTierID(maxFlightTier);
    dateTimeBuffer = validateID(dateTimeBuffer);
    layoverMax = validateMaxConnections(layoverMax);
    const thresholds = validateEventThresholds(firstThreshold, secondThreshold);
    firstThreshold = thresholds.firstApproval;
    secondThreshold = thresholds.secondApproval;
    overallBudget = validateOverallBudget(overallBudget);
    organizationID = validateID(organizationID);
    allowedAirports = validateAirportArray(allowedAirports);
    currentAllowedAirports = validateAirportArray(currentAllowedAirports);
    // hotelsAllowed = validateHotelsAllowed(hotelsAllowed);
    cityCode = validateCityCode(cityCode);

    const eventInfoObj = {
        eventID: eventID,
        eventName: eventName,
        eventLocation: eventLocation,
        startDate: startDate,
        endDate: endDate,
        checkedBags: checkedBags,
        maxFlightTier: maxFlightTier,
        dateTimeBuffer: dateTimeBuffer,
        layoverMax: layoverMax,
        firstThreshold: firstThreshold,
        secondThreshold: secondThreshold,
        overallBudget: overallBudget,
        organizationID: organizationID,
        allowedAirports: allowedAirports,
        currentAllowedAirports: currentAllowedAirports,
        hotelsAllowed: hotelsAllowed,
        cityCode: cityCode
    };
    if (!eventID || !eventName || !eventLocation || !validateDepartureAndReturnDates(startDate, endDate) || !checkedBags || !maxFlightTier || !dateTimeBuffer ||
        !layoverMax || !firstThreshold || !secondThreshold || !overallBudget || !organizationID || !allowedAirports || !currentAllowedAirports || !validateExpectedBoolean(hotelsAllowed))
    {
        return false;
    }
    return eventInfoObj;
}

export function validateGroupInfo (organizationID, flightTierID,  checkedBags, firstThreshold, secondThreshold, defaultDateTimeBuffer, defaultMaxLayovers, name)
{
    organizationID = validateID(organizationID);
    flightTierID = validateFlightTierID(flightTierID);
    checkedBags = validateCheckedBags(checkedBags);
    const thresholds = validateGroupThresholds(firstThreshold, secondThreshold);
    firstThreshold = thresholds.firstThreshold;
    secondThreshold = thresholds.secondThreshold;
    defaultDateTimeBuffer = validateID(defaultDateTimeBuffer);
    defaultMaxLayovers = validateMaxConnections(defaultMaxLayovers);
    name = validateGroupName(name);

    const groupInfoObj = {
        organizationID: organizationID,
        flightTierID: flightTierID,
        checkedBags: checkedBags,
        firstThreshold: firstThreshold,
        secondThreshold: secondThreshold,
        defaultDateTimeBuffer: defaultDateTimeBuffer,
        defaultMaxLayovers: defaultMaxLayovers,
        name: name
    };
    if (!organizationID || !flightTierID || !checkedBags || (!firstThreshold && firstThreshold != 0) || (!secondThreshold && secondThreshold != 0) || !defaultDateTimeBuffer ||
        !defaultMaxLayovers || !name)
    {
        return false;
    }
    return groupInfoObj;
}

// console.log(validateGroupInfo("20", 3, 2, 5.21555, 28.289, 2, 3, "Test"));

export function validateGroupModifyInfo (organizationID, groupID, flightTierID,  checkedBags, firstThreshold, secondThreshold, defaultDateTimeBuffer, defaultMaxLayovers, name)
{
    organizationID = validateID(organizationID);
    groupID = validateID(groupID);
    flightTierID = validateFlightTierID(flightTierID);
    checkedBags = validateCheckedBags(checkedBags);
    const thresholds = validateGroupThresholds(firstThreshold, secondThreshold);
    firstThreshold = thresholds.firstThreshold;
    secondThreshold = thresholds.secondThreshold;
    defaultDateTimeBuffer = validateID(defaultDateTimeBuffer);
    defaultMaxLayovers = validateMaxConnections(defaultMaxLayovers);
    name = validateGroupName(name);

    const groupInfoObj = {
        organizationID: organizationID,
        groupID: groupID,
        flightTierID: flightTierID,
        checkedBags: checkedBags,
        firstThreshold: firstThreshold,
        secondThreshold: secondThreshold,
        defaultDateTimeBuffer: defaultDateTimeBuffer,
        defaultMaxLayovers: defaultMaxLayovers,
        name: name
    };
    if (!organizationID || !groupID || !flightTierID || !checkedBags || (!firstThreshold && firstThreshold != 0) || (!secondThreshold && secondThreshold != 0) || !defaultDateTimeBuffer ||
        !defaultMaxLayovers || !name)
    {
        return false;
    }
    return groupInfoObj;
}