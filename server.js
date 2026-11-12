const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const Color = require('./models/Color');

const app = express();
const PORT = 5000;

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

app.use('/api/colors', require('./routes/colors'));
app.use('/api/projects', require('./routes/projects'));

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(400).json({ message: err.message || 'Something went wrong' });
});

async function seedColors() {
  if ((await Color.countDocuments()) > 0) return;
  await Color.insertMany([
    { name: 'Warm Terracotta', hex: '#E07A5F', brand: 'Classic' },
    { name: 'Sage Green', hex: '#8FA58B', brand: 'Classic' },
    { name: 'Ocean Blue', hex: '#3D7EA6', brand: 'Classic' },
    { name: 'Sunny Yellow', hex: '#F2CC59', brand: 'Classic' },
    { name: 'Soft Lavender', hex: '#B9A6D3', brand: 'Pastel' },
    { name: 'Blush Pink', hex: '#F4C2C2', brand: 'Pastel' },
    { name: 'Mint Cream', hex: '#BDE5D0', brand: 'Pastel' },
    { name: 'Charcoal Grey', hex: '#4A4E54', brand: 'Modern' },
    { name: 'Ivory White', hex: '#F5F1E6', brand: 'Modern' },
    { name: 'Deep Teal', hex: '#1F6F6B', brand: 'Modern' }
  ]);
}

connectDB().then(async () => {
  await seedColors();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  
  });
});