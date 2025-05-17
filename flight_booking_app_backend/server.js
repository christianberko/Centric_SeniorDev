import express, { response } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import { createConnection, createPool } from "mysql2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendFightConfirmEmail, sendMFAEmail, sendNewUserOrganizationInvite, sendOrganizationInvite, sendPasswordResetEmail, sendPendingEmail } from './postmarkEmail.js';
import { Duffel } from '@duffel/api';
import Amadeus from 'amadeus';
import nodemailer from 'nodemailer';
import { generate } from 'generate-password';
import * as sp from 'speakeasy';
import { toDataURL } from 'qrcode';
import { arraysEqual, arraysEqual2D, findEventAirportDifferences, randString } from './utils.js';
import { encryptField, decryptField } from './kmsEncrypt.js';
import { addMinutes, differenceInCalendarDays, differenceInDays, differenceInHours, differenceInMinutes, isBefore } from 'date-fns';
import { Parser } from 'json2csv';
import { hotelListReverseGeocode, reverseGeocode } from './opencage.js';
import { validateAirport, validateAttendeeInfo, validateCheckInAndCheckOutDates, validateEditUser, validateEmail, validateEventInfo, validateEventModifyInfo, validateEventName, validateEventUserAdminAssociation, validateEventUserAssociation, validateFlightSearch, validateFlightTierID, validateGroupInfo, validateGroupModifyInfo, validateHotelName, validateID, validateInviteUser, validateMFACode, validateMFAType, validateOrganizationName, validatePasswordReset, validateRemoveEventUserAssociation, validateRemoveEventUserGroupAssociation, validateUserInfo } from './validate.js';

// Convert __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECRET_KEY = "8Jmfd6&6f#6F&A*&)9fdsMj(jnfdsk*l)S^jfdnLJFNDY*_:?ifds?o082LkfdJ.1J7fdh3jG6f";

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
//app.use('/', authRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../flight_booking_app_frontend')));


// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//     next(createError(404));
//   });

// Routes
//app.use('/dashboard', dashboardRouter);
//app.use('/auth', authRoutes);

// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// const con = createConnection({
//   host: "localhost",
//   user: "root",
//   // password: "Qr6R5CknaFnix",
//   password: "student",
//   port: 3306,
//   database: "centric",
// });

// con.connect((err) => {
//   if (err) {
//     console.error("Database connection error:", err);
//     throw err;
//   }
//   console.log("DB connected");
// });

const pool = createPool({
    connectionLimit: 30,
    host: "localhost",
    user: "root",
    password: "Qr6R5CknaFnix",
    // password: "student",
    database: "centric",
    keepAliveInitialDelay: 10000,
    enableKeepAlive: true,
});

pool.getConnection((err, con) => {
    if (err)
    {
        errCallback(err);
    }
    console.log("DB Connected Successfully");
    con.release();
});

// Callback function for SQL errors
function errCallback (err)
{
    console.log(err);
}

// Index
app.get(`/`, (req, res) => {
    res.cookie('onsite', 'true', { maxAge: 10000000000 });
    res.redirect(307, 'index.html');
});

app.get(`/index`, (req, res) => {
    res.cookie('onsite', 'true', { maxAge: 10000000000 });
    res.redirect(307, 'index.html');
});

// Authentication & Authorization

// Register User
app.post("/register", async (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Database Connected Successfully");

        try
        {
            if (!req.cookies.onsite)
            {
                con.release();
                return res.status(401).send({ err: "No token to register user" });
            }
    
            console.log(req.body);
            const { email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title, password, confirmPass } = req.body;
            const userObj = validateUserInfo(firstName, middleName, lastName, email, birthdate, preferredName, phoneNumber, KTN, gender, title, preferredAirport, password, confirmPass);
            if (!userObj)
            {
                con.release();
                return res.status(400).send({ err: "Invalid user data" });
            }
            
            con.beginTransaction();
            const sql = `SELECT * FROM user JOIN cred USING (userID) WHERE email = ?`;
            con.query(sql, [userObj.email], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(400).send({ err: "Invalid email input" });
                }
                console.log("Cred Results", results);
                if (results.length > 0 && results[0].isTemp == "T")
                {
                    console.log("Temp User Comming");
                    if (!req.cookies.temp)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.redirect(303, "/signIn");
                    }
    
                    const encryptedBirthdate = await encryptField(userObj.birthdate);
                    
                    const encryptedKTN = userObj.ktn != null ? await encryptField(userObj.ktn) : null;
                    const hashedPassword = await bcrypt.hash(userObj.password, 10);
                    const sqlUpdate = `UPDATE user ` +
                                    `SET firstName = ?, middleName = ?, lastName = ?, phoneNumber = ?, preferredName = ?, gender = ?, birthdate = ?, KTN = ?, preferredAirport = ?, title = ? ` +
                                    `WHERE userID = ?`;
                    con.query(sqlUpdate, [userObj.firstName, userObj.middleName, userObj.lastName, userObj.phoneNumber, userObj.preferredName, userObj.gender, encryptedBirthdate, encryptedKTN, userObj.preferredAirport, userObj.title, results[0].userID], (err, result) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error creating user" });
                        }
    
                        const sqlCredUpdate = `UPDATE cred ` +
                                            `SET pass = ?, isTemp = "F" ` +
                                            `WHERE userID = ?`;
                        con.query(sqlCredUpdate, [hashedPassword, results[0].userID], (err) => {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error updating credentials" });
                            }
    
                            con.commit();
                            con.release();
                            console.log("User Fully Registered");
                            res.cookie('temp', '', { maxAge: 0 });
                            const emailPayload = { email: userObj.email };
                            const emailToken = jwt.sign(emailPayload, SECRET_KEY, { expiresIn: "1h" });
                            res.cookie('email', emailToken, { maxAge: 300000 });
                            return res.status(200).send({ msg: "User successfully registered"});
                        });
                    });
                }
                else if (results.length > 0)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(400).send({ err: "A user with this email already exists." });
                }
                else
                {
                    // Hash password
                    const hashedPassword = await bcrypt.hash(userObj.password, 10);
    
                    // Insert user into database
                    const encryptedBirthdate = await encryptField(userObj.birthdate);
                    const encryptedKTN = userObj.ktn != null ? await encryptField(userObj.ktn) : null;
                    const sqlUser = `INSERT INTO user (email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title) ` +
                                    `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    con.query(sqlUser, [userObj.email, userObj.firstName, userObj.middleName, userObj.lastName, userObj.phoneNumber, userObj.preferredName, userObj.gender, encryptedBirthdate, encryptedKTN, userObj.preferredAirport, userObj.title], (err, result) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error creating user" });
                    };
    
                    const userId = result.insertId;
    
                    // Insert credentials into 'cred' table
                    const sqlCred = "INSERT INTO cred (userID, pass, salt) VALUES (?, ?, ?)";
                    con.query(sqlCred, [userId, hashedPassword, "salt"], (err) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error updating credentials" });
                        }
    
                        con.commit();
                        con.release();
                        console.log("User Successfully Registered");
                        const emailPayload = { email: userObj.email };
                        const emailToken = jwt.sign(emailPayload, SECRET_KEY, { expiresIn: "1h" });
                        res.cookie('email', emailToken, { maxAge: 300000 });
                        return res.status(200).send({ msg: "User successfully registered"});
                    });
                    });
                }
        
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            res.status(500).send({ err: "Server error" });
        }
    });
});

app.post("/register-organization", async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Register Organization DB Connected Successfully");

        try
        {
            const organizationName = validateOrganizationName(req.body.organizationName);
            if (!organizationName)
            {
                return res.status(422).send({ err: "Invalid organization name" });
            }
    
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                return res.status(401).send({ errAuth: "Invalid authentication" });
            }
            
            con.beginTransaction();
            const sql = `INSERT INTO organization (organizationName) VALUES (?)`;
            con.query(sql, [organizationName], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return  res.status(500).send({ err: "Error creating organization "});
                }
    
                const organizationID = results.insertId;
        
                const attendeeGroupSQL = `INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, adminRole, flightTierID, organizationID) ` +
                `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const attendeeValues = ["Standard", 1, 0, 0, 4, 1, "false", 1, organizationID];
                con.query(attendeeGroupSQL, attendeeValues, (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error establishing organization "});
                    }
    
                    const adminGroupSQL = `INSERT INTO rolegroup (groupName, adminRole, organizationID) ` +
                    `VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)`;
                    const adminValues = ["Organizational Admin", "admin", organizationID, 
                        "Approver", "approver", organizationID, "Event Planner", "event", organizationID,
                        "Finance", "finance", organizationID,
                        "Executive Approver", "execApprover", organizationID,
                        "Executive Event Planner", "execEvent", organizationID
                    ];
                    con.query(adminGroupSQL, adminValues, (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error establishing organization "});
                        }
            
                        const orgAdminSQL = `INSERT INTO user_group ` +
                                            `SELECT ?, groupID ` +
                                            `FROM rolegroup ` +
                                            `WHERE organizationID = ? AND adminRole = "admin"`;
                        con.query(orgAdminSQL, [userID, organizationID], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return  res.status(500).send({ err: "Error establishing organization "});
                            }
                            con.commit();
                            con.release();
                            return res.send({ msg: "Successfully created organization" });
                        });
                    });
                });
        
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/mfa-qr-generate`, (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA QR Generate DB Connected Successfully");
        try
        {
            const emailDecoded = jwt.verify(req.cookies.email, SECRET_KEY);
            const email = emailDecoded.email;
            if (!email)
            {
                return res.status(500).send("Login expired");
            }
        
            var secret = sp.generateSecret();
            
            const qr = sp.otpauthURL({secret: secret.ascii, label: "Centric Flights: " + email});
            
            toDataURL(qr, function (err, data_url) {
                const sql = `UPDATE cred JOIN user USING (userID) ` +
                        `SET mfaSecret = ? ` +
                        `WHERE email = ?`;
                con.query(sql, [secret.base32, email], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error updating MFA" });
                    }
                    con.release();
                    return res.send(data_url);
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get('/approval', async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=approval");
    }
    else
    {
        return res.redirect(307, "/approval.html");
    }
});

app.get(`/userProfileHistory`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=userProfileHistory");
    }
    else
    {
        return res.redirect(307, "/userProfileHistory.html");
    }
});

app.get(`/eventManagement`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=eventManagement");
    }
    else
    {
        return res.redirect(307, "eventManagement.html");
    }
});

app.get('/userManagement', async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=userManagement");
    }
    else
    {
        return res.redirect(307, "/userManagement.html");
    }
});

app.get(`/mfaConfig`, (req, res) => {
    const email = req.cookies.email;
    if (!email)
    {
        return res.redirect(307, '/signIn');
    }
    return res.redirect(307, 'mfaConfiguration.html');
});

app.get(`/userProfileBasic`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=userProfileBasic");
    }
    res.redirect(307, '/userProfileBasic.html');
});

app.get(`/flightSearch`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=flightSearch");
    }
    const startingEvent = req.query.eventID;
    if (startingEvent)
    {
        return res.redirect(307, "flightSearch.html?startingEvent=" + startingEvent);
    }
    return res.redirect(307, 'flightSearch.html');
});

app.get(`/hotelSearch`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=hotelSearch");
    }
    const startingEvent = req.query.eventID;
    if (startingEvent)
    {
        return res.redirect(307, "hotelSearch.html?startingEvent=" + startingEvent);
    }
    return res.redirect(307, 'hotelSearch.html');
});

app.get(`/reports`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=reports");
    }
    else
    {
        return res.redirect(307, "/reports.html");
    }
});

app.get(`/userSignUp`, (req, res) => {
    res.cookie('onsite', 'true', { maxAge: 10000000000 });
    return res.redirect(301, 'userSignUp.html');
});

app.get(`/organizationSignUp`, async (req, res) => {
    const userID = await generalAuth(req.cookies.jwt);
    if (!userID)
    {
        return res.redirect(307, "/signIn?prev=organizationSignUp");
    }
    return res.redirect(307, "organizationSignUp.html");
});

app.get(`/resetPassword`, (req, res) => {
    res.cookie('onsite', 'true', { maxAge: 10000000000 });
    const email = req.query.email;
    const reset = req.query.reset;
    if (!email || !reset)
    {
        return res.redirect(307, 'passwordReset.html');
    }
    return res.redirect(307, 'passwordReset.html?email=' + email + '&reset=' + reset);
});

app.get(`/signIn`, (req, res) => {
    res.cookie('onsite', 'true', { maxAge: 10000000000 });
    var prev = req.query.prev;
    if (!prev)
    {
        prev = "index";
    }
    res.redirect(301, 'signIn.html?prev=' + prev);
});

// Login User
app.post("/login", (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Login DB Connected Successfully");

        try
        {
            if (!req.cookies.onsite)
            {
                con.release();
                return res.status(401).send({ err: "No token to login" });
            }
    
            const { email, password, prev } = req.body;
            console.log(email, password, prev);
          
            // Check user in the database
            con.query(`SELECT * FROM user JOIN cred USING (userID) WHERE email = ?`, [email], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving user" });
                }
    
                if (results.length === 0)
                {
                    con.release();
                    return res.status(400).send({ err: "Invalid username" });
                }
                        
                const user = results[0];
    
                var currentDate = new Date();
                currentDate = new Date().toISOString();
                console.log("Lockout Date", (new Date(results[0].lockoutDate + "Z")));
                console.log("Current Date", currentDate);
                if (results[0].lockoutDate && differenceInMinutes(new Date(results[0].lockoutDate + "Z"), currentDate) > 0)
                {
                    con.release();
                    return res.status(400).send({ errLock: "Too many failed entries. Please retry in fifteen minutes" });
                }
             
                // Compare password with hash
                if (user.isTemp == "T")
                {
                    if (user.pass === password)
                    {
                        res.cookie('temp', user.email, { maxAge: 300000 });
                        con.release();
                        return res.status(200).send({ tmp: "Registration Needed" });
                    }
                    else
                    {
                        con.release();
                        return res.status(400).send({ err: "Invalid Credentials" }); 
                    }
                }
    
                const validPassword = await bcrypt.compare(password, user.pass);
                if (!validPassword) 
                {
                    var lockoutNum = results[0].lockoutNum;
                    lockoutNum++;
                    if (lockoutNum >= 5)
                    {
                        var lockoutDate = new Date();
                        console.log(lockoutDate);
                        lockoutDate = addMinutes(lockoutDate, 15);
                        lockoutDate = lockoutDate.toISOString();
                        //var lockoutDate = ((new Date((new Date()).getTime() + 15 * 60000)).toISOString());
                        //lockoutDate = lockoutDate.substring(0, lockoutDate.length - 1);
                        console.log(lockoutDate);
                        const lockoutSQL = `UPDATE cred SET lockoutNum = 0, lockoutDate = STR_TO_DATE(?, '%Y-%m-%dT%T.%fZ') WHERE userID = ?`;
                        con.query(lockoutSQL, [lockoutDate, user.userID], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                            }
                        });
                        con.release();
                        return res.status(400).send({ errLock: "Invalid password" }); 
                    }
                    else
                    {
                        const lockoutSQL = `UPDATE cred SET lockoutNum = ? WHERE userID = ?`;
                        con.query(lockoutSQL, [lockoutNum, user.userID], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                return res.status(500).send({ err: "Error locking account" });
                            }
                        });
                        con.release();
                        return res.status(400).send({ err: "Invalid password" });
                    }
                } 
                else
                {
                    const resetLockoutSQL = `UPDATE cred SET lockoutNum = 0 WHERE userID = ?`;
                    con.query(resetLockoutSQL, [user.userID], (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error locking account" });
                        }
                    });
                }
    
                console.log("MFA Type - " + user.mfaType);
                const emailPayload = { email: email };
                const emailToken = jwt.sign(emailPayload, SECRET_KEY, { expiresIn: "1h" });
                res.cookie('email', emailToken, { maxAge: 300000 });
                res.cookie('mfaType', user.mfaType, { maxAge: 30000 });
                con.release();
                return res.status(200).send({ msg: "Successful login" });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/logout`, (req, res) => {
    res.cookie('jwt', '', { maxAge: 0 });
    res.cookie('email', '', { maxAge: 0 });
    res.cookie('mfaType', '', { maxAge: 0 });
    res.cookie('temp', '', { maxAge: 0 });
    res.redirect(307, '/');
});

app.post(`/initiate-password-reset`, (req, res) => {
    if (!req.cookies.onsite)
    {
        return res.status(401).send({ err: "No token to reset password" });
    }

    const email = validateEmail(req.body.email);
    if (!email)
    {
        return res.status(422).send({ err: "Invalid email" });
    }

    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        
        const sql = `SELECT userID FROM user WHERE email = ?`;
        con.beginTransaction();
        con.query(sql, [email], async (err, results, fields) => {
            if (err)
            {
                errCallback(err);
                con.rollback(function () {
                    con.release();
                });
                return res.status(500).send({ err: "Error retrieving user" });
            }
            if (results.length == 0)
            {
                con.rollback(function () {
                    con.release();
                });
                return res.status(404).send({ err: "An account with that email does not exist" });
            }
    
            const userID = results[0].userID;
            // Generate random string for password reset
    
            const randomString = await bcrypt.hash(randString(29), 10);
            const expireDate = addMinutes(new Date(), 15);
            console.log(randomString);
            console.log(randomString.length);
            const randSQL = `UPDATE cred ` +
                            `SET passwordResetSecret = ?, passwordResetExpire = ? ` +
                            `WHERE userID = ?`;
            con.query(randSQL, [randomString, expireDate, userID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                }
    
                await sendPasswordResetEmail(email, randomString);
                con.commit();
                con.release();
                res.send({ msg: "Successfully sent password reset request" });
            });
        });
    });
});

