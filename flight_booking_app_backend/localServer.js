import express, { query } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from "mysql2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Duffel } from '@duffel/api';
import Amadeus from 'amadeus';
import cors from 'cors';
import nodemailer from 'nodemailer';
import { generate } from 'generate-password';
import * as sp from 'speakeasy';
import { toDataURL } from 'qrcode';
import { encryptField, decryptField } from './kmsEncrypt.js';

  
// Convert __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET_KEY = "centric"; // CHANGE FOR PRODUCTION

const app = express();

// KMS test route
app.get('/kms-test', async (req, res) => {
    const testData = "Hello KMS!";
    try {
      const encrypted = await encryptField(testData);
      const decrypted = await decryptField(encrypted);
      res.json({
        original: testData,
        encrypted,
        decrypted
      });
    } catch (err) {
      console.error("KMS test error:", err); // ⬅ log full error
      res.status(500).json({ error: "KMS encryption test failed." });
    }
  });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// app.use(cors()); // Testing Only

// Serve static files
app.use(express.static(path.join(__dirname, '../flight_booking_app_frontend')));

// Import auth routes
//app.use('/auth', authRoutes);

// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const con = createConnection({
  host: "localhost",
  user: "root",
  password: "CisumNoel147#!28",
  port: 3306,
  database: "centric", // Add the database here
});

con.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    throw err;
  }
  console.log("Auth DB connected");
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    con.query("USE centric", function (err, result) {
        if (err) throw err;
        console.log("Database in use");
    });
});

// Register User
app.post("/register", async (req, res) => {
  const { email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN, password } = req.body;

  // Check if user already exists
  con.query(
    "SELECT * FROM user JOIN cred USING (userID) WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).send("Database error");
    
      if (results.length > 0 && results[0].isTemp == "T")
      {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sqlUpdate = `UPDATE user ` +
                        `SET firstName = ?, middleName = ?, lastName = ?, phoneNumber = ?, preferredName = ?, gender = ?, birthdate = ?, KTN = ? ` +
                        `WHERE userID = ?`;
        con.query(sqlUpdate, [firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN, results[0].userID], (err, result) => {
            if (err)
            {
                console.log(err);
                return res.status(500).send("Error creating user");
            }

            const sqlCredUpdate = `UPDATE cred ` +
                                `SET pass = ?, isTemp = "F" ` +
                                `WHERE userID = ?`;
            con.query(sqlCredUpdate, [hashedPassword, results[0].userID], (err) => {
                if (err) return res.status(500).send("Error updating credentials");
                //res.status(201).send("User fully registered!");
                console.log("User Fully Registered");
                res.cookie('email', email, { maxAge: 300000 });
                return res.redirect(303, "/mfaConfig");
            });
        });
      }
      else if (results.length > 0)
      {
        return res.status(400).send("User already exists");
      }
      else
      {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const sqlUser = "INSERT INTO user (email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        con.query(sqlUser, [email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN], (err, result) => {
        if (err) 
        {
            console.log(err);
            return res.status(500).send("Error creating user");
        };

        const userId = result.insertId;

        // Insert credentials into 'cred' table
        const sqlCred = "INSERT INTO cred (userID, pass, salt) VALUES (?, ?, ?)";
        con.query(sqlCred, [userId, hashedPassword, "salt"], (err) => {
            if (err) return res.status(500).send("Error saving credentials");
            console.log("User Successfully Registered");
            res.cookie('email', email, { maxAge: 300000 });
            return res.redirect(303, "/mfaConfig");
        });
        });
      }
    }
  );
});

app.get(`/mfa-qr-generate`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        return res.redirect(303, `/signIn`);
    }

    var secret = sp.generateSecret();
    console.log(secret.base32);
    
    const qr = sp.otpauthURL({secret: secret.ascii, label: "Centric Flights: " + email});
    
    toDataURL(qr, function (err, data_url) {
        console.log(data_url);
        const sql = `UPDATE cred JOIN user USING (userID) ` +
                `SET mfaSecret = ? ` +
                `WHERE email = ?`;
        con.query(sql, [secret.base32, email], (err, results, fields) => {
            if (err) return res.status(500).send(err);

            return res.send(data_url);
        });
    });
});

// Email API Endpoint
// Create a transporter object using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'hotmail', 'yahoo', etc. if needed
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: 'centricflights@gmail.com',
        pass: 'ymvw ezrq nzzq vmah'
    }
});

// Function to send an email
export async function sendEmail(to, subject, text) {
    const mailOptions = {
        from: '"Centric Flights" <centricflights@gmail.com>',
        to: to,
        subject: subject,
        text: text
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

app.get(`/test-random-pass`, (req, res) => {
    var randomPass = generate({
        length: 15,
        numbers: true,
        symbols: true,
        strict: true
    });
    res.send(randomPass);
});

app.get(`/userManagement`, (req, res) => {
    const token = req.cookies.jwt;
    console.log(token);
    const secret = SECRET_KEY;
    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        res.send("Success");
        //res.render("../flight_booking_app_frontend/userManagement.html");
    }
    catch (error)
    {
        // Alert with lacking of permissions
        // Redirect to current page
        console.log("Not Validated");
        //res.send("Test");
        res.redirect(307, "userManagement.html");
        //res.render("/");
    }
    
});

app.get(`/mfaConfig`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        res.redirect(307, '/signIn');
    }
    res.redirect(307, 'mfaConfiguration.html');
});

app.get(`/userProfileBasic`, (req, res) => {
    var userID = generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, '/signIn');
    }
    res.redirect(307, '/userProfileBasic.html');
});

app.get(`/flightSearch`, (req, res) => {
    // Fix to make it so only those with events have access
    res.redirect(301, 'flightSearch.html');
});

app.get(`/signIn`, (req, res) => {
    res.redirect(301, 'Sign_In/signIn.html');
});

// Login User
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Check user in the database
  con.query("SELECT * FROM user JOIN cred USING (userID) WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).send("Database error");

    console.log(results);
    
    if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking
    
    const user = results[0];
   

    // Compare password with hash
    if (user.isTemp == "T")
    {
        if (user.pass === password)
        {
            return res.redirect(301, 'https://centricflights.com/userSignUp.html');
        }
        else
        {
            return res.status(400).send("Invalid password"); 
        }
    }
    const validPassword = await bcrypt.compare(password, user.pass);
    if (!validPassword) return res.status(400).send("Invalid password"); 

    res.cookie('email', user.email, { maxAge: 300000 });
    res.redirect(303, '/mfa-enter');
  });
});

