import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const app = express();
const port = 3003;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'http://ec2-51-20-85-218.eu-north-1.compute.amazonaws.com:3003'],
    },
  },
}));

// connect to DB
const pool = mysql.createPool({
  host: "mysql",
  user: "root",
  password: "root",
  database: "dockeraws",
  port: 3306,
});

// Helper function to make code look nicer
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

let users = [];
let accounts = [];
let sessions = [];

function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

// Example route
app.get('/api/endpoint', (req, res) => {
  res.send('Hello from the backend!');
});

// User registration endpoint
app.post('/users', async (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log("hashedPassword", hashedPassword);

  try {
    const result = await query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    const userId = result.insertId;
    console.log("New userId:", userId);
    await query(
      "INSERT INTO accounts (userId, amount) VALUES (?, ?)",
      [userId, 0.00]
    );
    console.log("Account created for userId:", userId);
    res.status(201).json({ message: "User created" });
  } catch (error) {
    console.error("Error creating user", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

// User login endpoint
app.post('/sessions', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await query("SELECT * FROM users WHERE username = ?", [username]);
    const user = result[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const otp = generateOTP();
    sessions.push({ userId: user.id, token: otp });
    res.json({ otp });
  } catch (error) {
    console.error("Error logging in", error);
    res.status(500).json({ message: "Error logging in" });
  }
});

// Fetch account balance endpoint
app.post('/me/accounts', async (req, res) => {
  const { token } = req.body;
  console.log("Received token:", token);
  const session = sessions.find(s => s.token === token);

  if (session) {
    try {
      console.log("Session found:", session);
      const result = await query("SELECT amount FROM accounts WHERE userId = ?", [session.userId]);
      console.log("Query result:", result);
      const account = result[0];
      if (!account) {
        console.log("Account not found for userId:", session.userId);
        return res.status(404).json({ message: "Account not found" });
      }
      res.status(200).json({ saldo: account.amount });
    } catch (error) {
      console.error("Error fetching account balance", error);
      res.status(500).json({ message: "Error fetching account balance" });
    }
  } else {
    console.log("Invalid OTP:", token);
    res.status(401).json({ message: 'Invalid OTP' });
  }
});

// Handle transactions endpoint
app.post('/me/accounts/transactions', async (req, res) => {
  const { token, amount } = req.body;
  console.log("Received token for transaction:", token);
  console.log("Amount to deposit:", amount);
  const session = sessions.find(s => s.token === token);

  if (session) {
    try {
      console.log("Session found for transaction:", session);
      const result = await query("SELECT amount FROM accounts WHERE userId = ?", [session.userId]);
      console.log("Query result for transaction:", result);
      const account = result[0];
      if (!account) {
        console.log("Account not found for userId:", session.userId);
        return res.status(404).json({ message: "Account not found" });
      }
      const newAmount = parseFloat(account.amount) + parseFloat(amount);
      console.log("New amount after deposit:", newAmount);
      await query("UPDATE accounts SET amount = ? WHERE userId = ?", [newAmount, session.userId]);
      console.log("Account updated for userId:", session.userId);
      res.status(200).json({ saldo: newAmount });
    } catch (error) {
      console.error("Error handling transaction", error);
      res.status(500).json({ message: "Error handling transaction" });
    }
  } else {
    console.log("Invalid OTP for transaction:", token);
    res.status(401).json({ message: 'Invalid OTP' });
  }
});



app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});