app.post(`/confirm-password-reset`, (req, res) => {
    console.log("Confirming on server");
    if (!req.cookies.onsite)
    {
        return res.status(401).send({ err: "No token to reset password" });
    }

    const { email, reset, pass, confirmPass } = req.body;
    const passResetObj = validatePasswordReset(email, reset, pass, confirmPass);
    if (!passResetObj)
    {
        return res.status(422).send({ err: "Invalid values" });
    }

    pool.getConnection((err, con) => {
        try
        {
            con.beginTransaction();
            const sql = `SELECT userID, passwordResetSecret, passwordResetExpire ` +
                        `FROM cred JOIN user USING (userID) ` +
                        `WHERE email = ?`;
            con.query(sql, [passResetObj.email], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error retrieving user information" });
                }
                if (results.length == 0)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "No user found" });
                }
        
                const user = results[0];
                const currentDate = new Date();
                const expireDate = new Date(user.passwordResetExpire);
                if (!isBefore(currentDate, expireDate) || passResetObj.reset != user.passwordResetSecret)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(400).send({ err: "Invalid password reset" });
                }
        
                const hashedPassword = await bcrypt.hash(passResetObj.pass, 10);
                const updatePassSQL = `UPDATE cred ` +
                                    `SET pass = ?, passwordResetSecret = ?, passwordResetExpire = ?, isTemp = 'F' ` +
                                    `WHERE userID = ?`;
                con.query(updatePassSQL, [hashedPassword, null, null, user.userID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error updating password" });
                    }
                    con.commit();
                    con.release();
                    return res.send({ msg: "Successfully updated password" });
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.rollback(function () {
                con.release();
            });
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/mfa-first`, (req, res) => {
    const email = req.cookies.email;
    if (!email)
    {
        return res.redirect(303, `/signIn`);
    }
    else
    {
        return res.redirect(303, `mfa.html?prev=index&first=true`);
    }
});

app.get(`/mfa-enter`, (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Enter DB Connected");

        try
        {
            const emailDecoded = jwt.verify(req.cookies.email, SECRET_KEY);
            const email = emailDecoded.email;
            console.log(email);
        
            var prev = req.query.prev;
            if (!prev)
            {
                prev = "index";
            }
        
            if (!email)
            {
                con.release();
                return res.redirect(303, `/signIn`);
            }
            else
            {
                var sql = `SELECT mfaActive FROM user JOIN cred USING (userID) WHERE email = ?`;
                con.query(sql, [email], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving user" });
                    }
        
                    if (results.length === 0)
                    {
                        con.release();
                        return res.redirect(303, `/signIn`);
                    }
        
                    var mfaActive = results[0].mfaActive;
                    if (mfaActive == "T")
                    {
                        con.release();
                        return res.redirect(303, `mfa.html?prev=${prev}`);
                    }
                    else if (mfaActive == "F")
                    {
                        con.release();
                        return res.redirect(303, `mfaConfiguration.html`);
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.post(`/mfa-config-chosen`, (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Config Chosen DB Connected");

        try
        {
            const emailDecoded = jwt.verify(req.cookies.email, SECRET_KEY);
            const email = emailDecoded.email;
            if (!email)
            {
                con.release();
                return res.redirect(303, `/signIn`);
            }
            
            const mfaType = validateMFAType(req.body.mfaType);
            if (!mfaType)
            {
                con.release();
                return res.status(422).send("Invalid MFA type");
            }
            const mfaTypeEnum = { email: "emailOnly", authApp: "appPref" };
            const sql = `UPDATE cred JOIN user USING (userID) ` +
                    `SET mfaType = ? ` +
                    `WHERE email = ?`;
            con.query(sql, [mfaTypeEnum[mfaType], email], (err, results, fields) => {
                if (err)
                {
                    con.release();
                    errCallback(err);
                    return res.status(500).send({ err: "Error updating MFA preference."});
                }
                con.release();
                res.send({ msg: "Successfully Chosen MFA", type: mfaTypeEnum[mfaType] });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.post(`/mfa-type`, (req, res) => {
    const email = req.cookies.email;
    console.log(email);
    if (!email)
    {
        return res.status(401).send({ errAuth: "Error" });
    }
});

app.post(`/mfa-send-email`, async (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");

        try
        {
            const emailDecoded = jwt.verify(req.cookies.email, SECRET_KEY);
            const email = emailDecoded.email;
            console.log(email);
            if (!email)
            {
                con.release();
                return res.status(401).send({ errAuth: "Error" });
            } 
        
            const secret = sp.generateSecret();
            const randomCode = sp.totp({
                secret: secret.ascii,
                step: 900
            });
        
            const expireDate = addMinutes(new Date(), 15);
        
            const mfaEmailCodeSQL = `UPDATE cred ` +
                                    `JOIN user USING (userID) ` +
                                    `SET mfaEmailSecret = ?, mfaEmailExpire = ? ` +
                                    `WHERE email = ?`;
            con.query(mfaEmailCodeSQL, [randomCode, expireDate, email], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error generating MFA code" });
                }
                const userInfoSQL = `SELECT title, lastName FROM user WHERE email = ?`;
                con.query(userInfoSQL, [email], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving user information" });
                    }
                    if (results.length === 0)
                    {
                        console.log("No User Found");
                        con.release();
                        return res.status(500).send({ err: "User information for MFA not found" });
                    }
                    await sendMFAEmail(email, randomCode, results[0].title, results[0].lastName); // POSTMAN
                    con.release();
                    return res.send({ msg: "MFA code sent" });
                });    
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.post(`/mfa-auth`, (req, res) => {
    pool.getConnection((err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Auth DB Connected");
    
        try
        {
            const emailDecoded = jwt.verify(req.cookies.email, SECRET_KEY);
            const email = emailDecoded.email;
            console.log(email);
            if (!email)
            {
                con.release();
                return res.status(401).send({ errAuth: "Error" });
            }
        
            const token = validateMFACode(req.body.mfaCode);
            const mfaType = validateMFAType(req.body.mfaType);
            if (!token || !mfaType)
            {
                con.release();
                return res.status(422).send({ err: "Invalid MFA options" });
            }
            
            var sql = `SELECT * FROM cred JOIN user USING (userID) WHERE email = ?`;
            con.query(sql, [email], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving user" });
                }
        
                if (results.length === 0) 
                {
                    con.release();
                    return res.status(400).send( { err: "User not found" });
                }
        
                const user = results[0];
                var verified = false;
        
                if (mfaType == "authApp")
                {
                    verified = sp.totp.verify({
                        secret: user.mfaSecret,
                        encoding: 'base32',
                        token: token
                    });
                }
                else if (mfaType == "email")
                {
                    const currentDate = new Date();
                    const expireDate = new Date(user.mfaEmailExpire);
                    console.log("Current Date", currentDate);
                    console.log("Expire Date", expireDate);
                    console.log(isBefore(currentDate, expireDate));
                    if (isBefore(currentDate, expireDate) && token === user.mfaEmailSecret)
                    {
                        verified = true;
                    }
                }
        
                console.log("Token - " + token);
                console.log(verified);
        
                if (!verified)
                {
                    con.release();
                    return res.status(500).send({err: "MFA Code Invalid"});
                }
            
                var orgRolesSQL = `SELECT organizationID, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(groupID SEPARATOR '&&') AS "groupsInID" ` +
                `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
                `WHERE userID = ? ` +
                `GROUP BY organizationID`; 
                con.query(orgRolesSQL, [user.userID], async (err, resultsSec) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving user information" });
                    }
                
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
                
                    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "3h" });
                    console.log("Token - " + token);
        
                    // Check if it is the first time they are entering MFA
                    if (req.body.first)
                    {
                        var sql = `UPDATE cred JOIN user USING (userID) ` +
                                `SET mfaActive = "T" ` +
                                `WHERE email = ?`;
                        con.query(sql, [email], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                // return res.status(500).send({ err: "Error activating MFA" });
                            }
                        });
                    }
                
                    res.cookie('jwt', token, { maxAge: 9000000 });
                    res.cookie('email', '', { maxAge: 1 });
                    res.cookie('mfaType', '', { maxAge: 1 });
                    con.release();
                    res.send({msg: "MFA Success"});
                });
            });   
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/mfa-reset`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Reset DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({ err: "Invalid Authorization" });
            }
            const sql = `UPDATE cred JOIN user USING (userID) ` +
                        `SET mfaActive = "F" ` +
                        `WHERE userID = ?`;
            con.query(sql, [userID, userID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error resetting MFA" });
                }
                con.release();
                return res.status(200).send({ msg: "Successfully reset MFA" });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/user-passenger-info`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("User Passenger Info DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({ err: "Invalid authorization" });
            }
            con.query(`SELECT email, firstName, lastName, phoneNumber, birthdate, gender, preferredAirport, title FROM user WHERE userID = ?`, [userID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(404).send({ err: "Error retrieving user" });
                }
                if (results.length === 0) 
                {
                    con.release();
                    return res.status(404).send({ err: "User not found" });
                }
                const userRow = results[0];
                userRow['birthdate'] = await decryptField(userRow["birthdate"]);
                con.release();
                return res.send(userRow);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/user-personal-information`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.redirect(307, "/signIn");
            }
            var sql = `SELECT * FROM user WHERE userID = ?`;
            con.query(sql, userID, async (err, result, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving user information" });
                }
                if (result.length == 0)
                {
                    con.release();
                    return res.send({});
                }
                result = result[0];
                console.log(result);
                console.log(result['birthdate']);
                result['birthdate'] = await decryptField(result['birthdate']);
                result['KTN'] = result['KTN'] ? await decryptField(result['KTN']) : "";
                con.release();
                return res.send(result);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.post(`/update-user-personal-information`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid authorziation" });
            }
            const { firstName, middleName, lastName, birthdate, preferredName, phoneNumber, ktn, gender, title, preferredAirport } = req.body;
            const userObj = validateUserInfo(firstName, middleName, lastName, "email@address.com", birthdate, preferredName, phoneNumber, ktn, gender, title, preferredAirport, "superDuper1!", "superDuper1!");
            if (!userObj)
            {
                con.release();
                return res.status(400).send({ err: "Invalid user data" });
            }
    
            const encryptedBirthdate = await encryptField(userObj.birthdate);
            const encryptedKTN = userObj.ktn != null ? await encryptField(userObj.ktn) : null;
            const sql = `UPDATE user ` +
                    `SET firstName = ?, middleName = ?, lastName = ?, phoneNumber = ?, preferredName = ?, gender = ?, birthdate = ?, KTN = ?, title = ?, preferredAirport = ? ` +
                    `WHERE userID = ?`;
                con.query(sql, [userObj.firstName, userObj.middleName, userObj.lastName, userObj.phoneNumber, userObj.preferredName, userObj.gender, encryptedBirthdate, encryptedKTN, userObj.title, userObj.preferredAirport, userID], function (err, result, fields) {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error updating user data" });
                    }
                    con.release();
                    return res.send({ msg: "Successfully updated user information" });
                });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-organization-events`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userID = await anyAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({err: "Invalid authorization"});
            }
    
            const sql = `SELECT eventID, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, GROUP_CONCAT(airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports ` + 
                        `FROM event LEFT JOIN event_airport USING (eventID) ` +
                        `WHERE organizationID = ? ` +
                        `GROUP BY eventID`;
            con.query(sql, [organizationID], (err, results, fields) => {
                if (err)
                {
                    con.release();
                    errCallback(err);
                    return res.status(500).send({ err: "Error retrieving events" });
                }
                con.release();
                return res.send(results);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({err: "Server error"});
        } 
    });
});

app.get(`/get-organization-groups`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userID = await anyAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                console.log("FAILED", userID);
                return res.status(403).send({err: "Invalid authorization"});
            }
            const sql = `SELECT groupID, groupName, adminRole, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, flightTierID, 0 AS num, COUNT(userID) AS numMembers ` + 
                        `FROM rolegroup LEFT JOIN user_group USING (groupID) ` +
                        `WHERE organizationID = ? ` +
                        `GROUP BY groupID ` +
                        `ORDER BY groupID ASC`;
            con.query(sql, [organizationID], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving organization groups" });
                }
    
                var attendeeGroups = [];
                var adminGroups = [];
                results.forEach(row => {
                    row.adminRole == "false" ? attendeeGroups.push(row) : adminGroups.push(row);
                });
                con.release();
                return res.send({ attendeeGroups: attendeeGroups, adminGroups, adminGroups });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({err: "Server error"});
        } 
    });
});

/** Get events for a particular organization where the user
 * is an admin, event planner, executive event planner or finance
 */
