// DOM Elements
const organizationList = document.getElementById("organizationList");

const groupListDiv = document.getElementById("groups");
const userPopup = document.getElementById("userPopup");
const deleteUserName = document.getElementById("delete-user-name");
const deleteUserPopup = document.getElementById("delete-user-popup");
const deleteUserErrMsg = document.getElementById("delete-user-error-message");
const deleteGroupPopup = document.getElementById("delete-group-popup");
const emailPopup = document.getElementById("userEmailPopup");
const attendeeFieldset = document.getElementById("attendee-fieldset");
const attendeeFieldsetBoxes = attendeeFieldset.querySelector("div");
const adminFieldset = document.getElementById("admin-fieldset");
const adminFieldsetBoxes = adminFieldset.querySelector("div");

var isNewUser = true;
var isNewGroup = true;

async function populateOrganizations ()
{
    fetch("/get-exec-organizations-from-user")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.err)
            {
                window.location.href = "/signIn?prev=userManagement";
            }
            if (data.length === 0)
            {
                window.location.href = "/organizationSignUp";
            }
            for (let i = 0; i < data.length; i++)
            {
                var option = document.createElement("option");
                option.value = data[i].organizationID;
                option.textContent = data[i].organizationName;

                organizationList.appendChild(option);
            }
            if (data.length == 0)
            {

            }
            else
            {
                populateInfoFromOrganization(data[0].organizationID);
            }
        });
}

async function populateUsers (organizationID)
{
    fetch("/get-organization-users?organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            var userListDiv = document.getElementById("users");
            let child = userListDiv.lastElementChild;
            while (child)
            {
                userListDiv.removeChild(child);
                child = userListDiv.lastElementChild;
            }

            for (let i = 0; i < data.length; i++)
            {
                console.log(data[i].firstName);
                var userDiv = document.createElement("div");
                userDiv.className = "individualUser";
                userDiv.id = "user" + data[i].userID;

                var name = document.createElement("span");
                name.className = "userName";
                if (!data[i].firstName || !data[i].lastName)
                {
                    name.appendChild(document.createTextNode("[Pending Invite]"));
                }
                else
                {
                    name.appendChild(document.createTextNode(data[i].firstName + " " + data[i].lastName));
                }
                userDiv.appendChild(name);

                var email = document.createElement("span");
                email.className = "userEmail";
                email.appendChild(document.createTextNode(data[i].email));
                userDiv.appendChild(email);

                const roles = (data[i].groupsIn).split("&&");
                const rolesAdmin = (data[i].groupsInAdmin).split("&&");
                const rolesID = (data[i].groupsInID).split("&&");

                const adminGroupsArr = [];
                const userGroupsArr = [];

                for (let j = 0; j < rolesAdmin.length; j++)
                {
                    if (rolesAdmin[j] != "false")
                    {
                        adminGroupsArr.push(roles[j]);
                    }
                    else
                    {
                        userGroupsArr.push(roles[j]);
                    }
                }

                // Admin Groups
                var adminGroups = document.createElement("span");
                adminGroups.className = "adminRoles";
                if (adminGroupsArr.length == 0)
                {
                    adminGroups.appendChild(document.createTextNode("No Admin Roles"));
                }
                else if (adminGroupsArr.length == 1)
                {
                    adminGroups.appendChild(document.createTextNode(adminGroupsArr[0]));
                }
                else
                {
                    adminGroups.appendChild(document.createTextNode(adminGroupsArr.length + " Admin Groups"));
                }
                userDiv.appendChild(adminGroups);

                // User Groups
                var userGroups = document.createElement("span");
                userGroups.className = "attendeeRoles";
                if (userGroupsArr.length == 0)
                {
                    userGroups.appendChild(document.createTextNode("No Attendee Roles"));
                }
                else if (userGroupsArr.length == 1)
                {
                    userGroups.appendChild(document.createTextNode(userGroupsArr[0]));
                }
                else
                {
                    userGroups.appendChild(document.createTextNode(userGroupsArr.length + " Attendee Groups"));
                }
                userDiv.appendChild(userGroups);

                console.log(adminGroupsArr);

                var editUser = document.createElement("button");
                editUser.className = "editButton";
                editUser.appendChild(document.createTextNode("Edit"));
                editUser.addEventListener("click", function () { console.log(adminGroupsArr); editUserOpen(data[i].userID, data[i].firstName + " " + data[i].lastName, data[i].email, userGroupsArr, adminGroupsArr, rolesID) });
                userDiv.appendChild(editUser);

                var deleteUser = document.createElement("button");
                deleteUser.className = "deleteButton";
                deleteUser.appendChild(document.createTextNode("Delete"));
                deleteUser.addEventListener("click", function () { fullyRemoveUser(data[i].userID, data[i].firstName + " " + data[i].lastName) });
                userDiv.appendChild(deleteUser);

                userListDiv.appendChild(userDiv);
            }
        });
}