app.get(`/mfa-enter`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        res.redirect(303, `/signIn`);
    }
    else
    {
        res.redirect(303, "mfa.html");
    }
});

app.post(`/mfa-config-chosen`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        return res.redirect(303, `/signIn`);
    }
    
    const mfaType = req.body.mfaType;
    const mfaTypeEnum = { email: "emailOnly", authApp: "appPref" };
    var sql = `UPDATE cred JOIN user USING (userID) ` +
            `SET mfaType = ? ` +
            `WHERE email = ?`;
    con.query(sql, [mfaTypeEnum[mfaType], email], (err, results, fields) => {
        if (err) return res.status(500).send(err);
        res.send({msg: "Successfully Chosen MFA"});
    });
});

app.post(`/mfa-auth`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        res.redirect(307, '/signIn');
    }

    const token = req.body.mfaCode;
    const mfaType = req.body.mfaType;
    
    var sql = `SELECT * FROM cred JOIN user USING (userID) WHERE email = ?`;
    con.query(sql, [email], (err, results, fields) => {
        if (err) return res.status(500).send(err);

        if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking

        const user = results[0];

        if (mfaType == "authApp")
        {
            const verified = sp.totp.verify({
                secret: user.mfaSecret,
                encoding: 'base32',
                token: token
            });

            console.log("Token - " + token);
            console.log(verified);

            if (!verified) return res.status(500).send({err: "MFA Code Invalid"});
        }
        else if (mfaType == "email")
        {

        }

        var orgRolesSQL = `SELECT organizationID, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(groupID SEPARATOR '&&') AS "groupsInID" ` +
        `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
        `WHERE userID = ? ` +
        `GROUP BY organizationID`; 
        con.query(orgRolesSQL, [user.userID], async (err, resultsSec) => {
            console.log(resultsSec);
        
            var userOrgs = {};
            userOrgs['organizations'] = [];
            for (let i = 0; i < resultsSec.length; i++)
            {
            var orgArr = {};
            orgArr['organizationID'] = resultsSec[i].organizationID;
            orgArr['roles'] = [];
            var groupsIn = (resultsSec[i].groupsIn).split("&&")
            var groupsInAdmin = resultsSec[i].groupsInAdmin.split("&&");
            var groupsInID = resultsSec[i].groupsInID.split("&&");
            for (let j = 0; j < groupsIn.length; j++)
            {
            var roleObj = {};
            roleObj['name'] = groupsIn[j];
            roleObj['admin'] = groupsInAdmin[j];
            roleObj['id'] = groupsInID[j];
        
            orgArr['roles'].push(roleObj);
            }
        
            userOrgs['organizations'].push(orgArr);
            }
            console.log(userOrgs);
        
            // Generate JWT token
            const payload = {
                userID: user.userID,
                email: user.email,
                userOrganizations: userOrgs
            };
        
            const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
            console.log("Token - " + token);
        
            res.cookie('jwt', token, { maxAge: 900000 });
            res.cookie('email', '', { maxAge: 1 });
        
            res.send({msg: "MFA Success"});
            //res.redirect(303, '/');
        });
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
    const maxFlightTier = req.query.maxFlightTier;
    const dateTimeBuffer = req.query.dateTimeBuffer;
    const layoverMax = req.query.layoverMax;
    const firstApproval = req.query.firstApproval;
    const secondApproval = req.query.secondApproval;
    const totalBudget = req.query.totalBudget;
    const organizationID = req.query.organizationID;

    con.connect(function (err) {
        if (err) throw err;
        var sql = `INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier) ` +
        `VALUES ("${eventName}", "${eventLocation}", '${startDate}', '${endDate}', ${standardCheckedBags}, ${layoverMax}, '${dateTimeBuffer}', '${firstApproval}', '${secondApproval}', '${totalBudget}', ${organizationID}, ${maxFlightTier})`;
        con.query(sql, function (err, result, fields) {
            if (err) return res.status(500).send(err);
            console.log(result);
            res.send(result);
        });
    });
});

app.post(`/modify-event`, async (req, res) => {
    const organizationID = req.body.organizationID;
    const eventID = req.body.eventID;

    //var userID = 1;
    // var userID = await eventAuth(req.cookies.jwt); // Switch to an auth that clears event perms and only allows for event configurations
    // console.log("User ID Below");
    // console.log(userID);
    // if (!userID)
    // {
    //     res.status(401).send({ "error" : "Not Authenticated" });
    //     return;
    // }

    var sql = `UPDATE event ` +
            `SET eventName = ?, eventLocation = ?, startDate = ?, endDate = ?, checkedBags = ?, maxFlightTier = ?, dateTimeBuffer = ?, layoverMax = ?, firstThreshold = ?, secondThreshold = ?, overallBudget = ? ` +
            `WHERE eventID = ?`;
    var values = [req.body.eventName, req.body.eventLocation, req.body.startDate, req.body.endDate, req.body.checkedBags, req.body.flightTier, req.body.dateTimeBuffer, req.body.layoverMax, req.body.firstThreshold, req.body.secondThreshold, req.body.overallBudget, eventID];
    con.query(sql, values, function (err, result, fields) {
        if (err) return res.status(500).send(err);
        console.log(result);
        res.send(result);
    });
});

app.get(`/get-organization-users-not-in-event`, (req, res) => {
    const organizationID = req.query.organizationID;
    const eventID = req.query.eventID;

    try
    {
        if (true)
        {
            con.connect(function (err) {
                if (err) console.log(err);
                var sql = `SELECT userID, firstName, lastName, email, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(user_group.groupID SEPARATOR '&&') AS "groupsInID" ` +
                           `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) JOIN event_user USING (userID) ` +
                           `WHERE organizationID = ? AND eventID <> ? ` +
                           `GROUP BY userID`;
                con.query(sql, [organizationID, eventID], function (err, result, fields) {
                    if (err) return res.status(500).send(err);
                    console.log(result);
                    res.send(result);
                });
            });
        }
    }
    catch (error)
    {
        res.status(401).json({
            message: 'Invalid token'
        });
    }    
});

app.get(`/get-event-attendees`, (req, res) => {
    const organizationID = req.query.organizationID;
    const eventID = req.query.eventID;

    // const userID = eventAuth(req.cookies.jwt, organizationID);
    // if (!userID)
    // {
    //     return res.send({error: "Invalid Authorization"});
    // }

    var eventAttendees = {};

    // Gets all organization members
    var sql = `SELECT DISTINCT email, firstName, lastName ` +
            `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
            `WHERE organizationID = ?`;
    con.query(sql, [organizationID], async function (err, results, fields) {
        if (err) return res.status(500).send(err);
        
        const orgResults = results;
        console.log(orgResults);

        sql = `SELECT DISTINCT email FROM user JOIN event_user USING (userID) WHERE eventID = ?`;
        con.query(sql, [eventID], async function (err, results, fields) {
            if (err) return res.status(500).send(err);

            var emailArr = [];
            for (let i = 0; i < results.length; i++)
            {
                emailArr.push(results[i].email);
            }

            for (let i = 0; i < orgResults.length; i++)
            {
                var userEmail = orgResults[i].email;
                
                var userObj = {};
                userObj['email'] = userEmail;
                userObj['name'] = orgResults[i].firstName + " " + orgResults[i].lastName;
                if (emailArr.includes(userEmail))
                {
                    userObj['inEvent'] = true;
                }
                else
                {
                    userObj['inEvent'] = false;
                }

                eventAttendees[userEmail] = userObj;
            }

            res.send(eventAttendees);
        });
    });
});