app.get(`/get-admin-events-organization-from-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userAdminID = await adminAuth(req.cookies.jwt, organizationID, con);
            if (!userAdminID)
            {
                const userID = await eventManagementAuth(req.cookies.jwt, organizationID, con);
                if (!userID)
                {
                    con.release();
                    return res.status(403).send({ err: "Invalid authorization" });
                }
            
                const sql = `SELECT e.eventID, e.eventName, e.eventLocation, e.startDate, e.endDate, e.checkedBags, e.layoverMax, e.dateTimeBuffer, e.firstThreshold, e.secondThreshold, e.overallBudget, e.organizationID, e.maxFlightTier, GROUP_CONCAT(DISTINCT airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, e.allowHotels, GROUP_CONCAT(DISTINCT cityCode SEPARATOR "&&") AS cityCode, eu.adminRoles ` +
                            `FROM event e JOIN rolegroup USING (organizationID) ` +
                            `LEFT JOIN event_airport USING (eventID) LEFT JOIN event_city USING (eventID), (SELECT eventID, userID, GROUP_CONCAT(adminRole SEPARATOR "&&") AS adminRoles FROM event_user JOIN rolegroup USING (groupID) WHERE adminRole IN ("execEvent", "event", "finance") AND userID = ? GROUP BY eventID) eu ` +
                            `WHERE organizationID = ? AND (e.eventID IN (eu.eventID)) ` +
                            `GROUP BY e.eventID ` +
                            `ORDER BY e.startDate DESC`;
                const values = [userID, organizationID];
                con.query(sql, values, async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retreiving events" });
                    }
                    const attendeeCountSQL = `SELECT COUNT(DISTINCT userID) AS attendeeNum, eventID ` +
                                            `FROM event_user JOIN event USING (eventID) JOIN rolegroup USING (groupID) ` +
                                            `WHERE event.organizationID = ? AND adminRole = "false" ` +
                                            `GROUP BY eventID`;
                    con.query(attendeeCountSQL, [organizationID], async (err, secResults, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error counting event attendees" });
                        }
                        const eventCount = {};
                        secResults.forEach(element => {
                            eventCount[element.eventID] = element.attendeeNum;
                        });
                        con.release();
                        return res.send({ events: results, eventCount: eventCount });
                    });
                });
            }
            else
            {
                const sql = `SELECT eventID, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, GROUP_CONCAT(DISTINCT airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, allowHotels, GROUP_CONCAT(DISTINCT cityCode SEPARATOR "&&") AS cityCode, "admin" AS adminRoles ` + 
                            `FROM event LEFT JOIN event_airport USING (eventID) LEFT JOIN event_city USING (eventID) ` +
                            `WHERE organizationID = ? ` +
                            `GROUP BY eventID ` +
                            `ORDER BY startDate DESC`;
                con.query(sql, [organizationID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retreiving events" });
                    }
                    const attendeeCountSQL = `SELECT COUNT(DISTINCT userID) AS attendeeNum, eventID ` +
                                    `FROM event LEFT JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) ` +
                                    `WHERE event.organizationID = ? AND adminRole = "false" ` +
                                    `GROUP BY eventID`;
                    con.query(attendeeCountSQL, [organizationID], async (err, secResults, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error counting event attendees" });
                        }
                        const eventCount = {};
                        secResults.forEach(element => {
                            eventCount[element.eventID] = element.attendeeNum;
                        });
                        con.release();
                        return res.send({ events: results, eventCount: eventCount });
                    });
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/** Get events for a particular organization where the user
 * is an admin, executive approver, or approver
 */
app.get(`/get-approver-events-organization-from-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userAdminID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!userAdminID)
            {
                const userID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!userID)
                {
                    con.release();
                    return res.status(403).send({ err: "Invalid authorization" });
                }
                
                const sql = `SELECT e.eventID, e.eventName, e.eventLocation, e.startDate, e.endDate, e.checkedBags, e.layoverMax, e.dateTimeBuffer, e.firstThreshold, e.secondThreshold, e.overallBudget, e.organizationID, e.maxFlightTier, flightTierName, GROUP_CONCAT(DISTINCT airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, eu.adminRoles ` +
                            `FROM event e JOIN rolegroup USING (organizationID) JOIN flightTier ON e.maxFlightTier = flightTier.flightTierID ` +
                            `LEFT JOIN event_airport USING (eventID), (SELECT eventID, userID, GROUP_CONCAT(adminRole SEPARATOR "&&") AS adminRoles FROM event_user JOIN rolegroup USING (groupID) WHERE adminRole = "approver" AND userID = ? GROUP BY eventID) eu ` +
                            `WHERE organizationID = ? AND (e.eventID IN (eu.eventID)) ` +
                            `GROUP BY e.eventID`;
                const values = [userID, organizationID];
                con.query(sql, values, (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving events" });
                    }
                    con.release();
                    return res.send(results);
                });
            }
            else
            {
                const sql = `SELECT eventID, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, flightTierName, GROUP_CONCAT(DISTINCT airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, "admin" AS adminRoles ` + 
                            `FROM event JOIN flightTier ON event.maxFlightTier = flightTier.flightTierID LEFT JOIN event_airport USING (eventID) ` +
                            `WHERE organizationID = ? ` +
                            `GROUP BY eventID`;
                con.query(sql, [organizationID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving events" });
                    }
                    con.release();
                    return res.send(results);
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/create-event`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        console.log(req.body);
        const { eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, hotelsAllowed, cityCode } = req.body;
        const eventInfoObj = validateEventInfo(eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, hotelsAllowed, cityCode);
        if (!eventInfoObj)
        {
            con.release();
            return res.status(422).send({ err: "Invalid event values" });
        }
        
        const userID = await eventAuth(req.cookies.jwt, organizationID, con);
        if (!userID)
        {
            con.release();
            return res.status(401).send({error: "Not Authorized"});
        }

        try
        {            
            con.beginTransaction();
            const sql = `INSERT INTO event (eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, allowHotels) ` +
                       `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [eventInfoObj.eventName, eventInfoObj.eventLocation, eventInfoObj.startDate, eventInfoObj.endDate, eventInfoObj.checkedBags, 
                eventInfoObj.layoverMax, eventInfoObj.dateTimeBuffer, eventInfoObj.firstThreshold, eventInfoObj.secondThreshold, eventInfoObj.overallBudget, 
                eventInfoObj.organizationID, eventInfoObj.maxFlightTier, eventInfoObj.hotelsAllowed];
            con.query(sql, params, async (err, result, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error creating event" });
                }
                const insertID = result.insertId;
    
                if (eventInfoObj.cityCode != "")
                {
                    const cityCodeSQL = `INSERT INTO event_city VALUES (?, ?)`;
                    con.query(cityCodeSQL, [insertID, eventInfoObj.cityCode], (err, result, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                        }
                    });
                }
                
                const eventAirportSQL = `INSERT INTO event_airport VALUES (?, ?, ?)`;
                await eventInfoObj.allowedAirports.forEach(airport => {
                    con.query(eventAirportSQL, [insertID, airport[0], airport[1]], function (err, result, fields) {
                        if (err) 
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                        }
                    });
                });
    
                const historySQL = `INSERT INTO eventHistory (eventID, dateModified, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, allowHotels) ` +
                                    `VALUES (?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const historyParams = [insertID, eventInfoObj.eventName, eventInfoObj.eventLocation, eventInfoObj.startDate, eventInfoObj.endDate, eventInfoObj.checkedBags, eventInfoObj.layoverMax, 
                    eventInfoObj.dateTimeBuffer, eventInfoObj.firstThreshold, eventInfoObj.secondThreshold, eventInfoObj.overallBudget, eventInfoObj.organizationID, eventInfoObj.maxFlightTier, eventInfoObj.hotelsAllowed];
                con.query(historySQL, historyParams, async (err, result, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error updaing event history" });
                    }
    
                    // Add user to the event if they are only an event planner
                    const eventOnly = await eventOnlyAuth(req.cookies.jwt, eventInfoObj.organizationID, con);
                    if (!eventOnly)
                    {
                        con.commit();
                        con.release();
                        return res.send({ msg: "Event created successfully" });
                    }
                    else
                    {
                        const eventOnlyUserID = eventOnly.userID;
                        const eventOnlyAdminRole = eventOnly.adminRole;
    
                        const addAdminSQL = `INSERT INTO event_user (userID, eventID, groupID) ` +
                                            `SELECT ?, ?, groupID ` +
                                            `FROM rolegroup ` + 
                                            `WHERE organizationID = ? AND adminRole = ?`;
                        con.query(addAdminSQL, [eventOnlyUserID, insertID, eventInfoObj.organizationID, eventOnlyAdminRole], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error adding user as admin to event" });
                            }
    
                            con.commit();
                            con.release();
                            return res.send({ msg: "Event created successfully" });
                        });
                    }                
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.rollback(function () {
                con.release();
            });
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/modify-event`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Create Event DB Connected");
    
        try
        {
            const { eventID, eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, currentAllowedAirports, hotelsAllowed, cityCode } = req.body;
            const eventInfoObj = validateEventModifyInfo(eventID, eventName, eventLocation, startDate, endDate, checkedBags, maxFlightTier, dateTimeBuffer, layoverMax, firstThreshold, secondThreshold, overallBudget, organizationID, allowedAirports, currentAllowedAirports, hotelsAllowed, cityCode);
            if (!eventInfoObj)
            {
                return res.status(422).send({ err: "Invalid event values" });
            }
    
            async function eventInFuture ()
            {
                const sql = `SELECT endDate ` +
                            `FROM event ` +
                            `WHERE eventID = ? AND endDate > CURDATE()`;
                return new Promise ((resolve, reject) => {
                    con.query(sql, [eventInfoObj.eventID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            resolve(false);
                        }
                        if (results.length == 0)
                        {
                            resolve(false);
                        }
                        resolve(true);
                    });
                });          
            }
    
            async function updateHistory ()
            {
                const sql = `SELECT eventID, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, allowHotels ` +
                            `FROM event ` +
                            `WHERE eventID = ?`;
                return new Promise ((resolve, reject) => {
                    con.query(sql, [eventInfoObj.eventID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            resolve(false);
                        }
                        if (results.length === 0)
                        {
                            resolve(false);
                        }
                        const details = results[0];
                        const historySQL = `INSERT INTO eventHistory (eventID, dateModified, eventName, eventLocation, startDate, endDate, checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, organizationID, maxFlightTier, allowHotels) ` +
                                            `VALUES (?, CURRENT_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const historyParams = [eventInfoObj.eventID, details.eventName, details.eventLocation, details.startDate, details.endDate, details.checkedBags, details.layoverMax, details.dateTimeBuffer, details.firstThreshold, details.secondThreshold, details.overallBudget, details.organizationID, details.maxFlightTier, details.allowHotels];
                        resolve(new Promise ((resolve, reject) => {
                            con.query(historySQL, historyParams, async (err, results, fields) => {
                                if (err)
                                {
                                    errCallback(err);
                                    resolve(false);
                                }
                                resolve(true);
                            });
                        }));
                    });
                });
            }
    
            async function financeUpdates ()
            {
                const sql = `UPDATE event ` +
                `SET firstThreshold = ?, secondThreshold = ?, overallBudget = ? ` +
                `WHERE eventID = ?`;
                const params = [eventInfoObj.firstThreshold, eventInfoObj.secondThreshold, eventInfoObj.overallBudget, eventInfoObj.eventID];
                return new Promise ((resolve, reject) => {
                    con.query(sql, params, async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            resolve(false);
                        }
                        resolve(true);
                    });   
                }); 
            }
        
            async function eventUpdates ()
            {
                const { newAirports, removedAirports, updateAirports } = findEventAirportDifferences(eventInfoObj.allowedAirports, eventInfoObj.currentAllowedAirports);
                var sql = `UPDATE event ` +
                        `SET eventName = ?, eventLocation = ?, startDate = ?, endDate = ?, checkedBags = ?, maxFlightTier = ?, dateTimeBuffer = ?, layoverMax = ?, allowHotels = "?" ` +
                        `WHERE eventID = ?`;
                const params = [eventInfoObj.eventName, eventInfoObj.eventLocation, eventInfoObj.startDate, eventInfoObj.endDate, eventInfoObj.checkedBags, eventInfoObj.maxFlightTier, eventInfoObj.dateTimeBuffer, eventInfoObj.layoverMax, eventInfoObj.hotelsAllowed, eventInfoObj.eventID];
                return new Promise ((resolve, reject) => {
                    con.query(sql, params, async (err, result, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            resolve(false);
                        }
    
                        sql = `SELECT cityCode FROM event_city WHERE eventID = ?`;
                        con.query(sql, [eventInfoObj.eventID], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                resolve(false);
                            }
                            if (results.length == 0)
                            {
                                sql = `INSERT INTO event_city VALUES (?, ?)`;
                                con.query(sql, [eventInfoObj.eventID, eventInfoObj.cityCode], (err, results, fields) => {
                                    if (err)
                                    {
                                        errCallback(err);
                                        resolve(false);
                                    }
                                });
                            }
                            else
                            {
                                sql = `UPDATE event_city SET cityCode = ? WHERE eventID = ?`;
                                con.query(sql, [eventInfoObj.cityCode, eventInfoObj.eventID], (err, results, fields) => {
                                    if (err)
                                    {
                                        errCallback(err);
                                        resolve(false);
                                    }
                                });
                            }
                        });
            
                        sql = `INSERT INTO event_airport VALUES (?, ?, ?)`;
                        await newAirports.forEach(airport => {
                            con.query(sql, [eventInfoObj.eventID, airport[0], airport[1]], function (err, result, fields) {
                                if (err)
                                {
                                    errCallback(err);
                                    resolve(false);
                                }
                            });
                        });
            
                        sql = `DELETE FROM event_airport WHERE eventID = ? AND airportCode = ?`;
                        await removedAirports.forEach(airport => {
                            con.query(sql, [eventInfoObj.eventID, airport[0]], function (err, result, fields) {
                                if (err)
                                {
                                    errCallback(err);
                                    resolve(false);
                                }
                            });
                        });
            
                        sql = `UPDATE event_airport SET airportCode = ?, primaryAirport = ? WHERE eventID = ? AND airportCode = ?`;
                        await updateAirports.forEach(airport => {
                            con.query(sql, [airport[0], airport[1], eventInfoObj.eventID, airport[0]], function (err, result, fields) {
                                if (err)
                                {
                                    errCallback(err);
                                    resolve(false);
                                }
                            });
                        });
                        resolve(true);
                    });
                });
            }
        
            const adminUserID = await adminAuth(req.cookies.jwt, organizationID, con);
            if (!adminUserID)
            {
                const eventUserID = await specificEventEventAuth(req.cookies.jwt, eventID, con);
                const financeUserID = await specificFinanceEventAuth(req.cookies.jwt, eventID, con);
                if (eventUserID && financeUserID)
                {
                    con.beginTransaction();
                    const futureEvent = await eventInFuture();
                    const financeSuc = await financeUpdates();
                    const eventSuc = await eventUpdates();
                    const historySuc = await updateHistory();
    
                    if (!futureEvent || !financeSuc || !eventSuc || !historySuc)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error modifying finance and event configurations for event" });
                    }                
                    con.commit();
                    con.release();
                    return res.send({ msg: "Successfully modified event" });
                }
                else if (eventUserID)
                {
                    con.beginTransaction();
                    const futureEvent = await eventInFuture();
                    const eventSuc = await eventUpdates();
                    const historySuc = await updateHistory();
                    if (!futureEvent || !eventSuc || !historySuc)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error modifying event configurations for event" });
                    }
                    con.release();
                    return res.send({ msg: "Successfully modified event" });
                }
                else if (financeUserID)
                {
                    con.beginTransaction();
                    const futureEvent = await eventInFuture();
                    const financeSuc = await financeUpdates();
                    const historySuc = await updateHistory();
                    if (!futureEvent || !financeSuc || !historySuc)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error modifying finance configurations for event" });
                    }
                    con.release();
                    return res.send({ msg: "Successfully modified event" });
                }
                else
                {
                    con.release();
                    return res.status(403).send({ err: "Not Authenticated" });
                }
            }
            else
            {
                con.beginTransaction();
                const futureEvent = await eventInFuture();
                const financeSuc = await financeUpdates();
                const eventSuc = await eventUpdates();
                const historySuc = await updateHistory();
                console.log("Future Event", futureEvent);
                console.log("Finance Success", financeSuc);
                console.log("Event Success", eventSuc);
                console.log("History Success", historySuc);
                if (!futureEvent || !financeSuc || !eventSuc || !historySuc)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error modifying finance and event configurations for event" });
                }                
                con.commit();
                con.release();
                return res.send({ msg: "Successfully modified event" });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/export-event-history-csv`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Export Event History CSV DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            const userID = await eventAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization" });
            }
        
            const sql = `SELECT dateModified AS "Date Modified", eventName AS "Event Name", eventLocation AS "Event Location", startDate AS "Start Date", endDate AS "End Date", checkedBags AS "Checked Bags", layoverMax AS "Layover Max", dateTimeBuffer AS "Day Buffer", firstThreshold AS "First Threshold", secondThreshold AS "Second Threshold", overallBudget AS "Overall Budget", flightTierName AS "Flight Tier Name", allowHotels AS "Allow Hotels" ` +
                        `FROM eventHistory JOIN flightTier ON flightTierID = maxFlightTier ` +
                        `WHERE eventID = ?`;
            con.query(sql, [eventID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving event update history" });
                }
    
                var eventName = "event";
                if (results.length != 0)
                {
                    eventName = results[0]['Event Name'];
                }
        
                try
                {
                    const headers = ['Date Modified', 'Event Name', 'Event Location', 'Start Date', 'End Date', 'Checked Bags', 'Layover Max', 'Date Time Buffer', 'First Threshold', 'Second Threshold', 'Overall Budget', 'Flight Tier', 'Allow Hotels'];
                    const jsonData = new Parser (headers);
                    const csvData = jsonData.parse(results);
                    con.release();
                    res.attachment(eventName + ".csv");
                    res.status(200).send(csvData);
                }
                catch (err)
                {
                    console.log(err);
                    con.release();
                    return res.status(500).send({ err: "Error generating file" });
                }
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }
    });
});

app.get(`/get-event-approvals`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Event Approvals DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            const execAppUserID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!execAppUserID)
            {
                const appUserID = await specificApproverEventAuth(req.cookies.jwt, eventID, con);
                if (!appUserID)
                {
                    con.release();
                    return res.status(403).json({ message: 'Invalid authroization'});
                }
                else
                {
                    const sql = `SELECT ub.firstName, ub.middleName, ub.lastName, eventName, eventID, bookingID, approved, GROUP_CONCAT(warning SEPARATOR "&&") AS "warnings", api, cost, booking.checkedBags AS "bookingCheckedBags", firstThreshold, secondThreshold, overallBudget, startDate, endDate, event.checkedBags AS "allowedCheckedBags", layoverMax, eventLocation, dateTimeBuffer, maxFlightTier, organizationID, flightTierName, json, ua.firstName AS "approverFirstName", ua.lastName AS "approverLastName", "flight" AS type ` +
                                `FROM booking JOIN event USING (eventID) JOIN user ub USING (userID) JOIN flightTier ON maxFlightTier = flightTierID JOIN booking_warning USING (bookingID) LEFT JOIN user ua ON booking.approverID = ua.userID ` +
                                `WHERE (eventID = ?) ` +
                                `GROUP BY bookingID`;
                    con.query(sql, eventID, function (err, result, fields) {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving event approvals" });
                        }
                        const hotelSQL = `SELECT ub.firstName, ub.middleName, ub.lastName, eventName, eventID, hotelBookingID, totalNightCost, avgNightCost, hotelName, approved, hotelJSON, ua.firstName AS approverFirstName, ua.lastName AS approverLastName, "hotel" AS type ` +
                                        `FROM hotelBooking JOIN event USING (eventID) JOIN user ub USING (userID) LEFT JOIN user ua ON hotelBooking.approverID = ua.userID ` +
                                        `WHERE eventID = ? `;
                        con.query(hotelSQL, [eventID], (err, secResult, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                return res.status(500).send({ err: "Error retrieving event approvals" });
                            }
                            Array.prototype.push.apply(result, secResult);
                            con.release();
                            return res.status(200).send(result);
                        });
                    });
                }
            }
            else
            {
                const sql = `SELECT ub.firstName, ub.middleName, ub.lastName, eventName, eventID, bookingID, approved, GROUP_CONCAT(warning SEPARATOR "&&") AS "warnings", api, cost, booking.checkedBags AS "bookingCheckedBags", firstThreshold, secondThreshold, overallBudget, startDate, endDate, event.checkedBags AS "allowedCheckedBags", layoverMax, eventLocation, dateTimeBuffer, maxFlightTier, organizationID, flightTierName, json, ua.firstName AS "approverFirstName", ua.lastName AS "approverLastName", "flight" AS type ` +
                            `FROM booking JOIN event USING (eventID) JOIN user ub USING (userID) JOIN flightTier ON maxFlightTier = flightTierID JOIN booking_warning USING (bookingID) LEFT JOIN user ua ON booking.approverID = ua.userID ` +
                            `WHERE (eventID = ?) ` +
                            `GROUP BY bookingID`;
                con.query(sql, eventID, function (err, result, fields) {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving event approvals" });
                    }
                    const hotelSQL = `SELECT ub.firstName, ub.middleName, ub.lastName, eventName, eventID, hotelBookingID, totalNightCost, avgNightCost, hotelName, approved, hotelJSON, ua.firstName AS approverFirstName, ua.lastName AS approverLastName, "hotel" AS type ` +
                    `FROM hotelBooking JOIN event USING (eventID) JOIN user ub USING (userID) LEFT JOIN user ua ON hotelBooking.approverID = ua.userID ` +
                    `WHERE eventID = ? `;
                    con.query(hotelSQL, [eventID], (err, secResult, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving event approvals" });
                        }
                        Array.prototype.push.apply(result, secResult);
                        con.release();
                        return res.status(200).send(result);
                    });
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server errpr" });
        } 
    });
});

app.get(`/get-report-data`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Report Data DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            // Toggles whether all events or only some should be selected
            const whereClause = eventID === 0 ? `WHERE event.organizationID = ?` : `WHERE eventID = ?`;
            const whereValue = eventID === 0 ? organizationID : eventID;
        
            // Check if they are an admin and can view all events
            const userAdminID = await adminAuth(req.cookies.jwt, organizationID, con);
            if (!userAdminID && eventID === 0)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization to view all events" });
            }
        
            if (userAdminID)
            {
                const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", booking.checkedBags AS "Checked Bags", CONCAT("$", cost) AS Cost, au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                            `FROM booking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID ` +
                            whereClause;
                con.query(sql, [whereValue], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving report data" });
                    }
                    const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", hotelName AS "Hotel Name", CONCAT("$", totalNightCost) AS "Total Cost", CONCAT("$", avgNightCost) AS "Night Cost", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                `FROM hotelBooking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID ` +
                                whereClause;
                    con.query(sql, [whereValue], (err, secResults, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving report data" });
                        }
                        con.release();
                        return res.send({ flights: results, hotels: secResults });
                    });
                });
            }
            else
            {
                const userFinanceID = await financeAuth(req.cookies.jwt, organizationID, con);
                if (!userFinanceID)
                {
                    const userID = await eventAuth(req.cookies.jwt, organizationID, con);
                    if (!userID)
                    {
                        con.release();
                        return res.status(403).send({ err: "Invalid authorization" });
                    }
        
                    const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", booking.checkedBags AS "Checked Bags", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                `FROM booking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID JOIN event_user eu USING (eventID) JOIN rolegroup USING (groupID) ` +
                                whereClause + ` AND eu.userID = ? AND adminRole IN ("execEvent", "event")`;
                    con.query(sql, [whereValue, userID], (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving report data" });
                        }
                        const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", hotelName AS "Hotel Name", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                    `FROM hotelBooking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID ` +
                                    whereClause;
                        con.query(sql, [whereValue], (err, secResults, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                return res.status(500).send({ err: "Error retrieving report data" });
                            }
                            con.release();
                            return res.send({ flights: results, hotels: secResults });
                        });
                    });
                }
                else
                {
                    const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", booking.checkedBags AS "Checked Bags", CONCAT("$", cost) AS "Price", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                `FROM booking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID JOIN event_user eu USING (eventID) JOIN rolegroup USING (groupID) ` +
                                whereClause + ` AND eu.userID = ? AND adminRole = "finance"`;
                    con.query(sql, [whereValue, userFinanceID], (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving report data" });
                        }
    
                        if (results.length === 0)
                        {
                            const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", booking.checkedBags AS "Checked Bags", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                `FROM booking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID JOIN event_user eu USING (eventID) JOIN rolegroup USING (groupID) ` +
                                whereClause + ` AND eu.userID = ? AND adminRole IN ("execEvent", "event")`;
                            con.query(sql, [whereValue, userFinanceID], (err, results, fields) => {
                                if (err)
                                {
                                    errCallback(err);
                                    con.release();
                                    return res.status(500).send({ err: "Error retrieving report data" });
                                }
                                const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", hotelName AS "Hotel Name", CONCAT("$", totalNightCost) AS "Total Cost", CONCAT("$", avgNightCost) AS "Night Cost", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                            `FROM hotelBooking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID ` +
                                            whereClause;
                                con.query(sql, [whereValue], (err, secResults, fields) => {
                                    if (err)
                                    {
                                        errCallback(err);
                                        con.release();
                                        return res.status(500).send({ err: "Error retrieving report data" });
                                    }
                                    con.release();
                                    return res.send({ flights: results, hotels: secResults });
                                });
                            });
                        }
                        else
                        {
                            const sql = `SELECT bu.lastName AS "Last Name", bu.firstName AS "First Name", eventName AS "Event", approved AS "Approval Status", hotelName AS "Hotel Name", CONCAT("$", totalNightCost) AS "Total Cost", CONCAT("$", avgNightCost) AS "Night Cost", au.lastName AS "Approver Last Name", au.firstName AS "Approver First Name" ` +
                                `FROM hotelBooking JOIN user bu USING (userID) JOIN event USING (eventID) LEFT JOIN user au ON au.userID = approverID ` +
                                whereClause;
                            con.query(sql, [whereValue], (err, secResults, fields) => {
                                if (err)
                                {
                                    errCallback(err);
                                    con.release();
                                    return res.status(500).send({ err: "Error retrieving report data" });
                                }
                                con.release();
                                return res.send({ flights: results, hotels: secResults });
                            });
                        }
                    });
                }
            }
        }
        catch (err)
        {
            console.log(err)
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-exec-organizations-from-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Exec Orgs DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Invalid authorization"});
            }
    
            const sql = `SELECT organizationID, organizationName ` +
                        `FROM user JOIN user_group USING (userID) ` +
                        `JOIN rolegroup USING (groupID) ` +
                        `JOIN organization USING (organizationID) ` +
                        `WHERE userID = ? and adminRole IN ("admin", "execEvent")`;
            con.query(sql, [userID], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving organizations" });
                }
                con.release();
                return res.send(results);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/**
 * Allows for organizations to be populated on the event management page
 */