async function populateGroups (organizationID)
{
    console.log("Populate Groups JS Called " + organizationID);

    fetch("/get-organization-groups?organizationID=" + organizationID)
        .then(response => response.json())
        .then(data => {
            console.log(data);

            let child = groupListDiv.lastElementChild;
            while (child)
            {
                groupListDiv.removeChild(child);
                child = groupListDiv.lastElementChild;
            }

            child = attendeeFieldsetBoxes.lastElementChild;
            while (child)
            {
                attendeeFieldsetBoxes.removeChild(child);
                child = attendeeFieldsetBoxes.lastElementChild;
            }

            child = adminFieldsetBoxes.lastElementChild;
            while (child)
            {
                adminFieldsetBoxes.removeChild(child);
                child = adminFieldsetBoxes.lastElementChild;
            }

            createGroupDivs(data.attendeeGroups);
            createGroupDivs(data.adminGroups);
        });
}

function createGroupDivs (data)
{
    for (let i = 0; i < data.length; i++)
        {
            var groupDiv = document.createElement("div");
            groupDiv.className = "individualGroup";
            groupDiv.id = "group" + data[i].groupID;
            groupDiv.dataset.flightTierID = data[i].flightTierID;
            groupDiv.dataset.checkedBags = data[i].checkedBags;
            groupDiv.dataset.firstThreshold = data[i].defaultFirstThreshold;
            groupDiv.dataset.secondThreshold = data[i].defaultSecondThreshold;
            groupDiv.dataset.defaultDateTimeBuffer = data[i].defaultDateTimeBuffer;
            groupDiv.dataset.defaultMaxLayovers = data[i].defaultMaxLayovers;
            groupDiv.dataset.name = data[i].groupName;

            var name = document.createElement("span");
            name.className = "groupName";
            name.appendChild(document.createTextNode(data[i].groupName));
            groupDiv.appendChild(name);

            var numMembers = document.createElement("span");
            numMembers.className = "numMembers";
            numMembers.appendChild(document.createTextNode(data[i].numMembers + " Members"));
            groupDiv.appendChild(numMembers);

            var editGroup = document.createElement("button");
            editGroup.className = "editButton";
            editGroup.appendChild(document.createTextNode("Edit"));
            editGroup.addEventListener("click", function () { editGroupOpen(data[i].groupID) });
            groupDiv.appendChild(editGroup);

            if (data[i].adminRole == "false")
            {
                var deleteGroup = document.createElement("button");
                deleteGroup.className = "deleteButton";
                deleteGroup.appendChild(document.createTextNode("Delete"));
                deleteGroup.addEventListener("click", function () { fullyDeleteGroup(data[i].groupID, data[i].groupName) });
                groupDiv.appendChild(deleteGroup);
            }

            groupListDiv.appendChild(groupDiv);   
            
            // Add group to checkboxes in popups
            const popupDiv = $ce("div");
            popupDiv.className = "group-box";
            const popupLabel = document.createElement("label");
            popupLabel.textContent = data[i].groupName;
            const popupBox = document.createElement("input");
            popupBox.type = "checkbox";
            popupBox.value = data[i].groupID;
            
            if (data[i].adminRole === "false")
            {
                popupLabel.setAttribute("for", "attendeeGroup" + i);
                popupBox.name = "attendeeGroup" + i;
                popupBox.id = "attendeeGroup" + i;
                popupDiv.appendChild(popupBox);
                popupDiv.appendChild(popupLabel);
                attendeeFieldsetBoxes.appendChild(popupDiv);
            }
            else
            {
                popupLabel.setAttribute("for", "adminGroup" + i);
                popupBox.name = "adminGroup" + i;
                popupBox.id = "adminGroup" + i;
                popupDiv.appendChild(popupBox);
                popupDiv.appendChild(popupLabel);
                adminFieldsetBoxes.appendChild(popupDiv);
            }
        }
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
    var organizationID = organizationList.value;

    document.getElementById("organizationNameHeader").textContent = organizationList.options[organizationList.selectedIndex].textContent;
    
    console.log(organizationID);
    countOrganizationEvents(organizationID);
    populateUsers(organizationID);
    populateGroups(organizationID);
}

