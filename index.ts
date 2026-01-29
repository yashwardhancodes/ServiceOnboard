import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import serviceCenterRoutes from './routes/serviceCenterRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Setup Uploads Directory ---
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// --- Middleware ---
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sconboard.onrender.com/"
  ],
  credentials: true
}));
app.use(express.json());

// --- Routes ---
app.get('/', (req, res) => {
  res.send('Service Center API is running');
});

// Mount the route group
app.use('/api', serviceCenterRoutes);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});