app.get(`/get-event-management-organizations-from-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Event Management Orgs from User DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Invalid authorization"});
            }
    
            const sql = `SELECT organizationID, organizationName, GROUP_CONCAT(adminRole SEPARATOR "&&") AS adminRoles ` +
                        `FROM user JOIN user_group USING (userID) ` +
                        `JOIN rolegroup USING (groupID) ` +
                        `JOIN organization USING (organizationID) ` +
                        `WHERE userID = ? AND adminRole IN ("admin", "execEvent", "event", "finance") ` +
                        `GROUP BY organizationID`;
            con.query(sql, [userID], (err, results, fields) => {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving organizations" });
                }
                con.release();
                return res.send(results);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-approver-organizations-from-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid authorization" });
            }
            
            const sql = `SELECT organizationID, organizationName, GROUP_CONCAT(adminRole SEPARATOR "&&") AS adminRoles ` +
                        `FROM user JOIN user_group USING (userID) ` +
                        `JOIN rolegroup USING (groupID) ` +
                        `JOIN organization USING (organizationID) ` +
                        `WHERE userID = ? AND adminRole IN ("admin", "execApprover", "approver") ` +
                        `GROUP BY organizationID`;
            con.query(sql, userID, function (err, result, fields) {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving approver organizations" });
                }
                con.release();
                return res.send(result);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-event-admins`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Event Admins DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            const userID = await eventAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({err: "Invalid Authorization"});
            }
    
            const sql = `SELECT email, firstName, lastName, user_group.groupID, groupName, eventID, adminRole ` +
                    `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) LEFT JOIN event_user ON (user_group.userID = event_user.userID AND user_group.groupID = event_user.groupID) ` +
                    `WHERE organizationID = ? AND adminRole NOT IN ("false", "admin", "execEvent", "execApprover")`;
            con.query(sql, [organizationID], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving event admins" });
                }
    
                const eventPlanners = {};
                const finance = {};
                const approvers = {};
                results.forEach(row => {
                    var userObj = {}
                    userObj["email"] = row.email;
                    userObj["name"] = row.firstName + " " + row.lastName;
                    userObj["assignedToEvent"] = row.eventID == eventID ? true : false;
    
                    if (userObj["assignedToEvent"] && row.adminRole == "event")
                    {
                        eventPlanners[row.email] = userObj;
                    }
                    else if ((!userObj["assignedToEvent"]) && row.adminRole == "event" && (!(row.email in eventPlanners)))
                    {
                        eventPlanners[row.email] = userObj;
                    }
                    else if (userObj["assignedToEvent"] && row.adminRole == "finance")
                    {
                        finance[row.email] = userObj;
                    }
                    else if (!userObj["assignedToEvent"] && row.adminRole == "finance" && !(row.email in finance))
                    {
                        finance[row.email] = userObj;
                    }
                    else if (userObj["assignedToEvent"] && row.adminRole == "approver")
                    {
                        approvers[row.email] = userObj;
                    }
                    else if (!userObj["assignedToEvent"] && row.adminRole == "approver" && !(row.email in approvers))
                    {
                        approvers[row.email] = userObj;
                    }
                });
    
            con.release();
            return res.send({ event: eventPlanners, finance: finance, approver: approvers });
        });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-event-attendees`, async (req, res) => { 
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Event Attendees DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            const userID = await eventAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({err: "Invalid Authorization"});
            }
        
            var eventAttendees = {};
        
            // Gets all organization members with attendee roles
            var sql = `SELECT DISTINCT email, firstName, lastName, GROUP_CONCAT(groupName, "|", groupID SEPARATOR "&&") AS orgAttendeeRoles ` +
                    `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
                    `WHERE organizationID = ? AND adminRole = "false" ` +
                    `GROUP BY userID ` +
                    `ORDER BY firstName ASC, lastName ASC`;
            con.query(sql, [organizationID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error getting organization members" });
                }
                
                const orgResults = results;
        
                sql = `SELECT DISTINCT email, GROUP_CONCAT(groupName, "|", groupID SEPARATOR "&&") AS eventAttendeeRoles ` +
                    `FROM user JOIN event_user USING (userID) JOIN rolegroup USING (groupID) ` +
                    `WHERE eventID = ? AND adminRole = "false" ` +
                    `GROUP BY userID`;
                con.query(sql, [eventID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving event roles for attendees" });
                    }
        
                    var emailArr = [];
                    var emailIndexes = [];
                    for (let i = 0; i < results.length; i++)
                    {
                        emailArr.push(results[i].email);
                        emailIndexes[results[i].email] = i;
                    }
        
                    for (let i = 0; i < orgResults.length; i++)
                    {
                        var userEmail = orgResults[i].email;
                        
                        var userObj = {};
                        userObj['email'] = userEmail;
                        userObj['name'] = orgResults[i].firstName + " " + orgResults[i].lastName;
                        var orgAttendeeRoles = (orgResults[i].orgAttendeeRoles).split("&&");
                        for (let j = 0; j < orgAttendeeRoles.length; j++)
                        {
                            var orgAttendeeRoleArr = orgAttendeeRoles[j].split("|");
                            orgAttendeeRoles[j] = { groupName: orgAttendeeRoleArr[0], groupID: parseInt(orgAttendeeRoleArr[1]) };
                        }
                        userObj['orgAttendeeRoles'] = orgAttendeeRoles;
                        if (emailArr.includes(userEmail))
                        {
                            userObj['inEvent'] = true;
        
                            var eventAttendeeRoles = (results[emailIndexes[userEmail]].eventAttendeeRoles).split("&&");
                            for (let j = 0; j < eventAttendeeRoles.length; j++)
                            {
                                var eventAttendeeRoleArr = eventAttendeeRoles[j].split("|");
                                eventAttendeeRoles[j] = { groupName: eventAttendeeRoleArr[0], groupID: parseInt(eventAttendeeRoleArr[1]) };
                            }
                            userObj['eventAttendeeRoles'] = eventAttendeeRoles;
                        }
                        else
                        {
                            userObj['inEvent'] = false;
                            userObj['eventAttendeeRoles'] = [];
                        }
        
                        eventAttendees[userEmail] = userObj;
                    }
        
                    con.release();
                    return res.send(eventAttendees);
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/get-attendee-info`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Attendee Info DB Connected");
    
        try
        {
            const { eventID, organizationID, email, inEvent } = req.body;
            const attendeeObj = validateAttendeeInfo(eventID, organizationID, email, inEvent);
            if (!attendeeObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid attendee info" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, attendeeObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid Authorization" });
            }
        
            if (!inEvent)
            {
                const sql = `SELECT email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, preferredAirport, "notIn" AS approved ` +
                    `FROM user ` +
                    `WHERE email = ?`;
                con.query(sql, [attendeeObj.email], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving members not in event" });
                    }
                    try
                    {
                        var decryptedBirthdate = await decryptField(results[0]['birthdate']);
                        console.log(decryptedBirthdate);
                        results[0]['birthdate'] = decryptedBirthdate;
                        console.log(results);
                        con.release();
                        return res.send(results);
                    }
                    catch (err)
                    {
                        console.log(err);
                        con.release();
                        return res.status(500).send({ err: "Error descrypting birhtdate" });
                    }
                });
            }
            else
            {
                const sql = `SELECT email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, preferredAirport, approved ` +
                    `FROM user JOIN event_user USING (userID) JOIN rolegroup USING (groupID) LEFT JOIN booking ON (event_user.eventID = booking.eventID AND event_user.userID = booking.userID) ` +
                    `WHERE email = ? AND event_user.eventID = ? AND adminRole = "false"`;
                con.query(sql, [attendeeObj.email, attendeeObj.eventID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving members in event" });
                    }
                    try
                    {
                        var decryptedBirthdate = await decryptField(results[0]['birthdate']);
                        console.log(decryptedBirthdate);
                        results[0]['birthdate'] = decryptedBirthdate;
                        console.log(results);
                        con.release();
                        return res.send(results);
                    }
                    catch (err)
                    {
                        console.log(err);
                        if (results && results.length != 0)
                        {
                            delete results[0]['birthdate'];
                            con.release();
                            return res.send(results);
                        }
                        else
                        {
                            con.release();
                            return res.status(500).send({ err: "Error descrypting birhtdate" });
                        }
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/add-event-user-association`,  async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Add Event User Assoc DB Connected");
    
        try
        {
            const { eventID, organizationID, users, groups } = req.body;
            const eventUserAssocObj = validateEventUserAssociation(eventID, organizationID, users, groups);
            if (!eventUserAssocObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, eventUserAssocObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({ err: "Invalid Authorization" });
            }
    
            var sql = `SELECT endDate ` +
                    `FROM event ` +
                    `WHERE eventID = ? AND endDate > CURDATE()`;
            return new Promise((resolve, reject) => {
                con.query(sql, [eventUserAssocObj.eventID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return resolve(res.status(500).send({ err: "Error associating user with event" }));
                    }
                    if (results.length === 0)
                    {
                        con.release();
                        return resolve(res.status(500).send({ err: "Cannot change an event in the past" }));
                    }
                    sql = `INSERT INTO event_user (userID, eventID, groupID) ` +
                    `SELECT userID, ?, ? ` +
                    `FROM user ` +
                    `WHERE email = ? ` +
                    `ON DUPLICATE KEY UPDATE event_user.userID = event_user.userID`;
        
                    for (let i = 0; i < eventUserAssocObj.users.length; i++)
                    {
                        for (let j = 0; j < groups.length; j++)
                        {
                            con.query(sql, [eventID, eventUserAssocObj.groups[j], eventUserAssocObj.users[i] ], function (err, result, fields) {
                                if (err)
                                {
                                    errCallback(err);
                                    con.release();
                                    return resolve(res.status(500).send({ err: "Error associating user with event" }));
                                }
                            });
                        }
                    }
                    con.release();
                    resolve(res.send({ msg: "Success" }));
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/remove-event-user-association`,  async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Remove Event User Assoc DB Connected");
    
        try
        {
            const { eventID, organizationID, users } = req.body;
            const removeEventUserAssocObj = validateRemoveEventUserAssociation(eventID, organizationID, users);
            if (!removeEventUserAssocObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, removeEventUserAssocObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({error: "Invalid Authorization"});
            }
    
            var sql = `SELECT endDate ` +
                    `FROM event ` +
                    `WHERE eventID = ? AND endDate > CURDATE()`;
            return new Promise((resolve, reject) => {
                con.query(sql, [removeEventUserAssocObj.eventID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return resolve(res.status(500).send({ err: "Error removing user from event" }));
                    }
                    if (results.length === 0)
                    {
                        con.release();
                        return resolve(res.status(500).send({ err: "Cannot change an event in the past" }));
                    }
                    sql = `DELETE eu FROM event_user eu ` +
                        `JOIN user USING (userID) ` +
                        `WHERE email = ? AND eventID = ?`;
                    for (let i = 0; i < removeEventUserAssocObj.usersToRemove.length; i++)
                    {
                        con.query(sql, [removeEventUserAssocObj.usersToRemove[i], removeEventUserAssocObj.eventID], function (err, result, fields) {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                return resolve(res.status(500).send({ err: "Error removing user from event" }));
                            }
                        });
                    }
                    con.release();
                    return res.send({msg: "Success"});
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/remove-event-user-group-association`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Remove Event User Group Assoc DB Connected");
    
        try
        {
            const { eventID, organizationID, userGroup } = req.body;
            const removeEventUserGroupAssocObj = validateRemoveEventUserGroupAssociation(eventID, organizationID, userGroup);
            if (!removeEventUserGroupAssocObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, removeEventUserGroupAssocObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({error: "Invalid Authorization"});
            }
        
            var sql = `SELECT endDate ` +
                    `FROM event ` +
                    `WHERE eventID = ? AND endDate > CURDATE()`;
            return new Promise((resolve, reject) => {
                con.query(sql, [removeEventUserGroupAssocObj.eventID], async (err, results ,fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return resolve(res.status(500).send({ err: "Error removing group association for a user for an event" }));
                    }
                    if (results.length === 0)
                    {
                        con.release();
                        return resolve(res.status(500).send({ err: "Error removing group association for a user for an event" }));
                    }
                    sql = `DELETE eu FROM event_user eu ` +
                        `JOIN user USING (userID) ` + 
                        `WHERE email = ? AND eventID = ? AND groupID = ?`;
                    for (let i = 0; i < removeEventUserGroupAssocObj.userGroup.length; i++)
                    {
                        con.query(sql, [removeEventUserGroupAssocObj.userGroup[i].user, removeEventUserGroupAssocObj.eventID, removeEventUserGroupAssocObj.userGroup[i].group], (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.release();
                                return resolve(res.status(500).send({ err: "Error removing group association for a user for an event" }));
                            }
                        });
                    }
                    con.release();
                    return resolve(res.send({msg: "Success"}));     
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/add-event-user-admin-association`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Add Event User Admin Assoc DB Connected");
    
        try
        {
            const { eventID, organizationID, eventUsers, financeUsers, approverUsers } = req.body;
            const eventUserAdminAssocObj = validateEventUserAdminAssociation(eventID, organizationID, eventUsers, financeUsers, approverUsers);
            if (!eventUserAdminAssocObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, eventUserAdminAssocObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({ err: "Invalid authorization" });
            }
        
            con.beginTransaction();
            const sql = `INSERT INTO event_user (userID, eventID, groupID) ` +
                        `SELECT userID, ?, groupID ` +
                        `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
                        `WHERE email = ? AND adminRole = ? ` +
                        `ON DUPLICATE KEY UPDATE event_user.userID = event_user.userID`;
            await (eventUserAdminAssocObj.eventUsers).forEach(user => {
                con.query(sql, [eventUserAdminAssocObj.eventID, user, "event"], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error adding event, event user admin association" });
                    }
                });
            });
        
            await eventUserAdminAssocObj.financeUsers.forEach(user => {
                con.query(sql, [eventUserAdminAssocObj.eventID, user, "finance"], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error adding finance, event user admin association" });
                    }
                });
            });
        
            await eventUserAdminAssocObj.approverUsers.forEach(user => {
                con.query(sql, [eventUserAdminAssocObj.eventID, user, "approver"], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error adding approver, event user admin association" });
                    }
                });
            });
            con.commit();
            con.release();
            return res.send({ msg: "Success" });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/remove-event-user-admin-association`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Remove Event User Admin Assoc DB Connected");
    
        try
        {
            const { eventID, organizationID, eventUsers, financeUsers, approverUsers } = req.body;
            const eventUserAdminAssocObj = validateEventUserAdminAssociation(eventID, organizationID, eventUsers, financeUsers, approverUsers);
            if (!eventUserAdminAssocObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await eventAuth(req.cookies.jwt, eventUserAdminAssocObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.send({ err: "Invalid authorization" });
            }
        
            con.beginTransaction();
            const sql = `DELETE eu FROM event_user eu ` +
                        `JOIN user USING (userID) JOIN rolegroup USING (groupID) ` + 
                        `WHERE email = ? AND eventID = ? AND adminRole = ?`;
            await eventUserAdminAssocObj.eventUsers.forEach(user => {
                con.query(sql, [user, eventUserAdminAssocObj.eventID, "event"], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error deleting event, event user association" });
                    }
                });
            });
        
            await eventUserAdminAssocObj.financeUsers.forEach(user => {
                console.log("About to remove ", user);
                con.query(sql, [user, eventUserAdminAssocObj.eventID, "finance"], (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error deleting finance, event user association" });
                    }
                });
            });
        
            await eventUserAdminAssocObj.approverUsers.forEach(user => {
                con.query(sql, [user, eventUserAdminAssocObj.eventID, "approver"], (err, results, fields) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error deleting approver, event user association" });
                    }
                });
            });
            con.commit();
            con.release();
            return res.send({ msg: "Success" });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/get-organization-users`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Org Users DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userID = await execAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.redirect(307, "/signIn?prev=userManagement");
            }
            const sql = `SELECT userID, firstName, lastName, email, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(groupID SEPARATOR '&&') AS "groupsInID" ` +
                        `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) ` +
                        `WHERE organizationID = ? ` +
                        `GROUP BY userID`;
            con.query(sql, organizationID, (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving organization members and groups" });
                }
                con.release();
                return res.send(results);
            })
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({err: "Server error"});
        } 
    });
});

app.get(`/get-organization-users-not-in-event`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Org Users Not in Event DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const eventID = validateID(req.query.eventID);
            if (!organizationID || !eventID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
        
            const userID = await eventAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization" });
            }
    
            const sql = `SELECT userID, firstName, lastName, email, group_concat(groupName SEPARATOR '&&') AS "groupsIn", group_concat(adminRole SEPARATOR '&&') AS "groupsInAdmin", group_concat(groupID SEPARATOR '&&') AS "groupsInID" ` +
                    `FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) JOIN event_user USING (userID) ` +
                    `WHERE organizationID = ? AND eventID <> ? ` +
                    `GROUP BY userID`;
            con.query(sql, [organizationID, eventID], (err, result, fields) => {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving users not in event" });
                }
                con.release();
                return res.send(result);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        }  
    });   
});