function inviteUser ()
{
    isNewUser = true;

    userPopup.style.display = "flex";
    userPopup.dataset.userId = "";
    
    document.getElementById("userPopupHeader").textContent = "New User";
    const emailPopup = document.getElementById("userEmailPopup");
    emailPopup.value = "";
    emailPopup.disabled = false;
    // Clear Group Boxes
    const attendeeBoxes = attendeeFieldsetBoxes.querySelectorAll("input");
    attendeeBoxes.forEach(box => {
        box.checked = false;
        box.dataset.prevChecked = "false";
    });
    const adminBoxes = adminFieldsetBoxes.querySelectorAll("input");
    adminBoxes.forEach(box => {
        box.checked = false;
        box.dataset.prevChecked = "false";
    });
}

function editUserOpen (userID, userName, userEmail, attendeeGroupsArr, adminGroupsArr, groupIDs)
{
    isNewUser = false;

    userPopup.style.display = "flex";
    userPopup.dataset.userId = userID;
    
    document.getElementById("userPopupHeader").textContent = userName;
    const emailPopup = document.getElementById("userEmailPopup");
    emailPopup.value = userEmail;
    emailPopup.disabled = true;

    // Fill in Attendee Groups
    console.log(attendeeGroupsArr);
    const attendeeBoxes = attendeeFieldsetBoxes.querySelectorAll("input");
    attendeeBoxes.forEach(box => {
        groupIDs.includes(box.value) ? (box.checked = true, box.dataset.prevChecked = "true") : (box.checked = false, box.dataset.prevChecked = "false");
    });

    // Fil in Admin Groups
    const adminBoxes = adminFieldsetBoxes.querySelectorAll("input");
    adminBoxes.forEach(box => {
        groupIDs.includes(box.value) ? (box.checked = true, box.dataset.prevChecked = "true") : (box.checked = false, box.dataset.prevChecked = "false");
    });
}

function createGroup ()
{
    isNewGroup = true;

    document.getElementById("groupPopup").style.display = "flex";

    document.getElementById("groupPopupHeader").textContent = "New Group";
    document.getElementById("groupNamePopup").value = "";
    document.getElementById("firstThresholdPopup").value = "";
    document.getElementById("secondThresholdPopup").value = "";
    document.getElementById("flightTierPopup").value = "";
    document.getElementById("checkedBagsPopup").value = "";
    document.getElementById("maxLayoversPopup").value = "";
    document.getElementById("dateTimeBufferPopup").value = "";
}

async function saveUser ()
{
    console.log("Saving user", isNewUser);
    const selectedOrg = organizationList.options[organizationList.selectedIndex];
    const email = document.getElementById("userEmailPopup").value;
    const organizationID = organizationList.value;
    const organizationName = selectedOrg.textContent;
    const roles = [];
    const removeRoles = [];
    const attendeeBoxesChecked = attendeeFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const attendeeBoxesUnchecked = attendeeFieldsetBoxes.querySelectorAll('input[type="checkbox"]:not(:checked)');
    const adminBoxesChecked = adminFieldsetBoxes.querySelectorAll('input[type="checkbox"]:checked');
    const adminBoxesUnchecked = adminFieldsetBoxes.querySelectorAll('input[type="checkbox"]:not(:checked)');

    attendeeBoxesChecked.forEach(box => {
        box.dataset.prevChecked == "false" ? roles.push(box.value) : undefined;
    });

    attendeeBoxesUnchecked.forEach(box => {
        box.dataset.prevChecked == "true" ? removeRoles.push(box.value) : undefined;
    });

    adminBoxesChecked.forEach(box => {
        box.dataset.prevChecked == "false" ? roles.push(box.value) : undefined;
    });

    adminBoxesUnchecked.forEach(box => {
        box.dataset.prevChecked == "true" ? removeRoles.push(box.value) : undefined;
    });

    if (roles.length === 0 && removeRoles.length == 0)
    {
        // Display an error here
        return console.log("You must modify at least one group");
    }

    var userObj = {
        email: email,
        organizationID: organizationID,
        organizationName: organizationName,
        roles: roles,
        removeRoles: removeRoles
    };

    if (isNewUser)
    {
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
            cancelUserPopup("reload");
        });
    }
    else
    {
        console.log("Fetching");
        fetch("/edit-user", {
            method: 'POST',
            body: JSON.stringify(userObj),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // Check if there is an error and don't close if there is
            cancelUserPopup("reload");
        });
    }
}

