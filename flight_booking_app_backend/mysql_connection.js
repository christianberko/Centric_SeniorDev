import express from 'express';
import bodyParser from 'body-parser';
import cors from "cors";
import { createConnection } from 'mysql2';

const app = express();
const PORT = 3000;
app.use(bodyParser.json())
app.use(cors());
// app.use(cors({
//     origin: 'http://localhost:4200'
// }));
app.listen(PORT, () =>
    console.log(`Server is running on port: http://localhost:${PORT}`)
);

var con = createConnection({
    host: "localhost",
    user: "root",
    password: "student",
    port: 3306
});

con.connect(function(err) {
    if (err)
    {
        throw err;
    }
    console.log("Connected!");
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    con.query("USE centric", function (err, result) {
        if (err) throw err;
        console.log("Database in use");
    });
});

app.get(`/user-test`, (req, res) => {
    const firstName = req.query.firstName;
    const middleName = req.query.middleName;
    const lastName = req.query.lastName;
    const suffix = req.query.suffix;
    const email = req.query.email;
    const birthdate = req.query.birthdate;
    const preferredName = req.query.preferredName;
    const phoneNumber = req.query.phoneNumber;
    const ktn = req.query.ktn;
    const gender = req.query.gender;
    const password = req.query.password;
    
    con.connect(function (err) {
        if (err) throw err;
        console.log("Inserting user...");
        var sql = `INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN) ` +
                `VALUES ('${email}', '${firstName}', '${middleName}', '${lastName}', '${suffix}', '${phoneNumber}', '${preferredName}', '${gender}', '${birthdate}', '${ktn}')`;
        console.log(sql);
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("User record inserted");
            console.log(result);
            var insertID = result.insertId;
            sql = `INSERT INTO cred (userID, pass, salt) VALUES (${insertID}, '${password}', 'ch4au3idwq')`;
            con.query(sql, function (err, result) {
                if (err) throw err;
                console.log("Cred record inserted");
                console.log(result);
            });
        });
    });

    res.send("Success");
});