app.post(`/add-event-user-association`,  (req, res) => {
    const userID = 1;
    // const userID = eventAuth(req.cookies.jwt, organizationID);
    // if (!userID)
    // {
    //     return res.send({error: "Invalid Authorization"});
    // }

    const eventID = req.body.eventID;
    const usersToAdd = req.body.users;
    
    var sql = `INSERT INTO event_user (userID, eventID) ` +
            `SELECT userID, ? ` +
            `FROM user ` +
            `WHERE email = ?`;

    for (let i = 0; i < usersToAdd.length; i++)
    {
        con.query(sql, [eventID, usersToAdd[i]], function (err, result, fields) {
            if (err) return res.status(500).send(err);
            console.log(result);
        });
    }

    res.send({msg: "Success"});
});

app.post(`/remove-event-user-association`,  (req, res) => {
    const userID = 1;
    // const userID = eventAuth(req.cookies.jwt, organizationID);
    // if (!userID)
    // {
    //     return res.send({error: "Invalid Authorization"});
    // }

    const eventID = req.body.eventID;
    const usersToRemove = req.body.users;
    
    var sql = `DELETE eu FROM event_user eu ` +
            `JOIN user USING (userID) ` +
            `WHERE email = ? AND eventID = ?`;
    for (let i = 0; i < usersToRemove.length; i++)
    {
        con.query(sql, [usersToRemove[i], eventID], function (err, result, fields) {
            if (err) return res.status(500).send(err);
            console.log(result);
        });
    }

    res.send({msg: "Success"});
});

