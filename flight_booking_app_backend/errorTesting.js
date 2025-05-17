import { createConnection } from "mysql2";

const con = createConnection({
  host: "localhost",
  user: "root",
  // password: "Qr6R5CknaFnix",
  password: "student",
  port: 3306,
  database: "centric", // Add the database here
});

con.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    throw err;
  }
  console.log("DB connected");
});

function errorCallback (err)
{
    console.log(err);
}

async function testError ()
{
    try
    {
        con.beginTransaction();
        var sql = `SELECT p FROM user WHERE userID = ?`;
        con.query(sql, ["1"], async (err, results) => {
            if (err)
            {
                errorCallback(err);
                con.rollback();
                return;
            }
            console.log(results);
            sql = `DELETE FROM user WHERE userID = ?`;
            con.query(sql, [1], async (err, results) => {
                if (err)
                {
                    errorCallback(err);
                    con.rollback();
                    return;
                }
                console.log(results);
                sql = `UPDATE user SET firstName = ? WHERE userID = ?`;
                con.query(sql, ["Es", 2], async (err, results) => {
                    if (err)
                    {
                        errorCallback(err);
                        con.rollback();
                        return;
                    }
                    console.log(results);
                    con.commit();
                });
            });
        });        
    }
    catch (err)
    {
        console.log("Server error:", err);
    }
}

testError();