app.get(`/user-personal-information`, (req, res) => {
    const email = req.query.email;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT * FROM user WHERE email = '${email}'`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
            //res.send("29 Seconds");
        });
    });
});

app.get(`/update-user-personal-information`, (req, res) => {
    const firstName = req.query.firstName;
    const middleName = req.query.middleName;
    const lastName = req.query.lastName;
    const suffix = req.query.suffix;
    const email = req.query.email;
    const birthdate = req.query.birthdate;
    const preferredName = req.query.preferredName;
    const phoneNumber = req.query.phoneNumber;
    const ktn = req.query.ktn;
    const gender = req.query.gender;
    
    // Email changes will not currently work
    con.connect(function (err) {
        if (err) throw err;
        var sql = `UPDATE user ` +
            `SET email = "${email}", firstName = "${firstName}", middleName = "${middleName}", lastName = "${lastName}", suffix = "${suffix}", phoneNumber = "${phoneNumber}", preferredName = "${preferredName}", gender = "${gender}", birthdate = "${birthdate}", KTN = "${ktn}" ` +
            `WHERE email = "${email}"`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/get-organization-events`, (req, res) => {
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT * FROM event WHERE organizationID = ${organizationID}`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/create-event`, (req, res) => {
    const eventName = req.query.eventName;
    const eventLocation = req.query.eventLocation;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const standardCheckedBags = req.query.standardCheckedBags;
    //const maxFlightTier = req.query.maxFlightTier;
    const maxFlightTier = 1;
    const dateTimeBuffer = req.query.dateTimeBuffer;
    const layoverMax = req.query.layoverMax;
    const firstApproval = req.query.firstApproval;
    const secondApproval = req.query.secondApproval;
    const totalBudget = req.query.totalBudget;
    const organizationID = 1; // Put in real ID

    con.connect(function (err) {
        if (err) throw err;
        var sql = `INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier) ` +
        `VALUES ("${eventName}", "${eventLocation}", '${startDate}', '${endDate}', ${standardCheckedBags}, ${layoverMax}, '${dateTimeBuffer}', '${firstApproval}', '${secondApproval}', '${totalBudget}', ${organizationID}, ${maxFlightTier})`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/get-organization-approvals`, (req, res) => {
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT firstName, middleName, lastName, eventName, bookingID, approved, cost, booking.checkedBags AS "bookingCheckedBags", firstThreshold, secondThreshold, overallBudget, startDate, endDate, event.checkedBags AS "allowedCheckedBags", layoverMax, eventLocation, dateTimeBuffer, maxFlightTier, organizationID, flightTierName ` + 
                `FROM booking JOIN event USING (eventID) JOIN user USING (userID) JOIN flightTier ON maxFlightTier = flightTierID ` +
                `WHERE (organizationID = ${organizationID} AND approved <> 'T' AND approved <> 'F')`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/update-booking-approval`, (req, res) =>
{
    const bookingID = req.query.bookingID;
    const decision = req.query.decision;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `UPDATE booking ` +
            `SET approved = "${decision}" ` +
            `WHERE bookingID = "${bookingID}"`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/get-organizations-from-user`, (req, res) => {
    const userID = req.query.userID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT DISTINCT organizationID, organizationName ` +
        `FROM user JOIN user_group USING (userID) ` +
        `JOIN rolegroup USING (groupID) ` +
        `JOIN organization USING (organizationID) ` +
        `WHERE userID = ${userID}`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/get-organization-users`, (req, res) => {
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT userID, firstName, lastName, email, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(groupID SEPARATOR '&&') AS "groupsInID" ` +
                   `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
                   `WHERE organizationID = ${organizationID} ` +
                   `GROUP BY userID`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/get-organization-groups`, (req, res) => {
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT groupID, groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, flightTierName, COUNT(userID) AS "numMembers"`+
        `FROM rolegroup JOIN flightTier Using (flightTierID) LEFT JOIN user_group USING (groupID) ` +
        `WHERE organizationID = ${organizationID} ` +
        `GROUP BY (groupID) ` +
        `ORDER BY groupID ASC`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/count-organization-events`, (req, res) => {
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT COUNT(eventID) AS "numEvents" ` +
        `FROM event WHERE organizationID = ${organizationID}`;
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/create-organization-group`, (req, res) => {
    const organizationID = req.query.organizationID;
    const flightTierID = req.query.flightTierID;
    const checkedBags = req.query.checkedBags;
    const firstThreshold = req.query.firstThreshold;
    const secondThreshold = req.query.secondThreshold;
    const defaultDateTimeBuffer = req.query.defaultDateTimeBuffer;
    const defaultMaxLayovers = req.query.defaultMaxLayovers;
    const name = req.query.name;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, flightTierID, organizationID) ` +
        `VALUES ('${name}', ${checkedBags}, ${firstThreshold}, ${secondThreshold}, ${defaultMaxLayovers}, '${defaultDateTimeBuffer}', ${flightTierID}, ${organizationID})`;
    
        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/update-organization-group`, (req, res) => {
    const groupID = req.query.groupID;
    const flightTierID = req.query.flightTierID;
    const checkedBags = req.query.checkedBags;
    const firstThreshold = req.query.firstThreshold;
    const secondThreshold = req.query.secondThreshold;
    const defaultDateTimeBuffer = req.query.defaultDateTimeBuffer;
    const defaultMaxLayovers = req.query.defaultMaxLayovers;
    const name = req.query.name;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `UPDATE rolegroup ` +
        `SET groupName = '${name}', checkedBags = ${checkedBags}, defaultFirstThreshold = ${firstThreshold}, defaultSecondThreshold = ${secondThreshold}, defaultMaxLayovers = ${defaultMaxLayovers}, defaultDateTimeBuffer = '${defaultDateTimeBuffer}', flightTierID = ${flightTierID} ` +
        `WHERE groupID = ${groupID}`;

        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result);
            res.send(result);
        });
    });
});

app.get(`/delete-organization-group`, (req, res) => {
    const groupID = req.query.groupID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT adminRole ` +
        `FROM rolegroup WHERE groupID = ${groupID}`;

        con.query(sql, function (err, result, fields) {
            if (err) throw err;
            console.log(result[0].adminRole);
            if (result[0].adminRole == "T")
            {
                res.send({ "error": "You cannot delete an admin group." });
            }
            else
            {
                con.connect(function (err) {
                    if (err) throw err;
                    var sql = `DELETE FROM rolegroup WHERE groupID = ${groupID}`;
            
                    con.query(sql, function (err, result, fields) {
                        if (err) throw err;
                        console.log(result);
                        res.send(result);
                    });
                });
            }
        });
    });
});