app.get(`/get-organization-approvals`, (req, res) => {
    const organizationID = req.query.organizationID;
    //var userID = approverAuth(req.cookies.jwt, organizationID);
    var userID = 1;
    if(!userID)
    {
        res.status(401).json({
            message: 'No admin role for organization'
        });
        return;
    }

    con.connect(function (err) {
        if (err) throw err;
        var sql = `SELECT firstName, middleName, lastName, eventName, eventID, bookingID, approved, GROUP_CONCAT(warning) AS "warnings", api, cost, booking.checkedBags AS "bookingCheckedBags", firstThreshold, secondThreshold, overallBudget, startDate, endDate, event.checkedBags AS "allowedCheckedBags", layoverMax, eventLocation, dateTimeBuffer, maxFlightTier, organizationID, flightTierName, json ` +
                `FROM booking JOIN event USING (eventID) JOIN user USING (userID) JOIN flightTier ON maxFlightTier = flightTierID JOIN booking_warning USING (bookingID) ` +
                `WHERE (organizationID = ? AND approved <> 'approved' AND approved <> 'denied') ` +
                `GROUP BY bookingID`;
        con.query(sql, organizationID, function (err, result, fields) {
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

app.post(`/invite-user`, async (req, res) => {
    const secret = SECRET_KEY;

    const email = req.body.email;
    const organizationName = req.body.organizationName;
    //const token = req.cookies.jwt;
    const organizationID = req.body.organizationID;
    console.log(req.body);

    try
    {
        // const decoded = jwt.verify(token, secret);
        // console.log(decoded);
        // const userID = decoded.userID;
        const userID = 4;

        var sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        con.query(sql, [userID, organizationID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking

            for (let i = 0; i < results.length; i++)
            {
                console.log(results[i]);
                if (results[i].adminRole == "event" || results[i].adminRole == "admin")
                {
                    console.log("Authorized - " + userID);
                    
                    // Invite Start

                    // Check if they are an already existing user
                    con.query(`SELECT * FROM user WHERE email = ?`, [email], function (err, result, fields) {
                        if (err) return res.status(500).send(err);

                        if (result.length != 0)
                        {
                            const userID = result[0].userID;

                            // Add Roles
                            const roles = req.body.roles;
                            for (let i = 0; i < roles.length; i++)
                            {
                                var sqlAttRole = `SELECT groupID FROM rolegroup WHERE groupName = ? AND organizationID = ?`;
                                con.query(sqlAttRole, [roles[i], organizationID], function (err, results, fields) {
                                    if (err) return res.status(500).send({error: err});
                                    con.query(`INSERT INTO user_group VALUES (?, ?)`, [userID, results[0].groupID], function (err, results, fields) {
                                        if (err) return res.status(500).send({error: err});
                                    });
                                });
                            }

                            // If this is an event invite
                            if (req.body.event)
                            {
                                var sqlEvent = `INSERT INTO event_user VALUES (?, ?)`;
                                con.query(sqlEvent, [userID, req.body.event.eventID], function (err, results, fields) {
                                    if (err) return res.status(500).send(err);
                                });
                                sendEmail(email, `Invite to a ${organizationName} - Centric Flights"`, `Hello!\n\nYou have been invited to ${organizationName}'s Centric Flights organization for their ${req.body.event.eventName} event!\n\nWe hope to see more of you!\nCentric Flights`);
                                return res.send({msg: "User Successfully Invited to Event"});
                            }
                            else
                            {
                                sendEmail(email, `Invite to a ${organizationName} - Centric Flights"`, `Hello!\n\nYou have been invited to ${organizationName}'s Centric Flights organization.\n\nWe hope to see more of you!\nCentric Flights`);
                                return res.send({msg: "User Successfully Invited to Organization"});
                            }     
                        }
                    });

                    const randomPass = generate({
                        length: 15,
                        numbers: true,
                        symbols: true,
                        strict: true
                    });
                    con.connect(function (err) {
                        if (err) res.status(500).send({error: "DB Error"});
                
                        var sql = `INSERT INTO user (email) ` + 
                                `VALUES (?)`;
                        con.query(sql, [email], function (err, result, fields) {
                            if (err) res.status(500).send("Not Authorized");
                            console.log(result);
                            const userID = result.insertId;
                
                            var sqlCred = `INSERT INTO cred (userID, pass, isTemp) ` +
                                        `VALUES (?, ?, "T")`;
                            con.query(sqlCred, [userID, randomPass], function (err, result, fields) {
                                if (err) res.status(500).send("Not Authorized");
                
                                console.log(result);
                            });

                            // Add Roles
                            const roles = req.body.roles;
                            for (let i = 0; i < roles.length; i++)
                            {
                                var sqlAttRole = `SELECT groupID FROM rolegroup WHERE groupName = ? AND organizationID = ?`;
                                con.query(sqlAttRole, [roles[i], organizationID], function (err, results, fields) {
                                    if (err) return res.status(500).send({error: err});
                                    con.query(`INSERT INTO user_group VALUES (?, ?)`, [userID, results[0].groupID], function (err, results, fields) {
                                        if (err) return res.status(500).send({error: err});
                                    });
                                });
                            }

                            // If this is an event invite
                            if (req.body.event)
                            {
                                var sqlEvent = `INSERT INTO event_user (userID, eventID) VALUES (?, ?)`;
                                con.query(sqlEvent, [userID, req.body.event.eventID], function (err, results, fields) {
                                    if (err) return res.status(500).send(err);

                                    sendEmail(email, `Invite to a ${organizationName} - Centric Flights"`, `Hello!\n\nYou have been invited to ${organizationName}'s Centric Flights organization for their ${req.body.event.eventName} event!\n\nYour temporary password is ${randomPass} and you can go to https://centricflights.com/Sign_In/signIn.html to complete your sign up.\n\nWe hope to see more of you!\nCentric Flights`);
                                    return res.send({msg: "User Successfully Invited to Event"});
                                });
                            }
                            else
                            {
                                sendEmail(email, `Invite to a ${organizationName} - Centric Flights"`, `Hello!\n\nYou have been invited to ${organizationName}'s Centric Flights organization.\n\nYour temporary password is ${randomPass} and you can go to https://centricflights.com/Sign_In/signIn.html to complete your sign up.\n\nWe hope to see more of you!\nCentric Flights`);
                                return res.send({msg: "User Successfully Invited to Organization"});
                            }                            
                        });
                    });

                break;
            }
        }
    });
    }
    catch (error)
    {
        res.send({error: "Not Authorized"});
        return;
    }
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

// COPY EVERYTHING BELOW THIS

// Authenticate Methods

// General Use
async function generalAuth (token)
{
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        return userID;
    }
    catch (error)
    {
        return 0;
    }
}

async function eventAuth (token, organizationID)
{
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        var sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        con.query(sql, [userID, organizationID], async (err, results) => {
            if (err) return 0;
            console.log(results);

            if (results.length === 0) return 0; //going to need to add error checking

            for (let i = 0; i < results.length; i++)
            {
                console.log(results[i]);
                if (results[i].adminRole == "event" || results[i].adminRole == "admin")
                {
                    console.log("Authorized - " + userID);
                    return userID;
                }
            }
        });
    }
    catch (error)
    {
        return 0;
    }

    return 0;
}

async function approverAuth (token, organizationID)
{
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        var sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        con.query(sql, [userID, organizationID], async (err, results) => {
            if (err) return 0;
            console.log(results);

            if (results.length === 0) return 0; //going to need to add error checking

            for (let i = 0; i < results.length; i++)
            {
                if (results[i].adminRole == "approver" || results[i].adminRole == "admin")
                {
                    return userID;
                }
            }
        });
    }
    catch (error)
    {
        return 0;
    }

    return 0;
}

app.get(`/get-admin-organizations-from-user`, (req, res) => {
    var userID = 1;
    // const token = req.cookies.jwt;
    // const secret = SECRET_KEY;

    try
    {
        //const decoded = jwt.verify(token, secret);
        //console.log(decoded);
        //const userID = decoded.userID;
        con.connect(function (err) {
            if (err) throw err;
            var sql = `SELECT organizationID, organizationName ` +
            `FROM user JOIN user_group USING (userID) ` +
            `JOIN rolegroup USING (groupID) ` +
            `JOIN organization USING (organizationID) ` +
            `WHERE userID = ${userID} and adminRole = "admin"`;
            con.query(sql, function (err, result, fields) {
                if (err) throw err;
                console.log(result);
                res.send(result);
            });
        });
    }
    catch (error)
    {
        res.status(401).json({
            message: 'Invalid token'
        });
    }
});

app.get(`/get-approver-organizations-from-user`, (req, res) => {
    var userID = 1;

    try
    {
        con.connect(function (err) {
            if (err) throw err;
            var sql = `SELECT organizationID, organizationName ` +
            `FROM user JOIN user_group USING (userID) ` +
            `JOIN rolegroup USING (groupID) ` +
            `JOIN organization USING (organizationID) ` +
            `WHERE userID = ? AND adminRole IN ("approver", "admin")`;
            con.query(sql, userID, function (err, result, fields) {
                if (err) throw err;
                console.log(result);
                res.send(result);
            });
        });
    }
    catch (error)
    {
        res.status(401).json({
            message: 'Invalid token'
        });
    }
});

/* Gets user bookings */
app.get(`/get-all-user-bookings`, (req, res) => {
    var userID = 1;
    //var userID = generalAuth(req.cookies.jwt);
    if (!userID)
    {
        res.status(401).send({ "error" : "Not Authenticated" });
        return;
    }

    var sql = `SELECT * FROM booking JOIN event USING (eventID) WHERE userID = ? ORDER BY bookingID DESC`;
    con.query(sql, userID, async function (err, results, fields) {
        if (err) res.status(500).send(err);
        res.send(results);
    });
});

/* Gets event attended */
app.get(`/get-current-user-events`, async (req, res) => {

    //var userID = 1;
    var userID = await generalAuth(req.cookies.jwt);
    console.log("User ID Below");
    console.log(userID);
    if (!userID)
    {
        res.status(401).send({ "error" : "Not Authenticated" });
        return;
    }

    var alreadyBookedEvents = "";
    var sql = "SELECT eventID, bookingID, approved " +
            "FROM booking " +
            "WHERE userID = ? AND approved <> 'denied'";
    con.query(sql, userID, async function (err, results, fields) {
        if (err) return res.status(500).send(err);
        console.log(results);

        for (let i = 0; i < results.length; i++)
        {
            alreadyBookedEvents += results[i].eventID + ",";
        }
        console.log(alreadyBookedEvents);
        if (alreadyBookedEvents.length > 0)
        {
            alreadyBookedEvents = alreadyBookedEvents.substring(0, alreadyBookedEvents.length - 1);

            sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, event.organizationID, organizationName, groupID, adminRole, maxFlightTier ` + 
            `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN organization USING (organizationID) LEFT JOIN rolegroup USING (groupID) ` +
            `WHERE userID = ? AND (adminRole = ? OR adminRole IS NULL) AND eventID NOT IN (${alreadyBookedEvents}) AND startDate > CURDATE()`;
        }
        else
        {
            console.log("No Booked Events");
            // Fix the NULL check!
            sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, event.organizationID, organizationName, groupID, adminRole, maxFlightTier ` + 
            `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN organization USING (organizationID) LEFT JOIN rolegroup USING (groupID) ` +
            `WHERE userID = ? AND (adminRole = ? OR adminRole IS NULL) AND startDate > CURDATE()`;
        }
            con.query(sql, [userID, "false"], async function (err, results, fields) {
                if (err) res.status(500).send(err);

                console.log(results);
                res.send(results);
            });
    });
});

// Duffel API
const duffel = new Duffel({
  token: "duffel_test_PHc32q2ypel-f75QJwwupRXsq6SM1AXMjBmqX9TL7TW",
});

app.get(`/duffel-search`, (req, res) => {
    const originCode = req.query.originCode;
    const destinationCode = req.query.destinationCode;
    const dateOfDeparture = req.query.dateOfDeparture;
    const dateOfReturn = req.query.dateOfReturn;
    const flightTierID = req.query.flightClass;
    const flightTierRankings = { 1: "economy", 2: "premium_economy", 3: "business", 4: "first" };
    const travelClass = flightTierRankings[flightTierID];

    console.log(travelClass);
    async function test () 
    {
        var duffelRes = await duffel.offerRequests.create({
            slices : [
              {
                origin: originCode,
                destination: destinationCode,
                departure_date: dateOfDeparture
              },
              {
                origin: destinationCode,
                destination: originCode,
                departure_date: dateOfReturn
              }
            ],
            passengers: [{ type: "adult" }], // Add { age: 1 } if under 18 or another { type: "adult" } for more
            cabin_class: travelClass,
        });

        var holdData = {};
        holdData['offers'] = [];

        var pulledOffers = duffelRes.data.offers;

        for (let i = 0; i < pulledOffers.length; i++)
        {
            if (!pulledOffers[i].payment_requirements.requires_instant_payment)
            {
                holdData['offers'].push(pulledOffers[i]);
                console.log("Possible ID - " + pulledOffers[i].id);
            }
        }
    
        res.send(holdData);
        // {
        //     requires_instant_payment: false,
        //     price_guarantee_expires_at: '2025-02-18T21:29:19Z',
        //     payment_required_by: '2025-02-19T21:29:19Z'
        // }
    }

    test();
});

app.get(`/duffel-create-offer`, (req, res) => {
    const OFFER_ID = req.query.id;

    async function test ()
    {
        var offer = await duffel.offers.get(OFFER_ID);
        console.log("Offer ID - " + offer.data.id);
        console.log("First Passenger ID - " + offer.data.passengers[0].id);

        res.send(offer);
    } 

    test();
});

app.get(`/duffel-create-order`, (req, res) => {
    const OFFER_ID = req.query.id;
    const PASSENGER_ID = req.query.passID;
    const eventID = req.query.eventID;
    const tierID = req.query.tierID;

    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        // const decoded = jwt.verify(token, secret);
        // console.log(decoded);
        // var userID = decoded.userID;

        var userID = 1;

        // Add verification that user can actually book the flight
        con.query("SELECT * FROM user JOIN event_user USING (userID) JOIN event USING (eventID) WHERE userID = ? AND eventID = ?", [userID, eventID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking

            const user = results[0];
            async function intCreateOrder ()
            {
                var order = await duffel.orders.create({ 
                    type: "hold",
                    selected_offers: [OFFER_ID],
                    passengers: [
                    {
                        phone_number: "+" + user.phoneNumber,
                        email: user.email,
                        born_on: user.birthdate,
                        title: "mr",
                        gender: (user.gender).toLowerCase(),
                        family_name: user.lastName,
                        given_name: user.firstName,
                        id: PASSENGER_ID
                    }
                    ]
                });
    
                console.log("Order ID - " + order.data.id);

                // Check for warnings
                var bookingWarningArray = [];
                var overSecondThreshold = false;
                // Event Info
                const startDate = new Date ((user.startDate + "").substring(0, (user.startDate + "").indexOf("T")));
                const endDate = new Date ((user.endDate + "").substring(0, (user.endDate + "").indexOf("T")));
                const checkedBags = user.checkedBags;
                const layoverMax = user.layoverMax;
                const dateTimeBuffer = user.dateTimeBuffer;
                const firstThreshold = parseFloat(user.firstThreshold);
                const secondThreshold = parseFloat(user.secondThreshold);
                const maxFlightTier = user.maxFlightTier;

                // Flight Info
                const flightDepDate = new Date ((order.data.slices[0].segments[0].departing_at + "").substring(0, (order.data.slices[0].segments[0].departing_at + "").indexOf("T")));
                const lastSlice = order.data.slices[order.data.slices.length - 1];
                const flightRetDate = new Date ((lastSlice.segments[0].departing_at + "").substring(0, (lastSlice.segments[0].departing_at + "").indexOf("T")));
                var flightLayoverMax = 0;
                for (let i = 0; i < order.data.slices.length; i++)
                {
                    var layoverCount = order.data.slices[i].segments.length - 1;
                    if (layoverCount > flightLayoverMax)
                    {
                        flightLayoverMax = layoverCount;
                    }                    
                }
                const price = parseFloat(order.data.total_amount);

                // Generate Warnings
                // Dates
                const earlyArrival = ((flightDepDate - startDate) / (1000 * 60 * 60 * 24)) + dateTimeBuffer;
                console.log("Flight Dep Date - " + flightDepDate);
                console.log(startDate);
                if (flightDepDate - startDate > 0)
                {
                    bookingWarningArray.push("lateArrival");
                }
                else if (earlyArrival < 0)
                {
                    bookingWarningArray.push("earlyArrival");
                }
                const lateDeparture = ((flightRetDate - endDate) / (1000 * 60 * 60 * 24)) - dateTimeBuffer;
                if (lateDeparture > 0)
                {
                    bookingWarningArray.push("lateDeparture");
                }
                else if (flightRetDate - endDate < 0)
                {
                    bookingWarningArray.push("earlyDeparture");
                }

                // Price
                console.log("Flight Price - " + price + ". First: " + firstThreshold + ". Second: " + secondThreshold);
                console.log(price > secondThreshold);
                console.log(price > firstThreshold);
                if (price > secondThreshold)
                {
                    bookingWarningArray.push("priceOverSecond");
                    overSecondThreshold = true;
                }
                else if (price > firstThreshold)
                {
                    bookingWarningArray.push("priceOverFirst");
                }

                // Layovers
                if (flightLayoverMax > layoverMax)
                {
                    bookingWarningArray.push("layoversOver");
                }

                // Checked Bags

                // Flight Tier
                if (tierID > maxFlightTier)
                {
                    bookingWarningArray.push("flightTierOver");
                }

                // Set Approval Status
                var approvalStatus = "";
                console.log("Booking Warning Array Below:");
                console.log(bookingWarningArray);
                if (bookingWarningArray.length === 0)
                {
                    approvalStatus = "approved";
                    var text = `Dear ${user.firstName}, \n\nYour flight for ${user.eventName} has been confirmed. To view flight information, please visit https://centricflights.com/userFlightHistory \n\nThank you for booking with Centric Flights`;
                    sendEmail("npw1107@rit.edu", "Centric Flights - " + user.eventName + " Confirmation", text);
                }
                else if (overSecondThreshold)
                {
                    approvalStatus = "escalation";
                }
                else
                {
                    approvalStatus = "pending";
                }

                var sql = "INSERT INTO booking (cost, userID, eventID, approved, json) " +
                            "VALUES (?, ?, ?, ?, ?)";
                var vals = [parseFloat(order.data.total_amount), userID, eventID, approvalStatus, JSON.stringify(order)];
                console.log(vals);
                con.query(sql, vals, async function (err, results, fields) {
                    if (err) return res.status(500).send(err);
                    console.log(results);
                    var lastInsertID = results.insertId;

                    console.log(bookingWarningArray);
                    // Populate Warnings
                    var warnSQL = "INSERT INTO booking_warning VALUES (?, ?)";
                    for (let i = 0; i < bookingWarningArray.length; i++)
                    {
                        con.query(warnSQL, [lastInsertID, bookingWarningArray[i]], async function (err, results, fields) {
                            if (err) return res.status(500).send(err);
                            console.log(results);
                        });
                    }

                    if (approvalStatus == "approved")
                    {
                        async function intCreatePayment ()
                        {
                            var payment = await duffel.payments.create({ 
                            order_id: order.data.id,
                            payment: {
                                type: "balance",
                                amount: order.data.total_amount,
                                currency: order.data.total_currency
                                }
                            });
                                        
                            console.log("Payment ID - " + payment.data.id);
                            var sql = "UPDATE booking " +
                                        "SET approved = ?, transactionID = ? " +
                                        "WHERE bookingID = ?";
                            con.query(sql, ["approved", payment.data.id, lastInsertID], async function (err, results, fields) {
                                if (err) return res.status(500).send(err);
                                console.log(results);

                                // res.send(payment);
                            });
                        }

                        intCreatePayment();
                    }

                    res.send(order);
                });
            } 
    
            intCreateOrder();
        });
    }
    catch (error)
    {
        res.send({"error": "Invalid Authorization"});

            // How it normally works (with the payments array)
            // selected_offers: [OFFER_ID],
            // payments: [
            //     {
            //     type: "balance",
            //     currency: TOTAL_CURRENCY,
            //     amount: TOTAL_AMOUNT
            //     }
            // ],
            // passengers
    }
});

app.get(`/duffel-order-payment`, (req, res) => {
    const bookingID = req.query.bookingID;

    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        // User for verification
        var sql = "SELECT email, adminRole, bookingID, eventID, event.organizationID, json " +
                    "FROM booking JOIN event USING (eventID) JOIN rolegroup ON event.organizationID = rolegroup.organizationID JOIN user_group USING (groupID) JOIN user ON user_group.userID = user.userID " +
                    "WHERE bookingID = ? AND user.userID = ? AND adminRole IN ('admin', 'approver')";

        con.query(sql, [bookingID, userID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(401).send("Invalid authorization"); //going to need to add error checking
            var bookingJson = results[0].json;
            console.log(bookingJson);

            async function intCreatePayment ()
            {
                var payment = await duffel.payments.create({ 
                order_id: bookingJson.data.id,
                payment: {
                    type: "balance",
                    amount: bookingJson.data.total_amount,
                    currency: bookingJson.data.total_currency
                    }
                });
                            
                console.log("Payment ID - " + payment.data.id);
                var sql = "UPDATE booking " +
                            "SET approved = ?, transactionID = ? " +
                            "WHERE bookingID = ?";
                con.query(sql, ["approved", payment.data.id, bookingID], async function (err, results, fields) {
                    if (err) return res.status(500).send(err);
                    console.log(results);

                    res.send(payment);
                });
            }

            intCreatePayment();
        });
    }
    catch (error)
    {
        async function test ()
        {
            var payment = await duffel.payments.create({ 
                order_id: ORDER_ID,
                payment: {
                type: "balance",
                amount: ORDER_TOTAL_AMOUNT,
                currency: ORDER_TOTAL_CURRENCY
                }
            });
            
            console.log("Payment ID - " + payment.data.id);
            var sql = "UPDATE booking " +
                        "SET approved = ? " +
                        "WHERE bookingID = ?";
            con.query(sql, ["approved", bookingID], async function (err, results, fields) {
                if (err) return res.status(500).send(err);
                console.log(results);

                res.send(payment);
            });
        }

        test();
    }
});

app.get(`/duffel-order-cancel`, (req, res) => {
    const bookingID = req.query.bookingID;
    
    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        var sql = "SELECT email, adminRole, bookingID, eventID, event.organizationID, json " +
                    "FROM booking JOIN event USING (eventID) JOIN rolegroup ON event.organizationID = rolegroup.organizationID JOIN user_group USING (groupID) JOIN user ON user_group.userID = user.userID " +
                    "WHERE bookingID = ? AND user.userID = ? AND adminRole IN ('admin', 'approver')";

        con.query(sql, [bookingID, userID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(401).send("Invalid authorization"); //going to need to add error checking
            var bookingJson = results[0].json;
            console.log(bookingJson);

            async function intOrderCancel ()
            {
                var cancellation = await duffel.orderCancellations.create({
                    order_id: bookingJson.data.id
                });

                console.log("Cancel ID - " + cancellation.data.id);

                // Confirm Cancellation
                cancellation = await duffel.orderCancellations.confirm(cancellation.data.id);

                console.log("Cancel ID - " + cancellation.data.id);
                var sql = "UPDATE booking " +
                        "SET approved = ? " +
                        "WHERE bookingID = ?";
                con.query(sql, ["denied", bookingID], async function (err, results, fields) {
                    if (err) return res.status(500).send(err);
                    console.log(results);

                    res.send(cancellation);
                });
            } 

            intOrderCancel();
        });
    }
    catch (error)
    {
        res.status(401).send({ "error" : "Invalid Authorization" });
    }
});

app.get(`/duffel-order-cancel-confirm`, (req, res) => {
    const ORDER_CANCELLATION_ID = req.query.id;

    async function test ()
    {
        var cancellation = await duffel.orderCancellations.confirm(ORDER_CANCELLATION_ID);

        console.log("Cancel ID - " + cancellation.data.id);
        res.send(cancellation);
    }

    test ();
});

// Amadeus API
const amadeus = new Amadeus({
    clientId: 'ZJlBa8AYSnx92rKVbJtrXfybbcDiHQBw',
    clientSecret: '00Wbf5GGSAk1k8NG',
});

app.get(`/amadeus-search`, (req, res) => {
    const originCode = req.query.originCode;
    const destinationCode = req.query.destinationCode;
    const dateOfDeparture = req.query.dateOfDeparture;
    const dateOfReturn = req.query.dateOfReturn;
    const flightTierID = (req.query.flightClass + "").toUpperCase();
    const flightTierRankings = { 1: "economy", 2: "premium_economy", 3: "business", 4: "first" };
    const travelClass = (flightTierRankings[flightTierID] + "").toUpperCase();

    // Find the cheapest flights
    amadeus.shopping.flightOffersSearch.get({
        originLocationCode: originCode,
        destinationLocationCode: destinationCode,
        departureDate: dateOfDeparture,
        returnDate: dateOfReturn,
        travelClass: travelClass,
        currencyCode: "USD",
        adults: '1',
        max: '99'
        // includedAirlineCodes: 'NK'
    }).then(function (response) {
        res.send(response.result);
    }).catch(function (response) {
        res.send(response);
    });
});

app.post(`/amadeus-flight-confirmation`, (req, res) => {
    const flight = req.body;
    // Confirm availability and price
    amadeus.shopping.flightOffers.pricing.post(
        JSON.stringify({
            'data': {
                'type': 'flight-offers-pricing',
                'flightOffers': [flight],
            }
        })
    ).then(function (response) {
            res.send(response.result);
        }).catch(function (response) {
            res.send(response)
        })
});

app.post(`/amadeus-flight-booking`, (req, res) => {
    // Book a flight
    const flight = req.body.offer;
    const eventID = req.body.eventInfo.eventID;
    const tierID = req.body.eventInfo.tierID;
    console.log("Event ID: " + eventID + ". Tier ID: " + tierID);

    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        // const decoded = jwt.verify(token, secret);
        // console.log(decoded);
        // var userID = decoded.userID;

        var userID = 1;

        con.query("SELECT userID, email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, DATE_FORMAT(birthdate, '%Y-%m-%d') AS birthdate, KTN, eventName, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, maxFlightTier FROM user JOIN event_user USING (userID) JOIN event USING (eventID) WHERE userID = ?", [userID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking

            const user = results[0];
            var gender = "";
            if (user.gender == "F")
            {
                gender = "FEMALE";
            }
            else
            {
                gender = "MALE";
            }
            amadeus.booking.flightOrders.post(
                JSON.stringify({
                    'data': {
                      'type': 'flight-order',
                      'flightOffers': flight,
                      'travelers': [{
                        "id": "1",
                        "dateOfBirth": user.birthdate,
                        "name": {
                          "firstName": user.firstName,
                          "lastName": user.lastName
                        },
                        "gender": gender,
                        "contact": {
                          "emailAddress": user.email,
                          "phones": [{
                            "deviceType": "MOBILE",
                            "countryCallingCode": (user.phoneNumber).substring(0, 1), // This will only take one digit codes
                            "number": (user.phoneNumber).substring(0, 1)
                          }]
                        }
                      }]
                    }})
            ).then(function (order) {
                console.log(order);

                // Check for warnings
                var bookingWarningArray = [];
                var overSecondThreshold = false;
                // Event Info
                const startDate = new Date (user.startDate);
                const endDate = new Date (user.endDate);
                const checkedBags = user.checkedBags;
                const layoverMax = user.layoverMax;
                const dateTimeBuffer = user.dateTimeBuffer;
                const firstThreshold = parseFloat(user.firstThreshold);
                const secondThreshold = parseFloat(user.secondThreshold);
                const maxFlightTier = user.maxFlightTier;

                // Flight Info
                const flightDepDate = new Date (order.data.flightOffers[0].itineraries[0].segments[0].departure.at);
                const lastSlice = order.data.flightOffers[0].itineraries[order.data.flightOffers[0].itineraries.length - 1];
                const flightRetDate = new Date (lastSlice.segments[0].arrival.at);
                var flightLayoverMax = 0;
                for (let i = 0; i < order.data.flightOffers[0].itineraries.length; i++)
                {
                    var layoverCount = order.data.flightOffers[0].itineraries[i].segments.length - 1;
                    if (layoverCount > flightLayoverMax)
                    {
                        flightLayoverMax = layoverCount;
                    }                    
                }
                const price = parseFloat(order.data.flightOffers[0].price.grandTotal);

                // Generate Warnings
                // Dates
                const earlyArrival = ((flightDepDate - startDate) / (1000 * 60 * 60 * 24)) + dateTimeBuffer;
                if (flightDepDate - startDate > 0)
                {
                    bookingWarningArray.push("lateArrival");
                }
                else if (earlyArrival < 0)
                {
                    bookingWarningArray.push("earlyArrival");
                }
                const lateDeparture = ((flightRetDate - endDate) / (1000 * 60 * 60 * 24)) - dateTimeBuffer;
                if (lateDeparture > 0)
                {
                    bookingWarningArray.push("lateDeparture");
                }
                else if (flightRetDate - endDate < 0)
                {
                    bookingWarningArray.push("earlyDeparture");
                }

                // Price
                console.log("Flight Price - " + price + ". First: " + firstThreshold + ". Second: " + secondThreshold);
                console.log(price > secondThreshold);
                console.log(price > firstThreshold);
                if (price > secondThreshold)
                {
                    bookingWarningArray.push("priceOverSecond");
                    overSecondThreshold = true;
                }
                else if (price > firstThreshold)
                {
                    bookingWarningArray.push("priceOverFirst");
                }

                // Layovers
                if (flightLayoverMax > layoverMax)
                {
                    bookingWarningArray.push("layoversOver");
                }

                // Checked Bags

                // Flight Tier
                if (tierID > maxFlightTier)
                {
                    bookingWarningArray.push("flightTierOver");
                }

                // Set Approval Status
                var approvalStatus = "";
                if (bookingWarningArray.length == 0)
                {
                    approvalStatus = "approved";
                    var text = `Dear ${user.firstName}, \n\nYour flight for ${user.eventName} has been confirmed. To view flight information, please visit https://centricflights.com/userFlightHistory \n\nThank you for booking with Centric Flights`;
                    sendEmail("npw1107@rit.edu", "Centric Flights - " + user.eventName + " Confirmation", text);
                }
                else if (overSecondThreshold)
                {
                    approvalStatus = "escalation";
                }
                else
                {
                    approvalStatus = "pending";
                }

                var sql = "INSERT INTO booking (cost, userID, eventID, approved, api, json) " +
                            "VALUES (?, ?, ?, ?, ?, ?)";
                var vals = [parseFloat(order.data.flightOffers[0].price.grandTotal), userID, eventID, "pending", "amadeus", JSON.stringify(order)];
                console.log(vals);
                con.query(sql, vals, async function (err, results, fields) {
                    if (err) return res.status(500).send(err);
                    console.log(results);
                    var lastInsertID = results.insertId;
                    // Populate Warnings
                    var warnSQL = "INSERT INTO booking_warning VALUES (?, ?)";
                    for (let i = 0; i < bookingWarningArray.length; i++)
                    {
                        con.query(warnSQL, [lastInsertID, bookingWarningArray[i]], async function (err, results, fields) {
                            if (err) return res.status(500).send(err);
                            console.log(results);
                        });
                    }

                    res.send(order);
                });
            }).catch(function (response) {
                console.log(response);
                res.send(response);
            });
        });
    }
    catch (error)
    {
        res.status(500).send({"error": "Error booking flight"});
    }
});


// Amadeus Approve Bookings
app.get(`/amadeus-approve-booking`, (req, res) => {
    const bookingID = req.query.bookingID;
    
    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        var sql = "SELECT email, adminRole, bookingID, eventID, event.organizationID, json " +
                    "FROM booking JOIN event USING (eventID) JOIN rolegroup ON event.organizationID = rolegroup.organizationID JOIN user_group USING (groupID) JOIN user ON user_group.userID = user.userID " +
                    "WHERE bookingID = ? AND user.userID = ? AND adminRole IN ('admin', 'approver')";

        con.query(sql, [bookingID, userID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(401).send("Invalid authorization"); //going to need to add error checking

            var sql = "UPDATE booking " +
                      "SET approved = ? " +
                      "WHERE bookingID = ?";
            con.query(sql, ["approved", bookingID], async function (err, results, fields) {
                if (err) return res.status(500).send(err);
                console.log(results);

                res.send(results);
            });
        });
    }
    catch (error)
    {
        res.status(401).send({ "error" : "Invalid Authorization" });
    }
});

