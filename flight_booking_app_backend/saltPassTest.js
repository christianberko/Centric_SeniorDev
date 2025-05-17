import bcrypt from "bcrypt";

async function hashPassword(plainTextPassword) {
  const saltRounds = 10; // Number of salt rounds
  const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
  console.log("Hashed Password:", hashedPassword);
}

hashPassword("student"); 