app.get(`/get-organization-groups`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Org Groups DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userID = await execAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Invalid authorization"});
            }
            const sql = `SELECT groupID, groupName, adminRole, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, flightTierName, COUNT(userID) AS "numMembers"`+
                        `FROM rolegroup JOIN flightTier Using (flightTierID) LEFT JOIN user_group USING (groupID) ` +
                        `WHERE organizationID = ? ` +
                        `GROUP BY (groupID) ` +
                        `ORDER BY groupID ASC`;
            con.query(sql, organizationID, (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving organization groups" });
                }
                con.release();
                return res.send(results);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/count-organization-events`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Count Org Events DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            if (!organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid organization ID" });
            }
    
            const userID = await anyAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Invalid authorization"}); 
            }
    
            const sql = `SELECT COUNT(eventID) AS "numEvents" ` +
                        `FROM event WHERE organizationID = ?`;
            con.query(sql, [organizationID], (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error counting organization events" });
                }
                con.release();
                return res.send(results);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({err: "Server error"});
        } 
    });
});

app.post(`/invite-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Invite User DB Connected");
    
        try
        {
            const email = req.body.email;
            const organizationID = req.body.organizationID;
            const organizationName = req.body.organizationName;
            const roles = req.body.roles;
    
            const inviteUserObj = validateInviteUser(email, organizationID, organizationName, roles);
            if (!inviteUserObj || (req.body.eventID && !validateID(req.body.eventID)))
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
        
            const userID = await eventAuth(req.cookies.jwt, inviteUserObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization" });
            }
        
            con.beginTransaction();
            const sql = `SELECT userID, firstName, lastName, email ` +
                        `FROM user ` +
                        `WHERE email = ?`;
            con.query(sql, [inviteUserObj.email], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error retrieving information about a user" });
                }
    
                // If user exists at all
                if (results.length != 0)
                {
                    const orgUserID = results[0].userID;
                    // If User Already Exists in Org
                    const inOrgSQL = `SELECT userID, organizationID FROM user_group JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?`;
                    con.query(inOrgSQL, [orgUserID, inviteUserObj.organizationID], async (err, results, fields) => {
                        if (results.length != 0)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(400).send({ err: "User already in organization" });
                        }
                        else
                        {
                            const sqlRole = `INSERT INTO user_group (userID, groupID) VALUES (?, ?)`;
                            await inviteUserObj.roles.forEach(groupID => {
                                con.query(sqlRole, [orgUserID, groupID], (err, results, fields) => {
                                    if (err)
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error associating user with group" });
                                    }
                                });
                            });
        
                            if (req.body.eventID)
                            {
                                const eventID = validateID(req.body.eventID);
                                const sqlEventRole = `INSERT INTO event_user (userID, eventID, groupID) VALUES (?, ?, ?)`;
                                await inviteUserObj.roles.forEach(groupID => {
                                    con.query(sqlEventRole, [orgUserID, eventID, groupID], (err, results, fields) => {
                                        if (err) 
                                        {
                                            errCallback(err);
                                            con.rollback(function () {
                                                con.release();
                                            });
                                            return res.status(500).send({ err: "Error associating user with event" });
                                        }
                                    });
                                });
                                await sendOrganizationInvite(inviteUserObj.email, inviteUserObj.organizationName); //POSTMAN
                                con.commit();
                                con.release();
                                return res.send({msg: "User Successfully Invited to Event"});
                            }
                            else
                            {
                                await sendOrganizationInvite(inviteUserObj.email, inviteUserObj.organizationName); //POSTMAN
                                con.commit();
                                con.release();
                                return res.send({msg: "User Successfully Invited to Organization"});
                            }
                        }
                    });
                }
                else
                {
                    const randomPass = generate({
                        length: 15,
                        numbers: true,
                        symbols: true,
                        strict: true
                    });   
                    const createUserSQL = `INSERT INTO user (email) ` + 
                                        `VALUES (?)`;
                    con.query(createUserSQL, [inviteUserObj.email], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error creating temporary user" });
                        }
                        const newUserID = results.insertId;
                        const sqlCred = `INSERT INTO cred (userID, pass, isTemp) ` +
                                        `VALUES (?, ?, "T")`;
                        con.query(sqlCred, [newUserID, randomPass], async (err, results, fields) => {
                            if (err) 
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error adding temporary password to user" });
                            }
    
                            const sqlRole = `INSERT INTO user_group (userID, groupID) VALUES (?, ?)`;
                            await inviteUserObj.roles.forEach(groupID => {
                                con.query(sqlRole, [newUserID, groupID], (err, results, fields) => {
                                    if (err) 
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error associating user with group" });
                                    }
                                    console.log("Inserted new user into group - " + groupID);
                                });
                            });
            
                            if (req.body.eventID)
                            {
                                const eventID = validateID(req.body.eventID);
                                const sqlEventRole = `INSERT INTO event_user (userID, eventID, groupID) VALUES (?, ?, ?)`;
                                await inviteUserObj.roles.forEach(groupID => {
                                    con.query(sqlEventRole, [newUserID, eventID, groupID], (err, results, fields) => {
                                        if (err) 
                                        {
                                            errCallback(err);
                                            con.rollback(function () {
                                                con.release();
                                            });
                                            return res.status(500).send({ err: "Error associating user with event" });
                                        }
                                    });
                                });
                                await sendNewUserOrganizationInvite(inviteUserObj.email, inviteUserObj.organizationName, randomPass);
                                con.commit();
                                con.release();
                                return res.send({msg: "User Successfully Invited to Event"});
                            }
                            else
                            {
                                await sendNewUserOrganizationInvite(inviteUserObj.email, inviteUserObj.organizationName, randomPass);
                                con.commit();
                                con.release();
                                return res.send({msg: "User Successfully Invited to Organization"});
                            }
                        });
                    });
                }
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.post(`/edit-user`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Edit User DB Connected");
    
        try
        {
            const { email, organizationID, organizationName, roles, removeRoles } = req.body;
            const editUserObj = validateEditUser(email, organizationID, organizationName, roles, removeRoles);
            if (!editUserObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const userID = await execAuth(req.cookies.jwt, editUserObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(401).send({ err: "Invalid token" });
            }
    
            con.beginTransaction();
            // Get email of the user
            const emailSQL = `SELECT userID FROM user WHERE email = ?`;
            con.query(emailSQL, [editUserObj.email], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error retrieving user" });
                }
                const thisUserID = results[0].userID;
    
                // Add necessary roles
                const addSQL = `INSERT INTO user_group (userID, groupID) ` +
                        `SELECT ?, ?`;
                await editUserObj.roles.forEach(groupID => {
                    con.query(addSQL, [thisUserID, groupID], async (err, results) => {
                        if (err) 
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error associating user and group" });
                        }
                    });
                });
    
                // Remove necessary roles
                const deleteSQL = `DELETE ug FROM user_group ug ` +
                    `JOIN user USING (userID) ` +
                    `WHERE email = ? AND groupID = ?`;
                await editUserObj.removeRoles.forEach(groupID => {
                    con.query(deleteSQL, [editUserObj.email, groupID], async (err, results) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error removing user assoication from group" });
                        }
                    }); 
                });
            });
    
            con.commit();
            con.release();
            return res.send({ msg: "Successful group updates" });
        }
        catch (error)
        {
            console.log(error);
            con.release();
            return res.send({ err: "Server error." });
        } 
    });
});

app.get(`/create-organization-group`, async (req, res) => {
    const organizationID = req.query.organizationID;
    const flightTierID = req.query.flightTierID;
    const checkedBags = req.query.checkedBags;
    const firstThreshold = req.query.firstThreshold;
    const secondThreshold = req.query.secondThreshold;
    const defaultDateTimeBuffer = req.query.defaultDateTimeBuffer;
    const defaultMaxLayovers = req.query.defaultMaxLayovers;
    const name = req.query.name;

    const groupInfoObj = validateGroupInfo(organizationID, flightTierID, checkedBags, firstThreshold, secondThreshold, defaultDateTimeBuffer, defaultMaxLayovers, name);
    if (!groupInfoObj)
    {
        return res.status(422).send({ err: "Invalid group values" });
    }

    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Create Org Group DB Connected");
    
        try
        {
            const userID = await execAuth(req.cookies.jwt, groupInfoObj.organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization" });
            }
    
            const sql = `INSERT INTO rolegroup (groupName, checkedBags, defaultFirstThreshold, defaultSecondThreshold, defaultMaxLayovers, defaultDateTimeBuffer, flightTierID, organizationID) ` +
            `VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
            con.query(sql, [groupInfoObj.name, groupInfoObj.checkedBags, groupInfoObj.firstThreshold, groupInfoObj.secondThreshold, groupInfoObj.defaultMaxLayovers, groupInfoObj.defaultDateTimeBuffer, groupInfoObj.flightTierID, groupInfoObj.organizationID], (err, result, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error creating group" });
                }
                con.release();
                return res.send(result);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/update-organization-group`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Update Org Group DB Connected");
    
        try
        {
            const organizationID = req.query.organizationID;
            const groupID = req.query.groupID;
            const flightTierID = req.query.flightTierID;
            const checkedBags = req.query.checkedBags;
            const firstThreshold = req.query.firstThreshold;
            const secondThreshold = req.query.secondThreshold;
            const defaultDateTimeBuffer = req.query.defaultDateTimeBuffer;
            const defaultMaxLayovers = req.query.defaultMaxLayovers;
            const name = req.query.name;

            const groupInfoObj = validateGroupModifyInfo(organizationID, groupID, flightTierID, checkedBags, firstThreshold, secondThreshold, defaultDateTimeBuffer, defaultMaxLayovers, name);
            if (!groupInfoObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid group values" });
            }
    
            const userID = await execAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid authorization" });
            }
    
            const sql = `UPDATE rolegroup ` +
                        `SET groupName = ?, checkedBags = ?, defaultFirstThreshold = ?, defaultSecondThreshold = ?, defaultMaxLayovers = ?, defaultDateTimeBuffer = ?, flightTierID = ? ` +
                        `WHERE groupID = ?`;
    
            con.query(sql, [groupInfoObj.name, groupInfoObj.checkedBags, groupInfoObj.firstThreshold, groupInfoObj.secondThreshold, groupInfoObj.defaultMaxLayovers, groupInfoObj.defaultDateTimeBuffer, groupInfoObj.flightTierID, groupInfoObj.groupID], function (err, result, fields) {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error updating group" });
                }
                con.release();
                return res.send(result);
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/remove-user-organization-association`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Remove User Org Assoc DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const removeUserID = validateID(req.query.userID);
            if (!organizationID || !removeUserID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
    
            const userID = await execAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid authorization" });
            }
    
            con.beginTransaction();
            const sql = `SELECT userID, eventID ` +
                        `FROM event_user JOIN event USING (eventID) ` +
                        `WHERE userID = ? AND organizationID = ?`;
            con.query(sql, [removeUserID, organizationID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error retrieving user" });
                }
    
                if (results.length > 0)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "You cannot remove a user that is a part of any events" });
                }
    
                const sql = `DELETE user_group FROM user_group JOIN rolegroup USING (groupID) ` +
                            `WHERE userID = ? AND organizationID = ?`;
                con.query(sql, [removeUserID, organizationID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error removing user" });
                    }
                    con.commit();
                    con.release();
                    return res.send({ msg: "User successfully deleted" });
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/delete-organization-group`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Delete Org Group DB Connected");
    
        try
        {
            const organizationID = validateID(req.query.organizationID);
            const groupID = validateID(req.query.groupID);
            if (!organizationID || !groupID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
    
            const userID = await execAuth(req.cookies.jwt, organizationID, con);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid authorization" });
            }
    
            con.beginTransaction();
            const sql = `SELECT adminRole ` +
            `FROM rolegroup WHERE groupID = ?`;
            con.query(sql, [groupID], function (err, result, fields) {
                if (err)
                {
                    errCallback(err);
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "Error retrieving group" });
                }
    
                if (result[0].adminRole != "false")
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(500).send({ err: "You cannot delete an admin group." });
                }
                else
                {
                    const sql = `DELETE FROM rolegroup WHERE groupID = ?`;
                
                    con.query(sql, [groupID], function (err, result, fields) {
                        if (err) 
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "You cannot delete a group with members." });
                        }
                        con.release();
                        return res.send({ msg: "Group successfully deleted" });
                    });
                }
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

// Authenticate Methods

// General Use
async function generalAuth (token)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        var userID = decoded.userID;

        return userID;
    }
    catch (err)
    {
        console.log(err);
        return 0;
    }
}

