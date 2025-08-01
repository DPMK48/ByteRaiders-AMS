// hash.js
import bcrypt from "bcryptjs";

const hashPassword = async () => {
  const hashed = await bcrypt.hash("Dorathy", 10);
  console.log("Hashed password:", hashed);
};

hashPassword();