async function saveGroup ()
{
    var groupID = document.getElementById("groupPopup").dataset.currentGroupID;
    var organizationID = organizationList.value;
    var name = document.getElementById("groupNamePopup").value;
    var firstThreshold = document.getElementById("firstThresholdPopup").value;
    var secondThreshold = document.getElementById("secondThresholdPopup").value;
    var flightTierID = document.getElementById("flightTierPopup").value;
    var checkedBags = document.getElementById("checkedBagsPopup").value;
    var defaultMaxLayovers = document.getElementById("maxLayoversPopup").value;
    var defaultDateTimeBuffer = document.getElementById("dateTimeBufferPopup").value;

    if (isNewGroup)
    {
        fetch("/create-organization-group?organizationID=" + organizationID + "&flightTierID=" + flightTierID + "&checkedBags=" + checkedBags + "&firstThreshold=" + firstThreshold + "&secondThreshold=" + secondThreshold + "&defaultDateTimeBuffer=" + defaultDateTimeBuffer + "&defaultMaxLayovers=" + defaultMaxLayovers + "&name=" + name)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.err)
                {
                    document.getElementById("groupPopup").style.display = "";
                }
                else
                {
                    window.location.reload();
                }
            });
    }
    else
    {
        fetch("/update-organization-group?organizationID=" + organizationID + "&groupID=" + groupID + "&flightTierID=" + flightTierID + "&checkedBags=" + checkedBags + "&firstThreshold=" + firstThreshold + "&secondThreshold=" + secondThreshold + "&defaultDateTimeBuffer=" + defaultDateTimeBuffer + "&defaultMaxLayovers=" + defaultMaxLayovers + "&name=" + name)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                if (data.err)
                {
                    document.getElementById("groupPopup").style.display = "";
                }
                else
                {
                    window.location.reload();
                }
            });
    }
}

function editGroupOpen (groupDivID)
{
    document.getElementById("groupPopup").style.display = "flex";

    isNewGroup = false;
    var groupDiv = document.getElementById("group" + groupDivID);
    document.getElementById("groupPopup").dataset.currentGroupID = groupDivID;
    
    document.getElementById("groupPopupHeader").textContent = groupDiv.dataset.name;
    document.getElementById("groupNamePopup").value = groupDiv.dataset.name;
    document.getElementById("firstThresholdPopup").value = groupDiv.dataset.firstThreshold;
    document.getElementById("secondThresholdPopup").value = groupDiv.dataset.secondThreshold;
    document.getElementById("flightTierPopup").value = groupDiv.dataset.flightTierID;
    document.getElementById("checkedBagsPopup").value = groupDiv.dataset.checkedBags;
    document.getElementById("maxLayoversPopup").value = groupDiv.dataset.defaultMaxLayovers;
    document.getElementById("dateTimeBufferPopup").value = groupDiv.dataset.defaultDateTimeBuffer;
}

function fullyRemoveUser (userID, userName)
{
    deleteUserPopup.style.display = "flex";
    deleteUserPopup.dataset.currentUserID = userID;
    deleteUserName.textContent = userName;
}

function fullyDeleteGroup (groupID, groupName)
{
    deleteGroupPopup.style.display = "flex";
    deleteGroupPopup.dataset.currentGroupID = groupID;

    document.getElementById("deleteGroupName").textContent = groupName;
}

async function confirmUserDeletion ()
{
    const organizationID = organizationList.value;
    const userID = deleteUserPopup.dataset.currentUserID;
    fetch("/remove-user-organization-association?organizationID=" + organizationID + "&userID=" + userID)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        var errorMsg = deleteUserErrMsg;
        if (data.err)
        {
            errorMsg.textContent = data.err;
            errorMsg.style.display = "block";
        }
        else
        {
            errorMsg.style.display = "none";
            window.location.href = "/userManagement";
        }
    });
}

async function confirmGroupDeletion ()
{
    const organizationID = organizationList.value;
    var groupID = deleteGroupPopup.dataset.currentGroupID;
    fetch("/delete-organization-group?organizationID=" + organizationID + "&groupID=" + groupID)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                var errorMsg = document.getElementById("deleteGroupErrorMessage");
                if (data.err)
                {
                    errorMsg.textContent = data.err;
                    errorMsg.style.display = "block";
                }
                else
                {
                    errorMsg.style.display = "none";
                    window.location.href = "/userManagement";
                }
            });
}

function cancelUserDeletion ()
{
    deleteUserPopup.style.display = "";
    deleteUserPopup.dataset.currentUserID = "";
    deleteUserErrMsg.textContent = "";
    deleteUserErrMsg.style.display = "none";
}

function cancelGroupDeletion ()
{
    deleteGroupPopup.style.display = "";
    deleteGroupPopup.dataset.currentGroupID = "";
    document.getElementById("deleteGroupErrorMessage").textContent = "";
    document.getElementById("deleteGroupErrorMessage").style.display = "none";
}

function cancelUserPopup (action)
{
    document.getElementById("userPopup").style.display = "";

    if (action == "reload")
    {
        window.location.href = "/userManagement";
    }
}

function cancelGroupPopup ()
{
    document.getElementById("groupPopup").style.display = "";
}