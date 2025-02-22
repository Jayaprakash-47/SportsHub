const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5175', // Replace with your frontend URL
}));
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB Connection Error:', err);
});

connectDB();

// Define Booking Schema
const bookingSchema = new mongoose.Schema({
  ground: String,
  date: String,
  timeSlot: String,
  name: String,
  email: String,
  phone: String,
});

const Booking = mongoose.model('Booking', bookingSchema);

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Nodemailer Configuration Error:', error);
  } else {
    console.log('✅ Nodemailer is ready to send emails');
  }
});

// Send Confirmation Email
const sendConfirmationEmail = async (email, name, ground, date, timeSlot) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Booking Confirmation - Sports Hub',
    text: `Dear ${name},\n\nYour booking for ${ground} on ${date} at ${timeSlot} has been confirmed.\n\nThank you for using our service!\n\nRegards,\nSports Hub`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to: ${email}`);
  } catch (error) {
    console.error('❌ Email Sending Error:', error);
  }
};

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Sports Management API');
});

// Booking a Ground
app.post('/user-api/bookGround', async (req, res) => {
  const { ground, date, timeSlot, name, email, phone } = req.body;

  // Validate request body
  if (!ground || !date || !timeSlot || !name || !email || !phone) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const existingBooking = await Booking.findOne({ ground, date, timeSlot });

    if (existingBooking) {
      console.log("⚠ Slot already booked:", existingBooking);
      return res.status(400).json({ message: 'This time slot is already booked.' });
    }

    const newBooking = new Booking({ ground, date, timeSlot, name, email, phone });
    await newBooking.save();

    await sendConfirmationEmail(email, name, ground, date, timeSlot);

    console.log("✅ Booking successful:", newBooking);
    res.status(200).json({ message: 'Booking successful. Confirmation email sent.' });
  } catch (error) {
    console.error('❌ Booking Error:', error);
    res.status(500).json({ message: 'An error occurred while booking.', error });
  }
});

// Fetch Booked Slots
app.get('/user-api/bookedSlots', async (req, res) => {
  const { ground, date } = req.query;

  // Validate query parameters
  if (!ground || !date) {
    return res.status(400).json({ message: 'Ground and date are required.' });
  }

  try {
    const bookings = await Booking.find({ ground, date });
    const bookedSlots = bookings.map(booking => booking.timeSlot);
    res.status(200).json({ bookedSlots });
  } catch (error) {
    console.error('❌ Fetch Booked Slots Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching booked slots.' });
  }
});

// Start Server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});