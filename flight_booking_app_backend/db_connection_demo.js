import { createConnection } from 'mysql2';

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

var userInputSuccess = false;

con.connect(function (err) {
    if (err) throw err;
    console.log("Inserting user...");
    var sql = `INSERT INTO user (email, firstName, middleName, lastName, suffix, phoneNumber, preferredName, gender, birthdate, KTN) ` +
            `VALUES ('assassin@thefilter.com', 'Harper', 'P', 'Zahn', NULL, '14388742929', 'Peculiar', 'F', '1923-01-15', 123456789)`;
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("User record inserted");
        console.log(result);
        var insertID = result.insertId;
        sql = `INSERT INTO cred (userID, pass, salt) VALUES (${insertID}, 'theFilter', 'ch4au3idwq')`;
        con.query(sql, function (err, result) {
            if (err) throw err;
            console.log("Cred record inserted");
            console.log(result);
        });
    });
});