async function eventAuth (token, organizationID, con)
{
    const secret = SECRET_KEY;
    try
    {
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "event" || results[i].adminRole == "execEvent" || results[i].adminRole == "admin")
                    {
                        console.log("Event Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function eventOnlyAuth (token, organizationID, con)
{
    const secret = SECRET_KEY;
    try
    {
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "event" || results[i].adminRole == "execEvent")
                    {
                        console.log("Event Authorized - " + userID);
                        resolve({ userID: userID, adminRole: results[i].adminRole });
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function specificEventEventAuth (token, eventID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, eventID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) JOIN event_user USING (userID) WHERE userID = ? AND eventID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "event" || results[i].adminRole == "execEvent" || results[i].adminRole == "admin")
                    {
                        console.log("Specific Event Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function specificFinanceEventAuth (token, eventID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, eventID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) JOIN event_user USING (userID) WHERE userID = ? AND eventID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "finance" || results[i].adminRole == "admin")
                    {
                        console.log("Specific Event Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function specificApproverEventAuth (token, eventID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, eventID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) JOIN event_user USING (userID) WHERE userID = ? AND eventID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "approver" || results[i].adminRole == "execApprover" || results[i].adminRole == "admin")
                    {
                        console.log("Specific Event Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function financeAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "finance" || results[i].adminRole == "admin")
                    {
                        console.log("Finance Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function execAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "execEvent" || results[i].adminRole == "admin")
                    {
                        console.log("Exec Authorized - " + userID);
                        resolve(userID);
                    }
                }

                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function execApproverAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
                console.log(results);
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "execApprover" || results[i].adminRole == "admin")
                    {
                        console.log("Exec Authorized - " + userID);
                        resolve(userID);
                    }
                }

                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function execApproverOnlyAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "execApprover")
                    {
                        console.log("Exec Authorized - " + userID);
                        resolve(userID);
                    }
                }

                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function adminAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "admin")
                    {
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function eventManagementAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "admin" || results[i].adminRole == "execEvent" || results[i].adminRole == "event" || results[i].adminRole == "finance")
                    {
                        console.log("Event Management Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function approverAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0); //going to need to add error checking
    
                for (let i = 0; i < results.length; i++)
                {
                    if (results[i].adminRole == "approver" || results[i].adminRole == "admin")
                    {
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function anyAuth (token, organizationID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const acceptableRoles = ["admin", "execEvent", "event", "finance", "execApprover", "approver"];

        const sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, organizationID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
    
                if (results.length === 0) resolve(0);
    
                for (let i = 0; i < results.length; i++)
                {
                    if (acceptableRoles.includes(results[i].adminRole))
                    {
                        console.log("Any Authorized - " + userID);
                        resolve(userID);
                    }
                }
                resolve(0);
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

async function inEventAuth (token, eventID, con)
{
    try
    {
        const secret = SECRET_KEY;
        const decoded = jwt.verify(token, secret);
        const userID = decoded.userID;

        const sql = `SELECT userID, eventID, groupID FROM event_user JOIN rolegroup USING (groupID) WHERE userID = ? AND eventID = ? AND adminRole = "false"`;
        return new Promise ((resolve, reject) => {
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    resolve(0);
                }
                if (results.length === 0)
                {
                    resolve(0);
                }
                else
                {
                    resolve(userID);
                }
            });
        });
    }
    catch (err)
    {
        console.log(err);
        return new Promise ((resolve, reject) => { resolve(0) });
    }
}

/** Generates user dashboard */
app.post(`/get-event-dashboard`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Event Dashboard DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.send({ err: "Invalid authorization" });
            }
            const sql = `SELECT DISTINCT event_user.eventID, eventName, eventLocation, startDate, endDate, approved, organizationName, adminRole, "Flight" AS type ` +
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN rolegroup USING (groupID) JOIN organization ON (event.organizationID = organization.organizationID) LEFT JOIN booking ON user.userID = booking.userID AND event_user.eventID = booking.eventID ` +
                    `WHERE user.userID = ? AND startDate > CURDATE() AND (approved <> 'denied' OR approved IS NULL) AND adminRole = "false"`;
            con.query(sql, [userID], async function (err, results, fields) {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving events" });
                }
                const hotelSQL = `SELECT DISTINCT event_user.eventID, eventName, eventLocation, startDate, endDate, approved, organizationName, adminRole, "Hotel" AS type ` +
                                `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN rolegroup USING (groupID) JOIN organization ON (event.organizationID = organization.organizationID) LEFT JOIN hotelBooking ON user.userID = hotelBooking.userID AND event_user.eventID = hotelBooking.eventID ` +
                                `WHERE user.userID = ? AND startDate > CURDATE() AND (approved <> 'denied' OR approved IS NULL) AND adminRole = "false" AND allowHotels = "true"`;
                con.query(hotelSQL, [userID], async function (err, secResults, fields) {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving events" });
                    }
                    Array.prototype.push.apply(results, secResults);
                    con.release();
                    return res.send(results);
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/* Gets user bookings */
app.get(`/get-all-user-bookings`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({ err : "Not Authenticated" });
            }
        
            const sql = `SELECT * FROM booking JOIN event USING (eventID) WHERE userID = ? ORDER BY bookingID DESC`;
            con.query(sql, userID, async function (err, results, fields) {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Server error" });
                }
                const hotelSQL = `SELECT * FROM hotelBooking JOIN event USING (eventID) WHERE userID = ? ORDER BY hotelBookingID DESC`;
                con.query(hotelSQL, userID, async function (err, secResults, fields) {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Server error" });
                    }
                    Array.prototype.push.apply(results, secResults);
                    con.release();
                    return res.status(200).send(results);
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/* Gets event attended */
app.get(`/get-current-user-events`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Current User Events DB Connected");
    
        try
        {
            const  userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Not Authenticated"});
            }
        
            var alreadyBookedEvents = "";
            var sql = "SELECT eventID, bookingID, approved " +
                    "FROM booking " +
                    "WHERE userID = ? AND approved <> 'denied'";
            con.query(sql, userID, async function (err, results, fields) {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving bookings" });
                }
        
                for (let i = 0; i < results.length; i++)
                {
                    alreadyBookedEvents += results[i].eventID + ",";
                }
                if (alreadyBookedEvents.length > 0)
                {
                    alreadyBookedEvents = alreadyBookedEvents.substring(0, alreadyBookedEvents.length - 1);
        
                    sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, event.organizationID, organizationName, maxFlightTier, GROUP_CONCAT(airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, MAX(rolegroup.checkedBags) AS groupCheckedBags, MAX(defaultFirstThreshold) AS groupFirstThreshold, MAX(defaultSecondThreshold) AS groupSecondThreshold, MAX(defaultMaxLayovers) AS groupMaxLayovers, MAX(defaultDateTimeBuffer) AS groupDateTimeBuffer, MAX(flightTierID) AS groupFlightTierID ` + 
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) LEFT JOIN event_airport USING (eventID) JOIN organization USING (organizationID) JOIN rolegroup USING (groupID) ` +
                    `WHERE userID = ? AND eventID NOT IN (${alreadyBookedEvents}) AND startDate > CURDATE() ` +
                    `GROUP BY eventID`;
        
                    con.query(sql, [userID, "false"], async function (err, results, fields) {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving events for user with ones already booked" });
                        }
                        con.release();
                        return res.send(results);
                    });
                }
                else
                {
                    console.log("No Booked Events");
                    // Fix the NULL check!
                    sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, event.organizationID, organizationName, maxFlightTier, GROUP_CONCAT(airportCode, "|", primaryAirport SEPARATOR "&&") AS eventAirports, MAX(rolegroup.checkedBags) AS groupCheckedBags, MAX(defaultFirstThreshold) AS groupFirstThreshold, MAX(defaultSecondThreshold) AS groupSecondThreshold, MAX(defaultMaxLayovers) AS groupMaxLayovers, MAX(defaultDateTimeBuffer) AS groupDateTimeBuffer, MAX(flightTierID) AS groupFlightTierID ` + 
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) LEFT JOIN event_airport USING (eventID) JOIN organization USING (organizationID) JOIN rolegroup USING (groupID) ` +
                    `WHERE userID = ? AND startDate > CURDATE() ` +
                    `GROUP BY eventID`;
        
                    con.query(sql, [userID], function (err, results, fields) {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving events for user without ones already booked" });
                        }
                        con.release();
                        return res.send(results);
                    });
                }
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/* Gets event attended */
app.get(`/get-current-hotel-user-events`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Get Current Hotel user Events DB Connected");
    
        try
        {
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.status(401).send({err: "Not Authenticated"});
            }
        
            var alreadyBookedEvents = "";
            var sql = "SELECT eventID, hotelbookingID, approved " +
                    "FROM hotelBooking " +
                    "WHERE userID = ? AND approved <> 'denied'";
            con.query(sql, userID, async function (err, results, fields) {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving bookings" });
                }
        
                for (let i = 0; i < results.length; i++)
                {
                    alreadyBookedEvents += results[i].eventID + ",";
                }
                if (alreadyBookedEvents.length > 0)
                {
                    alreadyBookedEvents = alreadyBookedEvents.substring(0, alreadyBookedEvents.length - 1);
        
                    sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, organizationName, GROUP_CONCAT(DISTINCT cityCode SEPARATOR "&&") AS cityCode ` + 
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN organization USING (organizationID) LEFT JOIN event_city USING (eventID) ` +
                    `WHERE userID = ? AND eventID NOT IN (${alreadyBookedEvents}) AND startDate > CURDATE() AND allowHotels = "true" ` +
                    `GROUP BY eventID`;
        
                    con.query(sql, [userID, "false"], async function (err, results, fields) {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving events for user with ones already booked" });
                        }
                        con.release();
                        return res.send(results);
                    });
                }
                else
                {
                    console.log("No Booked Events");
                    // Fix the NULL check!
                    sql = `SELECT userID, eventID, eventName, startDate, endDate, eventLocation, event.checkedBags, organizationName, GROUP_CONCAT(DISTINCT cityCode SEPARATOR "&&") AS cityCode ` + 
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN organization USING (organizationID) LEFT JOIN event_city USING (eventID) ` +
                    `WHERE userID = ? AND startDate > CURDATE() AND allowHotels = "true" ` +
                    `GROUP BY eventID`;
        
                    con.query(sql, [userID], function (err, results, fields) {
                        if (err)
                        {
                            errCallback(err);
                            con.release();
                            return res.status(500).send({ err: "Error retrieving events for user without ones already booked" });
                        }
                        con.release();
                        return res.send(results);
                    });
                }
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

// Duffel API
const duffel = new Duffel({
  token: "duffel_test_PHc32q2ypel-f75QJwwupRXsq6SM1AXMjBmqX9TL7TW",
});

app.get(`/duffel-search`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Duffel Search DB Connected");
    
        try
        {    
            const userID = await generalAuth(req.cookies.jwt);
            if (!userID)
            {
                con.release();
                return res.redirect(307, "/signIn?prev=flightSearch");
            }
    
            const originCode = req.query.originCode;
            const destinationCode = req.query.destinationCode;
            const dateOfDeparture = req.query.dateOfDeparture;
            const dateOfReturn = req.query.dateOfReturn;
            const flightTierID = req.query.flightClass;
            const maxConnections = req.query.maxConnections;
    
            const flightSearchObj = validateFlightSearch(originCode, destinationCode, dateOfDeparture, dateOfReturn, flightTierID, maxConnections);
            if (!flightSearchObj)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const flightTierRankings = { 1: "economy", 2: "premium_economy", 3: "business", 4: "first" };
            const travelClass = flightTierRankings[flightSearchObj.flightTierID];
            
        
            const userSQL = `SELECT email, firstName, lastName, phoneNumber, birthdate, gender, title FROM user WHERE userID = ?`;
            con.query(userSQL, [userID], async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving user information" });
                }
    
                if (results.length === 0) 
                {
                    con.release();
                    return res.redirect(307, "/signIn?prev=flightSearch");
                }
                
                const user = results[0];
                user['birthdate'] = await decryptField(user['birthdate']);
    
                async function search () 
                {
                    try
                    {
                        console.log("Phone Number from DB", "+" + user.phoneNumber);
                        var duffelRes = await duffel.offerRequests.create({
                            // return_offers: false,
                            slices : [
                            {
                                origin: flightSearchObj.originCode,
                                destination: flightSearchObj.destinationCode,
                                departure_date: flightSearchObj.dateOfDeparture
                            },
                            {
                                origin: flightSearchObj.destinationCode,
                                destination: flightSearchObj.originCode,
                                departure_date: flightSearchObj.dateOfReturn
                            }
                            ],
                            passengers: [
                                {
                                    phone_number: "+" + user.phoneNumber,
                                    email: user.email,
                                    born_on: user.birthdate,
                                    title: user.title,
                                    gender: (user.gender).toLowerCase(),
                                    family_name: user.lastName,
                                    given_name: user.firstName,
                                    type: "adult"
                                }
                            ], // Add { age: 1 } if under 18 or another { type: "adult" } for more
                            cabin_class: travelClass,
                            max_connections: flightSearchObj.maxConnections
                        });
        
                        console.log(duffelRes);
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
                    
                        con.release();
                        return res.send({ offers: holdData, client_key: duffelRes.data.client_key });
                        // {
                        //     requires_instant_payment: false,
                        //     price_guarantee_expires_at: '2025-02-18T21:29:19Z',
                        //     payment_required_by: '2025-02-19T21:29:19Z'
                        // }
                    }
                    catch (err)
                    {
                        console.log(err);
                        con.release();
                        return res.status(500).send({ err: err });
                    }
                }
    
                search();
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/duffel-create-offer`, async (req, res) => {
    try
    {
        const OFFER_ID = req.query.id;

        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        async function test ()
        {
            try
            {
                var offer = await duffel.offers.get(OFFER_ID);
                console.log("Offer ID - " + offer.data.id);
                console.log("First Passenger ID - " + offer.data.passengers[0].id);
        
                return res.send(offer);
            }
            catch (err)
            {
                console.log(err);
                return res.status(500).send({ err: "Server error" });
            }
        } 
    
        test();
    }
    catch (err)
    {
        console.log(err);
        return res.status(500).send({ err: "Server error" });
    }
});

// app.get(`/duffel-get-seat-map`, async (req, res) => {
//     try
//     {
//         var seatMap = await duffel.seatMaps.get({
//             offer_id: `${OFFER_ID}`
//         });
//         return res.send(seatMap);
//     }
//     catch (err)
//     {
//         console.log(err);
//         return res.status(500).send({ err: "Server error" });
//     }
// });

app.post(`/duffel-seat-create-order`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            errCallback(err);
        }
        console.log("Duffel Seat Create Order DB Connected");
    
        try
        {
            const offer = req.body.offer;
            const eventID = validateID(req.body.eventID);
            const eventName = validateEventName(req.body.eventName);
            const tierID = validateFlightTierID(req.body.flightTierID);
            if (!eventID || !eventName || !tierID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            console.log(req.body);
            
            const userID = await inEventAuth(req.cookies.jwt, eventID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid Authorization" });
            }
    
            var sql = `SELECT eventID, userID, email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title, eventName, eventLocation, startDate, endDate, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, event.organizationID, maxFlightTier, GROUP_CONCAT(airportCode SEPARATOR "&&") AS eventAirports, MAX(rolegroup.checkedBags) AS groupCheckedBags, MAX(defaultFirstThreshold) AS groupFirstThreshold, MAX(defaultSecondThreshold) AS groupSecondThreshold, MAX(defaultMaxLayovers) AS groupMaxLayovers, MAX(defaultDateTimeBuffer) AS groupDateTimeBuffer, MAX(flightTierID) AS groupFlightTierID ` +
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) LEFT JOIN event_airport USING (eventID) JOIN rolegroup USING (groupID) ` +
                    `WHERE userID = ? AND eventID = ? ` +
                    `GROUP BY eventID`;
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving event association" });
                }
    
                if (results.length === 0) 
                {
                    con.release();
                    return res.status(400).send({ err: "User not found" }); //going to need to add error checking
                }

                const user = results[0];
                user['birthdate'] = await decryptField(user['birthdate']);
                async function intCreateOrder ()
                {
                    try
                    {
                        
                        var order = await duffel.orders.create(offer);
                        console.log(order);
                        console.log("Order ID - " + order.data.id);
    
                        // Check for warnings
                        var bookingWarningArray = [];
                        var overSecondThreshold = false;
                        // Event Info
                        var startDateStr = user.startDate.toISOString();
                        startDateStr = startDateStr.substring(0, startDateStr.indexOf("T")) + "T00:00:00.000Z";
                        console.log("Start Date Str", startDateStr);
                        const startDate = new Date (startDateStr);
                        var endDateStr = user.endDate.toISOString() + "";
                        endDateStr = endDateStr.substring(0, endDateStr.indexOf("T")) + "T00:00:00.000Z";
                        const endDate = new Date (endDateStr);
                        const checkedBags = user.checkedBags > user.groupCheckedBags ? user.checkedBags : user.groupCheckedBags;
                        const layoverMax = user.layoverMax > user.groupMaxLayovers ? user.layoverMax : user.groupMaxLayovers;
                        const dateTimeBuffer = user.dateTimeBuffer > user.groupDateTimeBuffer ? user.dateTimeBuffer : user.groupDateTimeBuffer;
                        const firstThreshold = parseFloat(user.firstThreshold) * (parseFloat(user.groupFirstThreshold) / 100 + 1);
                        const secondThreshold = parseFloat(user.secondThreshold) * (parseFloat(user.secondThreshold) / 100 * 1);
                        const maxFlightTier = user.maxFlightTier > user.groupFlightTierID ? user.maxFlightTier : user.groupFlightTierID;
                        const eventAirports = user.eventAirports == null ? "" : user.eventAirports.split("&&");
    
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
                        // const arrivalDiff = differenceInHours(flightDepDate, startDate);
                        const arrivalDiff = differenceInCalendarDays(flightDepDate, startDate);
                        console.log("Arrival Diff", arrivalDiff);
                        // const earlyArrival = ((flightDepDate - startDate) / (1000 * 60 * 60 * 24)) + dateTimeBuffer;
                        console.log("Flight Dep Date - " + flightDepDate);
                        console.log("User Start Date", user.startDate);
                        console.log("Start Date", startDate);
                        if (arrivalDiff > 0)
                        {
                            bookingWarningArray.push("lateArrival");
                        }
                        else if (arrivalDiff < (dateTimeBuffer * -1))
                        {
                            bookingWarningArray.push("earlyArrival");
                        }
                        const departureDiff = differenceInCalendarDays(flightRetDate, endDate);
                        console.log("Flight Ret Date", flightRetDate);
                        console.log("User End Date", user.endDate);
                        console.log("End Date", endDate);
                        console.log("Departure Diff", departureDiff);
                        // const lateDeparture = ((flightRetDate - endDate) / (1000 * 60 * 60 * 24)) - dateTimeBuffer;
                        if (departureDiff > dateTimeBuffer)
                        {
                            bookingWarningArray.push("lateDeparture");
                        }
                        else if (departureDiff < 0)
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
    
                        // Event Airports
                        var allowedAirport = false;
                        for (let i = 0; i < eventAirports.length; i++)
                        {
                            if (eventAirports[i].indexOf(order.data.slices[0].destination.iata_code) != -1)
                            {
                                allowedAirport = true;
                            }
                        }
                        if (eventAirports.length === 0)
                        {
                            allowedAirport = true;
                        }
                        if (!allowedAirport)
                        {
                            bookingWarningArray.push("outsideAirport");
                        }
    
                        var notificationMessage = "";
    
                        // Set Approval Status
                        var approvalStatus = "";
                        console.log("Booking Warning Array Below:");
                        console.log(bookingWarningArray);
                        if (bookingWarningArray.length === 0)
                        {
                            approvalStatus = "approved";
                            notificationMessage = "Your flight has been booked! Visit your <a href='/userProfileHistory'>history</a> page to view your flight!";
                        }
                        else if (overSecondThreshold)
                        {
                            approvalStatus = "escalation";
                            notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                        }
                        else
                        {
                            approvalStatus = "pending";
                            notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                        }
    
                        con.beginTransaction();
                        var sql = "INSERT INTO booking (cost, userID, eventID, approved, json) " +
                                    "VALUES (?, ?, ?, ?, ?)";
                        var vals = [parseFloat(order.data.total_amount), userID, eventID, approvalStatus, JSON.stringify(order)];
                        con.query(sql, vals, async (err, results, fields) => {
                            if (err) 
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error adding booking" });
                            }
                            var lastInsertID = results.insertId;
    
                            // Populate Warnings
                            var warnSQL = "INSERT INTO booking_warning VALUES (?, ?)";
                            await bookingWarningArray.forEach(bookWarn => {
                                con.query(warnSQL, [lastInsertID, bookWarn], async function (err, results, fields) {
                                    if (err)
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error adding booking warnings" });
                                    }
                                });
                            }); 
    
                            if (approvalStatus == "approved")
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
                                    if (err) 
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error updating flight booking" });
                                    }    
                                });
                                await sendFightConfirmEmail(user.email, eventName, user.title, user.lastName);
                            }
                            else
                            {
                                await sendPendingEmail(user.email, eventName, user.title, user.lastName);
                            }
                            con.commit();    
                            con.release();
                            return res.send({ order: order, notif: notificationMessage });
                        });
                    }
                    catch (err)
                    {
                        console.log(err);
                        con.release();
                        return res.send({ err: "Server error" });
                    }
                } 
    
                intCreateOrder();
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/duffel-create-order`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("MFA Send Email DB Connected");
    
        try
        {
            const OFFER_ID = req.query.id;
            const PASSENGER_ID = req.query.passID;
            const eventID = validateID(req.query.eventID);
            const tierID = validateFlightTierID(req.query.tierID);
            const eventName = validateEventName(req.query.eventName);
            if (!eventID || !eventName || !tierID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
        
            const userID = await inEventAuth(req.cookies.jwt, eventID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid Authorization" });
            }
    
            // LOOK AT ADDING A TRANSACTION IF THERE IS TIME AND IF THAT WOULD WORK OR BE BENEFICIAL
            // Add verification that user can actually book the flight
            var sql = `SELECT eventID, userID, email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title, eventName, eventLocation, startDate, endDate, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, event.organizationID, maxFlightTier, GROUP_CONCAT(airportCode SEPARATOR "&&") AS eventAirports, MAX(rolegroup.checkedBags) AS groupCheckedBags, MAX(defaultFirstThreshold) AS groupFirstThreshold, MAX(defaultSecondThreshold) AS groupSecondThreshold, MAX(defaultMaxLayovers) AS groupMaxLayovers, MAX(defaultDateTimeBuffer) AS groupDateTimeBuffer, MAX(flightTierID) AS groupFlightTierID ` +
                    `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) LEFT JOIN event_airport USING (eventID) JOIN rolegroup USING (groupID) ` +
                    `WHERE userID = ? AND eventID = ? ` +
                    `GROUP BY eventID`;
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retrieving event association" });
                }
    
                if (results.length === 0)
                {
                    con.release();
                    return res.status(400).send({ err: "User not found" }); //going to need to add error checking
                } 
    
                const user = results[0];
                user['birthdate'] = await decryptField(user['birthdate']);
                async function intCreateOrder ()
                {
                    try
                    {
                        var order = await duffel.orders.create({ 
                            type: "hold",
                            selected_offers: [OFFER_ID],
                            passengers: [
                            {
                                phone_number: "+" + user.phoneNumber,
                                email: user.email,
                                born_on: user.birthdate,
                                title: user.title,
                                gender: (user.gender).toLowerCase(),
                                family_name: user.lastName,
                                given_name: user.firstName,
                                id: PASSENGER_ID,
                                loyalty_programme_accounts: [
                                    { // FIX THIS
                                        airline_iata_code: "AA",
                                        account_number: 12345678
                                    },
                                    {
                                        airline_iata_code: "UA",
                                        account_number: 12345678
                                    }
                                ]
                            }
                            ]
                        });
            
                        console.log("Order ID - " + order.data.id);
        
                        // Check for warnings
                        var bookingWarningArray = [];
                        var overSecondThreshold = false;
                        // Event Info
                        var startDateStr = user.startDate.toISOString();
                        startDateStr = startDateStr.substring(0, startDateStr.indexOf("T")) + "T00:00:00.000Z";
                        console.log("Start Date Str", startDateStr);
                        const startDate = new Date (startDateStr);
                        var endDateStr = user.endDate.toISOString() + "";
                        endDateStr = endDateStr.substring(0, endDateStr.indexOf("T")) + "T00:00:00.000Z";
                        const endDate = new Date (endDateStr);
                        const checkedBags = user.checkedBags > user.groupCheckedBags ? user.checkedBags : user.groupCheckedBags;
                        const layoverMax = user.layoverMax > user.groupMaxLayovers ? user.layoverMax : user.groupMaxLayovers;
                        const dateTimeBuffer = user.dateTimeBuffer > user.groupDateTimeBuffer ? user.dateTimeBuffer : user.groupDateTimeBuffer;
                        const firstThreshold = parseFloat(user.firstThreshold) * (parseFloat(user.groupFirstThreshold) / 100 + 1);
                        const secondThreshold = parseFloat(user.secondThreshold) * (parseFloat(user.secondThreshold) / 100 * 1);
                        const maxFlightTier = user.maxFlightTier > user.groupFlightTierID ? user.maxFlightTier : user.groupFlightTierID;
                        const eventAirports = user.eventAirports == null ? "" : user.eventAirports.split("&&");
        
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
                        // const arrivalDiff = differenceInHours(flightDepDate, startDate);
                        const arrivalDiff = differenceInCalendarDays(flightDepDate, startDate);
                        console.log("Arrival Diff", arrivalDiff);
                        // const earlyArrival = ((flightDepDate - startDate) / (1000 * 60 * 60 * 24)) + dateTimeBuffer;
                        console.log("Flight Dep Date - " + flightDepDate);
                        console.log("User Start Date", user.startDate);
                        console.log("Start Date", startDate);
                        if (arrivalDiff > 0)
                        {
                            bookingWarningArray.push("lateArrival");
                        }
                        else if (arrivalDiff < (dateTimeBuffer * -1))
                        {
                            bookingWarningArray.push("earlyArrival");
                        }
                        const departureDiff = differenceInCalendarDays(flightRetDate, endDate);
                        console.log("Departure Diff", departureDiff);
                        // const lateDeparture = ((flightRetDate - endDate) / (1000 * 60 * 60 * 24)) - dateTimeBuffer;
                        if (departureDiff > dateTimeBuffer)
                        {
                            bookingWarningArray.push("lateDeparture");
                        }
                        else if (departureDiff < 0)
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
        
                        // Event Airports
                        var allowedAirport = false;
                        for (let i = 0; i < eventAirports.length; i++)
                        {
                            if (eventAirports[i].indexOf(order.data.slices[0].destination.iata_code) != -1)
                            {
                                allowedAirport = true;
                            }
                        }
                        if (eventAirports.length === 0)
                        {
                            allowedAirport = true;
                        }
                        if (!allowedAirport)
                        {
                            bookingWarningArray.push("outsideAirport");
                        }
        
                        var notificationMessage = "";
        
                        // Set Approval Status
                        var approvalStatus = "";
                        console.log("Booking Warning Array Below:");
                        console.log(bookingWarningArray);
                        if (bookingWarningArray.length === 0)
                        {
                            approvalStatus = "approved";
                            notificationMessage = "Your flight has been booked! Visit your <a href='/userProfileHistory'>history</a> page to view your flight!";
                        }
                        else if (overSecondThreshold)
                        {
                            approvalStatus = "escalation";
                            notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                        }
                        else
                        {
                            approvalStatus = "pending";
                            notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                        }
        
                        con.beginTransaction();
                        var sql = "INSERT INTO booking (cost, userID, eventID, approved, json) " +
                                    "VALUES (?, ?, ?, ?, ?)";
                        var vals = [parseFloat(order.data.total_amount), userID, eventID, approvalStatus, JSON.stringify(order)];
                        con.query(sql, vals, async (err, results, fields) => {
                            if (err) 
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error adding booking" });
                            }
                            var lastInsertID = results.insertId;
    
                            // Populate Warnings
                            var warnSQL = "INSERT INTO booking_warning VALUES (?, ?)";
                            await bookingWarningArray.forEach(bookWarn => {
                                con.query(warnSQL, [lastInsertID, bookWarn], async function (err, results, fields) {
                                    if (err)
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error adding booking warnings" });
                                    }
                                });
                            }); 
        
                            if (approvalStatus == "approved")
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
                                    if (err) 
                                    {
                                        errCallback(err);
                                        con.rollback(function () {
                                            con.release();
                                        });
                                        return res.status(500).send({ err: "Error updating flight booking" });
                                    }    
                                });
                                await sendFightConfirmEmail(user.email, eventName, user.title, user.lastName);
                            }
                            else
                            {
                                await sendPendingEmail(user.email, eventName, user.title, user.lastName);
                            }
                            con.commit(); 
                            con.release();   
                            return res.send({ order: order, notif: notificationMessage });
                        });
                    }
                    catch (err)
                    {
                        console.log(err);
                        con.release();
                        return res.send({ err: "Server error" });
                    }
                } 
        
                intCreateOrder();
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.send({err: "Server error"});
    
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
});

app.get(`/duffel-order-payment`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Duffel Order Payment DB Connected");
    
        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            async function intCreatePayment (order, userID)
            {
                try
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
                        var sql = `UPDATE booking ` +
                                    `SET approved = ?, transactionID = ?, approverID = ? ` +
                                    `WHERE bookingID = ?`;
                        return new Promise ((resolve, reject) => {
                            con.query(sql, ["approved", payment.data.id, userID, bookingID], async function (err, results, fields) {
                                if (err) 
                                {
                                    errCallback(err);
                                    resolve(false)
                                }
                                resolve(payment);
                            });
                        });
                }
                catch (err)
                {
                    console.log(err);
                    return false;
                }
            }
        
            con.beginTransaction();
            const execAppUserID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!execAppUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(403).send({ err: "Not Authorized" });
                }
                else
                {
                    const sql = `SELECT email, bookingID, eventID, json, approved ` +
                                `FROM booking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON booking.userID = user.userID ` +
                                `WHERE bookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                    con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                        if (err) 
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error retrieving booking approval" });
                        }
                        if (results.length === 0) 
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(404).send({ err: "Booking Not Found" });
                        }
                        
                        if (results[0].approved == "escalation")
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
                        const bookingJson = results[0].json;
                        const order = await duffel.orders.get(bookingJson.data.id);
        
                        const paymentSuc = await intCreatePayment(order, appUserID);
                        if (!paymentSuc)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error paying for booking" });
                        }
                        else
                        {
                            con.commit();
                            con.release();
                            return res.send(paymentSuc);
                        }
                    });
                }
            }
            else
            {
                const sql = `SELECT email, bookingID, eventID, json, approved ` +
                            `FROM booking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE bookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retrieving booking approval" });
                    }
                    if (results.length === 0) 
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }
                        
                    if (results[0].approved == "escalation")
                    {
                        const execAppOnlyUserID = await execApproverOnlyAuth(req.cookies.jwt, organizationID, con);
                        if (!execAppOnlyUserID)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
                        else
                        {
                            const bookingJson = results[0].json;
                            const order = await duffel.orders.get(bookingJson.data.id);
        
                            const paymentSuc = await intCreatePayment(order, execAppOnlyUserID);
                            if (!paymentSuc)
                            {
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error paying for booking" });
                            }
                            else
                            {
                                con.commit();
                                con.release();
                                return res.send(paymentSuc);
                            }
                        }
                    }
                    else
                    {
                        const bookingJson = results[0].json;
                        const order = await duffel.orders.get(bookingJson.data.id);
        
                        const paymentSuc = await intCreatePayment(order, execAppUserID);
                        if (!paymentSuc)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error paying for booking" });
                        }
                        else
                        {
                            con.commit();
                            con.release();
                            return res.send(paymentSuc);
                        }
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/duffel-order-cancel`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Duffel order Cancel DB Connected");
    
        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
            
            async function intOrderCancel (bookingJson, userID)
            {
                try
                {
                    var cancellation = await duffel.orderCancellations.create({
                        order_id: bookingJson.data.id
                    });
            
                    // Confirm Cancellation
                    cancellation = await duffel.orderCancellations.confirm(cancellation.data.id);
            
                    console.log("Cancel ID - " + cancellation.data.id);
                    var sql = "UPDATE booking " +
                            "SET approved = ?, approverID = ? " +
                            "WHERE bookingID = ?";
                    return new Promise ((resolve, reject) => {
                        con.query(sql, ["denied", userID, bookingID], async function (err, results, fields) {
                            if (err) 
                            {
                                errCallback(err);
                                resolve(false);
                            }
                            resolve(cancellation);
                        });
                    });
                }
                catch (err)
                {
                    console.log(err);
                    return true;
                }
            } 
            
            con.beginTransaction();
            const execAppUserID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!execAppUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(403).send({ err: "Not Authorized" });
                }
                else
                {
                    const sql = `SELECT email, bookingID, eventID, json, approved ` +
                                `FROM booking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON booking.userID = user.userID ` +
                                `WHERE bookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                    con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error retreiving booking approval" });
                        }
    
                        if (results.length === 0) 
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(404).send({ err: "Booking Not Found" });
                        }
                        
                        if (results[0].approved == "escalation")
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
        
                        const bookingJson = results[0].json;
                        const cancelSuc = await intOrderCancel(bookingJson, appUserID);
                        if (!cancelSuc)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error canceling booking" });
                        }
                        else
                        {
                            con.commit();
                            con.release();
                            return res.status(500).send(cancelSuc);
                        }
                    });
                }
            }
            else
            {
                const sql = `SELECT email, bookingID, eventID, json, approved ` +
                            `FROM booking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE bookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retrieving booking approval" });
                    }
                    if (results.length === 0) 
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }
                        
                    if (results[0].approved == "escalation")
                    {
                        const execAppOnlyUserID = await execApproverOnlyAuth(req.cookies.jwt, organizationID, con);
                        if (!execAppOnlyUserID)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
                        else
                        {
                            const bookingJson = results[0].json;
                            const cancelSuc = await intOrderCancel(bookingJson, execAppOnlyUserID);
                            if (!cancelSuc)
                            {
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error canceling booking" });
                            }
                            else
                            {
                                con.commit();
                                con.release();
                                return cancelSuc;
                            }
                        }
                    }
                    else
                    {
                        const bookingJson = results[0].json;
                        const cancelSuc = await intOrderCancel(bookingJson, execAppUserID);
                        if (!cancelSuc)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error canceling booking" });
                        }
                        else
                        {
                            con.commit();
                            con.release();
                            return cancelSuc;
                        }
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

