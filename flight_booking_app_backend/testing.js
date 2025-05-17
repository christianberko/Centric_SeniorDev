import { createConnection } from "mysql2";
import { format, compareAsc, compareDesc, differenceInHours, differenceInMinutes, addMinutes, differenceInDays, differenceInCalendarDays } from "date-fns";
import node_geocoder from 'node-geocoder';

const con = createConnection({
  host: "localhost",
  user: "root",
  password: "student",
  port: 3306,
  database: "centric", // Add the database here
});

// Date Testing
// const result = compareAsc(new Date('1987-01-11'), new Date('1987-01-12'));
// console.log(result);
// const hourDiff = differenceInHours(new Date('1987-01-11'), new Date('1987-01-12'));
// console.log(hourDiff);
// var curTime = new Date('2025-04-02T16:09:01Z');
// var futureTime = new Date('2025-04-02T16:24:26Z');
// console.log(format(curTime, "MM-dd-yyyy"));
// const minuteDiff = differenceInMinutes(curTime, futureTime);
// console.log(minuteDiff);
// var currentTime = new Date();
// currentTime = currentTime.toISOString();
// var testFutureTime = addMinutes(currentTime, 15);
// console.log(currentTime);
// console.log(testFutureTime);

// var depDate = new Date('2025-04-14T20:00:00.000Z');
// var startDate = new Date('2025-04-15T04:00:00.000Z');
// var dayDiff = differenceInCalendarDays(depDate, startDate);
// console.log(dayDiff);

var startDate = new Date('2025-04-15');
console.log(startDate);

const AFFECTED_ROWS = 1;

// const options = {
//   provider: 'google',
//   apiKey: 'AIzaSyDyi6ZhVjdks7jAknjms4xoWf4TxhTKuy0'
// };

// const geocoder = node_geocoder(options);

// const paris = await geocoder.geocode("29 champs elysée paris");
// console.log(paris);

/* Birthday Format Testing */

// con.query("SELECT DATE_FORMAT(birthdate, '%Y-%m-%d') AS birthdate FROM user WHERE userID = 1", async function (err, results, fields) {
//     if (err) throw new Error();

//     var birthday = results[0].birthdate;
//     console.log(birthday);
// });


// Current Events 
// var sql = "SELECT userID, eventID, eventName, startDate, event.organizationID, organizationName, groupID, adminRole " + 
//           "FROM user JOIN event_user USING (userID) JOIN event USING (eventID) JOIN organization USING (organizationID) JOIN rolegroup USING (groupID) " +
//           "WHERE userID = ? AND adminRole = ? AND startDate > CURRENT_TIMESTAMP()";

// con.query(sql, [1, "false"], async function (err, results, fields) {
//     if (err) throw new Error();

//     console.log(results);
// });


// Get Roles in Organization
// var sql = "SELECT userID, organizationID, adminRole FROM user JOIN user_group USING (userID) JOIN rolegroup USING (groupID) WHERE userID = ? AND organizationID = ?";
// con.query(sql, [1, 1], async function (err, results, fields) {
//     if (err) throw new Error();

//     console.log(results);
// });