app.get(`/amadeus-deny-booking`, (req, res) => {
    const bookingID = req.query.bookingID;
    
    const token = req.cookies.jwt;
    const secret = SECRET_KEY;

    try
    {
        const decoded = jwt.verify(token, secret);
        console.log(decoded);
        var userID = decoded.userID;

        var sql = "SELECT email, adminRole, bookingID, eventID, event.organizationID, json " +
                    "FROM booking JOIN event USING (eventID) JOIN rolegroup ON event.organizationID = rolegroup.organizationID JOIN user_group USING (groupID) JOIN user ON user_group.userID = user.userID " +
                    "WHERE bookingID = ? AND user.userID = ? AND adminRole IN ('admin', 'approver')";

        con.query(sql, [bookingID, userID], async (err, results) => {
            if (err) return res.status(500).send("Database error");
            console.log(results);

            if (results.length === 0) return res.status(401).send("Invalid authorization"); //going to need to add error checking

            var sql = "UPDATE booking " +
                      "SET approved = ? " +
                      "WHERE bookingID = ?";
            con.query(sql, ["denied", bookingID], async function (err, results, fields) {
                if (err) return res.status(500).send(err);
                console.log(results);

                res.send(results);
            });
        });
    }
    catch (error)
    {
        res.status(401).send({ "error" : "Invalid Authorization" });
    }
});