const bcrypt = require('bcrypt');

const testBcrypt = async () => {
  const password = 'student';

  // Hash the password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log('Hashed Password:', hashedPassword);

  // Verify the password
  const isMatch = await bcrypt.compare(password, hashedPassword);
  console.log('Password Match:', isMatch);
};

testBcrypt();