// app.get(`/duffel-order-cancel-confirm`, async (req, res) => {
//     try
//     {
//         const ORDER_CANCELLATION_ID = req.query.id;
//         var cancellation = await duffel.orderCancellations.confirm(ORDER_CANCELLATION_ID);

//         console.log("Cancel ID - " + cancellation.data.id);
//         return res.send(cancellation);
//     }
//     catch (err)
//     {
//         console.log(err)
//         return res.status(500).send({ err: "Server error" });
//     }
// });

// Amadeus API
const amadeus = new Amadeus({
    clientId: 'ZJlBa8AYSnx92rKVbJtrXfybbcDiHQBw',
    clientSecret: '00Wbf5GGSAk1k8NG',
});

/** Airport Search from Amadeus */
app.get(`/airport-search`, async (req, res) => {
    try
    {
        if (!req.cookies.onsite)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        amadeus.referenceData.locations.get({ 
            keyword: req.query.term, 
            subType: 'AIRPORT' 
          }).then(function(response){ 
            res.json(response.data); 
            console.log(response.data.iataCode); 
          }).catch(function(error){ 
            console.log("error"); 
            console.log(error.response); 
          }); 
    }
    catch (err)
    {
        console.log(err);
        return res.status(500).send({ err: "Server error" });
    }
});

app.post(`/amadeus-seat-maps`, async (req, res) => {
    try
    {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(500).send({ err: "Invalid authorization" });
        }
        const flight = req.body;
        amadeus.shopping.seatmaps.post(
            JSON.stringify({
                'data': [
                    flight
                ]
            })
        ).then(function (response) {
            res.send(response.result);
        }).catch(function (response) {
            res.send(response);
        });
    }
    catch (err)
    {
        console.log(err);
        return res.status(500).send({ err: "Server error" });
    }
});

app.get(`/amadeus-search`, async (req, res) => {
    try
    {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(500).send({ err: "Invalid authorization" });
        }

        const originCode = req.query.originCode;
        const destinationCode = req.query.destinationCode;
        const dateOfDeparture = req.query.dateOfDeparture;
        const dateOfReturn = req.query.dateOfReturn;
        const flightTierID = req.query.flightClass;

        const flightSearchObj = validateFlightSearch(originCode, destinationCode, dateOfDeparture, dateOfReturn, flightTierID, 2);
        if (!flightSearchObj)
        {
            return res.status(422).send({ err: "Invalid values" });
        }

        const flightTierRankings = { 1: "economy", 2: "premium_economy", 3: "business", 4: "first" };
        const travelClass = (flightTierRankings[flightSearchObj.flightTierID] + "").toUpperCase();


    
        // Find the cheapest flights
        amadeus.shopping.flightOffersSearch.get({
            originLocationCode: flightSearchObj.originCode,
            destinationLocationCode: flightSearchObj.destinationCode,
            departureDate: flightSearchObj.dateOfDeparture,
            returnDate: flightSearchObj.dateOfReturn,
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
    }
    catch (err)
    {
        console.log(err);
        return res.status(500).send({ err: "Server error" });
    }
});

app.post(`/amadeus-flight-confirmation`, async (req, res) => {
    try
    {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }
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
                console.log(response);
                res.send(response)
            })
    }
    catch (err)
    {
        console.log(err);
        return res.status(500).send({ err: "Server error" });
    }
});

app.post(`/amadeus-flight-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Flight Booking DB Connected");
    
        try
        {
            // Book a flight
            const flight = req.body.offer;
            const eventID = validateID(req.body.eventInfo.eventID);
            const eventName = validateEventName(req.body.eventInfo.eventName);
            const tierID = validateFlightTierID(req.body.eventInfo.tierID);
            if (!eventID || !eventName || !tierID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            console.log("Event ID: " + eventID + ". Tier ID: " + tierID);
    
            const userID = await inEventAuth(req.cookies.jwt, eventID, con);
            if (!userID)
            {
                con.release();
                return res.status(500).send({ err: "Invalid Authorization" });
            }
    
            var sql = `SELECT eventID, userID, email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN, preferredAirport, title, eventName, eventLocation, startDate, endDate, event.checkedBags, layoverMax, dateTimeBuffer, firstThreshold, secondThreshold, overallBudget, event.organizationID, maxFlightTier, GROUP_CONCAT(airportCode SEPARATOR "&&") AS eventAirports, MAX(rolegroup.checkedBags) AS groupCheckedBags, MAX(defaultFirstThreshold) AS groupFirstThreshold, MAX(defaultSecondThreshold) AS groupSecondThreshold, MAX(defaultMaxLayovers) AS groupMaxLayovers, MAX(defaultDateTimeBuffer) AS groupDateTimeBuffer, MAX(flightTierID) AS groupFlightTierID ` +
            `FROM user JOIN event_user USING (userID) JOIN event USING (eventID) LEFT JOIN event_airport USING (eventID) JOIN rolegroup USING (groupID) ` +
            `WHERE userID = ? AND eventID = ? ` +
            `GROUP BY eventID`;
            con.query(sql, [userID, eventID], async (err, results) => {
                if (err) 
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error retreiving user event association" });
                }
    
                if (results.length === 0) 
                {
                    con.release();
                    return res.status(400).send({ err: "User event association not found" }); //going to need to add error checking
                }

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
                user['birthdate'] = await decryptField(user['birthdate']);
                console.log((user.birthdate));
                await amadeus.booking.flightOrders.post(
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
                ).then(async function (order) {
                    console.log(order);
    
                    // Check for warnings
                    var bookingWarningArray = [];
                    var overSecondThreshold = false;
                    // Event Info
                    var startDateStr = user.startDate.toISOString();
                    startDateStr = startDateStr.substring(0, startDateStr.indexOf("T")) + "T00:00:00.000Z";
                    console.log("Start Date Str", startDateStr);
                    const startDate = new Date (startDateStr);
                    var endDateStr = user.endDate.toISOString() + "";
                    endDateStr = endDateStr.substring(0, endDateStr.indexOf("T")) + "T00:00:00.000Z";
                    const endDate = new Date (endDateStr);
                    const checkedBags = user.checkedBags > user.groupCheckedBags ? user.checkedBags : user.groupCheckedBags;
                    const layoverMax = user.layoverMax > user.groupMaxLayovers ? user.layoverMax : user.groupMaxLayovers;
                    const dateTimeBuffer = user.dateTimeBuffer > user.groupDateTimeBuffer ? user.dateTimeBuffer : user.groupDateTimeBuffer;
                    const firstThreshold = parseFloat(user.firstThreshold) * (parseFloat(user.groupFirstThreshold) / 100 + 1);
                    const secondThreshold = parseFloat(user.secondThreshold) * (parseFloat(user.secondThreshold) / 100 * 1);
                    const maxFlightTier = user.maxFlightTier > user.groupFlightTierID ? user.maxFlightTier : user.groupFlightTierID;
                    const eventAirports = user.eventAirports == null ? "" : user.eventAirports.split("&&");
    
                    // Flight Info
                    var flightDepDateStr = order.data.flightOffers[0].itineraries[0].segments[0].departure.at;
                    flightDepDateStr = flightDepDateStr.substring(0, flightDepDateStr.indexOf("T")) + "T00:00:00.000Z";
                    const flightDepDate = new Date (flightDepDateStr);
                    const lastSlice = order.data.flightOffers[0].itineraries[order.data.flightOffers[0].itineraries.length - 1];
                    var flightRetDateStr = lastSlice.segments[0].departure.at;
                    flightRetDateStr = flightRetDateStr.substring(0, flightRetDateStr.indexOf("T")) + "T00:00:00.000Z";
                    const flightRetDate = new Date (flightRetDateStr);
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
                    // const arrivalDiff = differenceInHours(flightDepDate, startDate);
                    const arrivalDiff = differenceInCalendarDays(flightDepDate, startDate);
                    console.log("Arrival Diff", arrivalDiff);
                    // const earlyArrival = ((flightDepDate - startDate) / (1000 * 60 * 60 * 24)) + dateTimeBuffer;
                    console.log("Flight Dep Date - " + flightDepDate);
                    console.log("User Start Date", user.startDate);
                    console.log("Start Date", startDate);
                    if (arrivalDiff > 0)
                    {
                        bookingWarningArray.push("lateArrival");
                    }
                    else if (arrivalDiff < (dateTimeBuffer * -1))
                    {
                        bookingWarningArray.push("earlyArrival");
                    }
                    const departureDiff = differenceInCalendarDays(flightRetDate, endDate);
                    console.log("Departure Diff", departureDiff);
                    // const lateDeparture = ((flightRetDate - endDate) / (1000 * 60 * 60 * 24)) - dateTimeBuffer;
                    if (departureDiff > dateTimeBuffer)
                    {
                        bookingWarningArray.push("lateDeparture");
                    }
                    else if (departureDiff < 0)
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
    
                    // Event Airports
                    var allowedAirport = false;
                    for (let i = 0; i < eventAirports.length; i++)
                    {
                        var currentArrAirport = order.data.flightOffers[0].itineraries[0].segments[order.data.flightOffers[0].itineraries[0].segments.length - 1].arrival.iataCode;
                        if (eventAirports[i].indexOf(currentArrAirport) != -1)
                        {
                            allowedAirport = true;
                        }
                    }
                    if (eventAirports.length === 0)
                    {
                        allowedAirport = true;
                    }
                    if (!allowedAirport)
                    {
                        bookingWarningArray.push("outsideAirport");
                    }
    
                    var notificationMessage = "";
    
                    // Set Approval Status
                    var approvalStatus = "";
                    if (bookingWarningArray.length == 0)
                    {
                        approvalStatus = "approved";
                        await sendFightConfirmEmail(user.email, eventName, user.title, user.lastName);
                        notificationMessage = "Your flight has been booked! Visit your <a href='/userProfileHistory'>history</a> page to view your flight!";
                    }
                    else if (overSecondThreshold)
                    {
                        approvalStatus = "escalation";
                        await sendPendingEmail(user.email, eventName, user.title, user.lastName);
                        notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                    }
                    else
                    {
                        approvalStatus = "pending";
                        await sendFightConfirmEmail(user.email, eventName, user.title, user.lastName);
                        notificationMessage = "Your flight has been sent for approval. Please visit your <a href='/userProfileHistory'>history</a> page for any updates regarding the approval decision.";
                    }
    
                    con.beginTransaction();
                    var sql = "INSERT INTO booking (cost, userID, eventID, approved, api, json) " +
                                "VALUES (?, ?, ?, ?, ?, ?)";
                    var vals = [parseFloat(order.data.flightOffers[0].price.grandTotal), userID, eventID, approvalStatus, "amadeus", JSON.stringify(order)];
                    console.log(vals);
                    con.query(sql, vals, async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error adding booking" });
                        }
                        var lastInsertID = results.insertId;
                        // Populate Warnings
                        var warnSQL = "INSERT INTO booking_warning VALUES (?, ?)";
                        await bookingWarningArray.forEach(bookWarn => {
                            con.query(warnSQL, [lastInsertID, bookWarn], async function (err, results, fields) {
                                if (err) 
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error adding booking warnings" });
                                }
                            });
                        });
                        con.commit();
                        con.release();
                        return res.send({ order: order, notif: notificationMessage });
                    });
                }).catch(function (response) {
                    // Segment Sell Errors Happen Here
                    console.log(response);
                    return res.send(response);
                });
            });
        }
        catch (error)
        {
            console.log(error);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});


// Amadeus Approve Bookings
app.get(`/amadeus-approve-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Approve Booking DB Connected");
    
        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
        
            con.beginTransaction();
            const execAppUserID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!execAppUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback();
                    con.release();
                    return res.status(403).send({ err: "Not Authorized" });
                }
                else
                {
                    const sql = `SELECT email, bookingID, eventID, json, approved ` +
                                `FROM booking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON booking.userID = user.userID ` +
                                `WHERE bookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                    con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                        if (err) 
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error retrieving booking approval" });
                        }
    
                        if (results.length === 0) 
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(404).send({ err: "Booking Not Found" });
                        }
                        
                        if (results[0].approved == "escalation")
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
        
                        var sql = `UPDATE booking ` +
                                `SET approved = ?, approverID = ? ` +
                                `WHERE bookingID = ?`;
                        con.query(sql, ["approved", appUserID, bookingID], async function (err, results, fields) {
                            if (err) 
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error updaing booking" });
                            }    
                            con.commit(function () {
                                con.release();
                            });
                            return res.send(results);
                        });
                    });
                }
            }
            else
            {
                const sql = `SELECT email, bookingID, eventID, json, approved ` +
                            `FROM booking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE bookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retreiving booking approval" });
                    }
    
                    if (results.length === 0) 
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }
                        
                    if (results[0].approved == "escalation")
                    {
                        const execAppOnlyUserID = await execApproverOnlyAuth(req.cookies.jwt, organizationID, con);
                        if (!execAppOnlyUserID)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
                        else
                        {
                            var sql = `UPDATE booking ` +
                                    `SET approved = ?, approverID = ? ` +
                                    `WHERE bookingID = ?`;
                            con.query(sql, ["approved", execAppOnlyUserID, bookingID], async function (err, results, fields) {
                                if (err) 
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error updating booking" });
                                }
                                con.commit();
                                con.release();
                                return res.send(results);
                            });
                        }
                    }
                    else
                    {
                        var sql = `UPDATE booking ` +
                                `SET approved = ?, approverID = ? ` +
                                `WHERE bookingID = ?`;
                        con.query(sql, ["approved", execAppUserID, bookingID], async function (err, results, fields) {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error updating booking" });
                            }
                            con.commit();    
                            con.release();
                            return res.send(results);
                        });
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/amadeus-deny-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Deny Booking DB Connected");
    
        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
            
            con.beginTransaction();
            const execAppUserID = await execApproverAuth(req.cookies.jwt, organizationID, con);
            if (!execAppUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    console.log("No Approver ID", organizationID);
                    return res.status(403).send({ err: "Not Authorized" });
                }
                else
                {
                    const sql = `SELECT email, bookingID, eventID, json, approved ` +
                                `FROM booking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON booking.userID = user.userID ` +
                                `WHERE bookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                    con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error retrieving booking approval" });
                        }
                        console.log(results);
                        if (results.length === 0) 
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(404).send({ err: "Booking Not Found" });
                        }
                        
                        if (results[0].approved == "escalation")
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
        
                        var sql = "UPDATE booking " +
                                "SET approved = ?, approverID = ? " +
                                "WHERE bookingID = ?";
                        con.query(sql, ["denied", appUserID, bookingID], async function (err, results, fields) {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error canceling booking" });
                            }
                            con.commit();
                            con.release();
                            return res.send({ msg: "Successfully cancelled booking" });
                        });
                    });
                }
            }
            else
            {
                const sql = `SELECT email, bookingID, eventID, json, approved ` +
                            `FROM booking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE bookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err) 
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retrieving booking approval" });
                    }
                    if (results.length === 0)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }
                        
                    if (results[0].approved == "escalation")
                    {
                        const execAppOnlyUserID = await execApproverOnlyAuth(req.cookies.jwt, organizationID, con);
                        if (!execAppOnlyUserID)
                        {
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(403).send({ err: "Invalid Authorization" });
                        }
                        else
                        {
                            var sql = "UPDATE booking " +
                                    "SET approved = ?, approverID = ? " +
                                    "WHERE bookingID = ?";
                            con.query(sql, ["denied", execAppOnlyUserID, bookingID], async function (err, results, fields) {
                                if (err) 
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error canceling booking" });
                                }
                                con.commit();
                                con.release();
                                return res.send({ msg: "Successfully cancelled booking" });
                            });
                        }
                    }
                    else
                    {
                        var sql = "UPDATE booking " +
                                    "SET approved = ?, approverID = ? " +
                                    "WHERE bookingID = ?";
                            con.query(sql, ["denied", execAppUserID, bookingID], async function (err, results, fields) {
                                if (err)
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error canceling booking" });
                                }
                                con.commit();
                                con.release();
                                return res.send({ msg: "Successfully cancelled booking" });
                            });
                    }
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

