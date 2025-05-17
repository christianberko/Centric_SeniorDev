import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createConnection } from "mysql2";
import path from "path";
import { doesNotMatch } from "assert";
const router = express.Router();
const SECRET_KEY = "centric"; // THIS WILL BE CHANGED IN PRODUCTION

const __dirname = path.resolve();

// Database connection
const con = createConnection({
  host: "localhost",
  user: "root",
  //password: "student",
  password: "Qr6R5CknaFnix",
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


// Register User
router.post("/register", async (req, res) => {
  const { email, firstName, middleName, lastName, phoneNumber, preferredName, gender, birthdate, KTN, password } = req.body;

  // Check if user already exists
  con.query(
    "SELECT * FROM user WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).send("Database error");
      if (results.length > 0)
        return res.status(400).send("User already exists");

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
          res.status(201).send("User registered successfully");
        });
      });
    }
  );
});

router.get('/auth/verify', (req, res) => {
  console.log(req.cookies.jwt);
  const token = req.cookies.jwt;
  console.log("Rehit - " + token);
  const secret = SECRET_KEY;
  try
  {
    const decoded = jwt.verify(token, secret);
    console.log(decoded);
    //console.log("Routing to Event Management...");
    //router.route("/userManagement");
    res.redirect(301, "../userManagement.html");
    //res.status(200).json({
    //  data: decoded
    //});
  }
  catch (error)
  {
    res.status(401).json({
      message: 'Invalid token'
    });
  }
});

// Login User
router.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  // Check user in the database
  con.query("SELECT * FROM user JOIN cred USING (userID) WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).send("Database error");

    console.log(results);
    
    if (results.length === 0) return res.status(400).send("User not found"); //going to need to add error checking
    
    const user = results[0];
   

    // Compare password with hash
    const validPassword = await bcrypt.compare(password, user.pass);
    if (!validPassword) return res.status(400).send("Invalid password"); 

    // Generate JWT token
    const payload = {
      userId: user.userID,
      email: user.email
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
    // res.status(200).json({ token, message: "Login successful" });
    console.log("Token - " + token);

    res.cookie('jwt', token, { maxAge: 900000 });

    //res.status(200).json({token});
    res.redirect(301, 'https://centricflights.com');

    // res.sendFile(
    //   path.join(__dirname, "..", "flight_booking_app_frontend", "index.html") //redirect to the frontend
    // );
  });
});

//login information for the user student & assassin@thefilter.com

// Authenticate Middleware (Optional)
// export const authenticate = (req, res, next) => {
//   const token = req.headers.authorization?.split(" ")[1];
//   if (!token) return res.status(403).send("Access denied");

//   try {
//     const verified = jwt.verify(token, SECRET_KEY);
//     req.user = verified;
//     next();
//   } catch (err) {
//     res.status(400).send("Invalid token");
//   }
// };

export default router;