/** Amadeus Hotels */ 

// Searches for cities
app.get(`/amadeus-city-search`, async (req, res) => {
    try {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        const response = await amadeus.referenceData.locations.get({
          keyword: req.query.term,
          subType: Amadeus.location.city,
        });
        // amadeus.referenceData.locations.get({ 
        //     keyword: req.query.term, 
        //     subType: 'AIRPORT' 
        //   }).then(function(response){ 
        //     res.json(response.data); 
        //     console.log(response.data.iataCode); 
        //   }).catch(function(error){ 
        //     console.log("error"); 
        //     console.log(error.response); 
        //   }); 
        console.log(response.data); 
        return await res.send(response.data);   
        //await res.json(JSON.parse(response.body));
      } catch (err) {
        await res.json(err);
      }
});

app.get(`/amadeus-hotel-search`, async (req, res) => {
    try {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        const cityCode = validateAirport(req.query.cityCode);
        if (!cityCode)
        {
            return res.status(422).send({ err: "Invalid city code" });
        }

        const response = await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode: cityCode
        });
        var jsonData = JSON.parse(response.body);
        const hotelData = await hotelListReverseGeocode(jsonData.data);
        console.log("This Ran First!");
        return res.json(hotelData);

      } catch (err) {
        console.log(err);
        await res.send({ err: "No hotels found" });
      }
});

// app.get(`/amadeus-hotel-list`, async (req, res) => {
//     try {
//         const { hotelIds } = req.query;
//         const response = await amadeus.referenceData.locations.hotels.byHotels.get({
//             hotelIds: hotelIds
//         });
//         await res.json(JSON.parse(response.body));
//     } catch (err) {
//         console.log(err);
//         await res.json(err);
//     }
// });

app.get(`/amadeus-hotel-offers`, async (req, res) => {
    try {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        const { hotelIds, checkInDate, checkOutDate } = req.query;
        if (!validateCheckInAndCheckOutDates(checkInDate, checkOutDate))
        {
            return res.status(422).send({ err: "Invalid dates" });
        }
        const response = await amadeus.shopping.hotelOffersSearch.get({
            hotelIds: hotelIds,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            adults: '1'
        });
        const offer = await (JSON.parse(response.body).data);
        await res.status(200).send(offer);
    } catch (err) {
        console.log(err);
        await res.send({ err: "No hotel offers found" });
    }
});

app.get(`/amadeus-hotel-offer-confirm`, async (req, res) => {
    try {
        const userID = await generalAuth(req.cookies.jwt);
        if (!userID)
        {
            return res.status(401).send({ err: "Invalid authorization" });
        }

        const { offerId } = req.query;
        const response = await amadeus.shopping.hotelOfferSearch(offerId).get();
        await res.status(200).json(JSON.parse(response.body));
    } catch (err) {
        console.log(err);
        await res.status(500).send({ err: "Unable to confirm hotel offer" });
    }
});

app.post(`/amadeus-request-hotel-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Request Hotel Booking DB Connected");
    
        try
        {
            const eventID = validateID(req.body.eventID);
            const eventName = validateEventName(req.body.eventName);
            const hotelName = validateHotelName(req.body.hotelName);
            if (!eventID || !eventName || !hotelName)
            {
                con.release();
                return res.status(422).send({ err: "Invalid values" });
            }
    
            const offer = req.body.offer;
            const userID = await inEventAuth(req.cookies.jwt, eventID, con);
            if (!userID)
            {
                con.release();
                return res.status(403).send({ err: "Invalid authorization" });
            }
    
            const sql = `INSERT INTO hotelBooking (totalNightCost, avgNightCost, hotelName, userID, eventID, approved, hotelJSON) ` +
                        `VALUES (?, ?, ?, ?, ?, ?, ?)`;
            const values = [offer.price.total, offer.price.variations.average.base, hotelName, userID, eventID, "pending", JSON.stringify(offer)];
            con.query(sql, values, async (err, results, fields) => {
                if (err)
                {
                    errCallback(err);
                    con.release();
                    return res.status(500).send({ err: "Error requesting hotel booking" });
                }
                const userInfoSQL = `SELECT email, lastName, title FROM user WHERE userID = ?`;
                con.query(userInfoSQL, [userID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.release();
                        return res.status(500).send({ err: "Error retrieving user information" });
                    }
                    else if (results.length === 0)
                    {
                        con.release();
                        return res.status(500).send({ err: "No user information found" });
                    }
                    await sendPendingEmail(results[0].email, eventName, results[0].title, results[0].lastName);
                    con.release();
                    return res.status(200).send({ msg: "Successfully requested booking" }); 
                });
            });
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

// app.get(`/amadeus-book-hotel-offer`, async (req, res) => {
//     try {
//         const { offerId } = req.query;
//         const response = await amadeus.booking.hotelOrders.post({
//             "data": {
//                 "type": "hotel-order",
//                 "guests": [
//                 {
//                     "tid": 1,
//                     "title": "MR",
//                     "firstName": "BOB",
//                     "lastName": "SMITH",
//                     "phone": "+33679278416",
//                     "email": "bob.smith@email.com"
//                 }
//                 ],
//                 "travelAgent": {
//                 "contact": {
//                     "email": "bob.smith@email.com"
//                 }
//                 },
//                 "roomAssociations": [
//                 {
//                     "guestReferences": [
//                     {
//                         "guestReference": "1"
//                     }
//                     ],
//                     "hotelOfferId": offerId
//                 }
//                 ],
//                 "payment": {
//                 "method": "CREDIT_CARD",
//                 "paymentCard": {
//                     "paymentCardInfo": {
//                     "vendorCode": "VI",
//                     "cardNumber": "4151289722471370",
//                     "expiryDate": "2026-08",
//                     "holderName": "BOB SMITH"
//                     }
//                 }
//                 }
//             }
//         });
//         await res.json(JSON.parse(response.body));
//     } catch (err) {
//         console.log(err);
//         await res.status(500).send({ err: "Server error" });
//     }
// });

app.get(`/amadeus-approve-hotel-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Approve Hotel Booking DB Connected");

        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }
            console.log("Org ID", organizationID);

            con.beginTransaction();
            const adminUserID = await adminAuth(req.cookies.jwt, organizationID, con);
            if (!adminUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(403).send({ err: "Invalid authorization" });
                }
                else
                {
                        const sql = `SELECT email, hotelBookingID, eventID, approved ` +
                                    `FROM hotelBooking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON hotelBooking.userID = user.userID ` +
                                    `WHERE hotelBookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                        con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error retrieving booking approval" });
                            }

                            if (results.length == 0)
                            {
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(404).send({ err: "Booking Not Found" });
                            }

                            const sql = `UPDATE hotelBooking ` +
                                        `SET approved = ?, approverID = ? ` +
                                        `WHERE hotelBookingID = ?`;
                            con.query(sql, ["approved", appUserID, bookingID], async (err, results, fields) => {
                                if (err)
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error confirming booking" });
                                }
                                con.commit();
                                con.release();
                                return res.send({ msg: "Successfully confirmed booking" });
                            });
                        });
                }
            }
            else
            {
                const sql = `SELECT email, hotelBookingID, eventID, approved ` +
                            `FROM hotelBooking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE hotelBookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retrieving booking approval" });
                    }
                    
                    if (results.length === 0)
                    {
                        con.rollback(function () { 
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }

                    const sql = `UPDATE hotelBooking ` +
                                `SET approved = ?, approverID = ? ` +
                                `WHERE hotelBookingID = ?`;
                    con.query(sql, ["approved", adminUserID, bookingID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error confirming booking" });
                        }
                        con.commit();
                        con.release();
                        return res.send({ msg: "Successfully confirmed booking" });
                    });
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

app.get(`/amadeus-deny-hotel-booking`, async (req, res) => {
    pool.getConnection(async (err, con) => {
        if (err)
        {
            return errCallback(err);
        }
        console.log("Amadeus Deny Hotel Booking DB Connected");

        try
        {
            const bookingID = validateID(req.query.bookingID);
            const organizationID = validateID(req.query.organizationID);
            if (!bookingID || !organizationID)
            {
                con.release();
                return res.status(422).send({ err: "Invalid IDs" });
            }

            con.beginTransaction();
            const adminUserID = await adminAuth(req.cookies.jwt, organizationID, con);
            if (!adminUserID)
            {
                const appUserID = await approverAuth(req.cookies.jwt, organizationID, con);
                if (!appUserID)
                {
                    con.rollback(function () {
                        con.release();
                    });
                    return res.status(403).send({ err: "Invalid authorization" });
                }
                else
                {
                        const sql = `SELECT email, hotelBookingID, eventID, approved ` +
                                    `FROM hotelBooking JOIN event_user USING (eventID) JOIN rolegroup USING (groupID) JOIN user ON hotelBooking.userID = user.userID ` +
                                    `WHERE hotelBookingID = ? AND event_user.userID = ? AND adminRole = "approver"`;
                        con.query(sql, [bookingID, appUserID], async (err, results, fields) => {
                            if (err)
                            {
                                errCallback(err);
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(500).send({ err: "Error retrieving booking approval" });
                            }

                            if (results.length == 0)
                            {
                                con.rollback(function () {
                                    con.release();
                                });
                                return res.status(404).send({ err: "Booking Not Found" });
                            }

                            const sql = `UPDATE hotelBooking ` +
                                        `SET approved = ?, approverID = ? ` +
                                        `WHERE hotelBookingID = ?`;
                            con.query(sql, ["denied", appUserID, bookingID], async (err, results, fields) => {
                                if (err)
                                {
                                    errCallback(err);
                                    con.rollback(function () {
                                        con.release();
                                    });
                                    return res.status(500).send({ err: "Error cancelling booking" });
                                }
                                con.commit();
                                con.release();
                                return res.send({ msg: "Successfully cancelled booking" });
                            });
                        });
                }
            }
            else
            {
                const sql = `SELECT email, hotelBookingID, eventID, approved ` +
                            `FROM hotelBooking JOIN user USING (userID) JOIN event USING (eventID) ` +
                            `WHERE hotelBookingID = ? AND organizationID = ?`;
                con.query(sql, [bookingID, organizationID], async (err, results, fields) => {
                    if (err)
                    {
                        errCallback(err);
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(500).send({ err: "Error retrieving booking approval" });
                    }

                    if (results.length == 0)
                    {
                        con.rollback(function () {
                            con.release();
                        });
                        return res.status(404).send({ err: "Booking Not Found" });
                    }

                    const sql = `UPDATE hotelBooking ` +
                                `SET approved = ?, approverID = ? ` +
                                `WHERE hotelBookingID = ?`;
                    con.query(sql, ["denied", adminUserID, bookingID], async (err, results, fields) => {
                        if (err)
                        {
                            errCallback(err);
                            con.rollback(function () {
                                con.release();
                            });
                            return res.status(500).send({ err: "Error cancelling booking" });
                        }
                        con.commit();
                        con.release();
                        return res.send({ msg: "Successfully cancelled booking" });
                    });
                });
            }
        }
        catch (err)
        {
            console.log(err);
            con.release();
            return res.status(500).send({ err: "Server error" });
        } 
    });
});

// app.get(`/amadeus-hotel-search-and-offers`, async (req, res) => {
//     try
//     {
//         const { cityCode } = req.query;
//         const hotelListRes = await amadeus.referenceData.locations.hotels.byCity.get({
//             cityCode: cityCode
//         });
//         const hotelList = await (JSON.parse(hotelListRes.body).data);
//         // return res.status(200).send(hotelList);

//         const fullList = [];
//         // Go through each hotel and find any available offers
//         for (const hotel of hotelList)
//         {
//             let hotelObj = {};
//             let include = true;
//             hotelObj.hotel = hotel;
//             try
//             {
//                 const hotelOffersRes = await amadeus.shopping.hotelOffersSearch.get({
//                     hotelIds: hotel.hotelId,
//                     checkInDate: "2025-04-09",
//                     checkOutDate: "2025-04-15",
//                     adults: 1
//                 });
//                 let hotelOffers = await (JSON.parse(hotelOffersRes.body).data);
//                 hotelObj.offers = hotelOffers;
//             }
//             catch (err)
//             {
//                 console.log(err);
//                 hotelObj.offers = { none: "N/A" };
//                 include = false;
//             }
//             if (include)
//             {
//                 fullList.push(hotelObj);
//             }
//         }
//         await res.json(fullList);
//     }
//     catch (err)
//     {
//         console.log(err);
//         await res.status(500).send({ err: "Server error" });
//     }
// });

/** Catch All Non-Existent Pages and Forward Them to the Home Page */
app.get("*", (req, res) => {
    res.redirect("/");
});

app.put("*", (req, res) => {
    res.redirect(303, "/");
});

app.post("*", (req, res) => {
    res.redirect(303, "/");
});

app.delete("*", (req, res) => {
    res.redirect(303, "/");
});