const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const ADMIN_DATA_FILE = path.join(__dirname, 'admin_data.json');
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));// Admin Session store (In-memory session storage)
const activeSessions = new Map();
// Helper functions for file operations
const readSubmissions = () => {
  try {
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (error) {
    console.error('Error reading submissions file:', error);
    return [];
  }
};
const writeSubmissions = (submissions) => {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing submissions file:', error);
    return false;
  }
};
const readAdminData = () => {
  try {
    if (!fs.existsSync(ADMIN_DATA_FILE)) {
      return {};
    }
    const data = fs.readFileSync(ADMIN_DATA_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (error) {
    console.error('Error reading admin data file:', error);
    return {};
  }
};
const writeAdminData = (data) => {
  try {
    fs.writeFileSync(ADMIN_DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing admin data file:', error);
    return false;
  }
};
// Authentication Middleware
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || !activeSessions.has(token)) {
    return res.status(403).json({ success: false, message: 'Invalid or expired session' });
  }
  // Update session activity timestamp
  const session = activeSessions.get(token);
  session.lastActive = Date.now();
  next();
};
// API: Submit General Contact/Inquiry Form
app.post('/api/contact', (req, res) => {
  const { name, phone, email, message } = req.body;
  // Server-side validation
  if (!name || !phone || !email || !message) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, Phone, Email, and Message are mandatory.' 
    });
  }
  const newSubmission = {
    id: uuidv4(),
    type: 'general',
    name,
    phone,
    email,
    specialRequest: message,
    date: new Date().toISOString(),
    status: 'New'
  };
  const submissions = readSubmissions();
  submissions.unshift(newSubmission);
  if (writeSubmissions(submissions)) {
    res.status(201).json({ 
      success: true, 
      message: 'Thank you! Your message has been received. We will get back to you shortly.' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process message. Please try again later or contact us directly via WhatsApp.' 
    });
  }
});
// API: Book Restaurant Table
app.post('/api/book/restaurant', (req, res) => {
  const { name, phone, email, bookingDate, bookingTime, guests, specialRequest } = req.body;
  if (!name || !phone || !email || !bookingDate || !bookingTime || !guests) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, Phone, Email, Date, Time, and Guest count are required.' 
    });
  }
  const newSubmission = {
    id: uuidv4(),
    type: 'restaurant',
    name,
    phone,
    email,
    bookingDate,
    bookingTime,
    guests: parseInt(guests),
    specialRequest: specialRequest || '',
    date: new Date().toISOString(),
    status: 'New'
  };
  const submissions = readSubmissions();
  submissions.unshift(newSubmission);
  if (writeSubmissions(submissions)) {
    res.status(201).json({ 
      success: true, 
      message: 'Thank you! Your table reservation has been requested. We will confirm shortly.' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to record reservation. Please try again or book directly.' 
    });
  }
});
// API: Book Event Lawn
app.post('/api/book/event', (req, res) => {
  const { name, phone, email, eventType, guests, preferredDate, budget, message } = req.body;
  if (!name || !phone || !email || !eventType || !guests || !preferredDate) {
    return res.status(400).json({ 
      success: false, 
      message: 'Name, Phone, Email, Event Type, Guests, and Preferred Date are required.' 
    });
  }
  const newSubmission = {
    id: uuidv4(),
    type: 'event',
    name,
    phone,
    email,
    eventType,
    guests: parseInt(guests),
    bookingDate: preferredDate,
    budget: budget || 'Not Specified',
    specialRequest: message || '',
    date: new Date().toISOString(),
    status: 'New'
  };
  const submissions = readSubmissions();
  submissions.unshift(newSubmission);
  if (writeSubmissions(submissions)) {
    res.status(201).json({ 
      success: true, 
      message: 'Thank you! Your event inquiry has been logged. Our banquet coordinator will contact you shortly.' 
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to log event inquiry. Please try again or call us.' 
    });
  }
});
// API: Get Public Dynamic Content
app.get('/api/content', (req, res) => {
  const content = readAdminData();
  res.json({ success: true, data: content });
});
// API: Update Dynamic Content (Authenticated)
app.post('/api/admin/content', authenticateAdmin, (req, res) => {
  const newData = req.body;
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid config content' });
  }
  if (writeAdminData(newData)) {
    res.json({ success: true, message: 'Website content updated successfully!' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write content configuration changes.' });
  }
});
// API: Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'LuxuryGold@2026';
  if (username === expectedUsername && password === expectedPassword) {
    const token = uuidv4();
    activeSessions.set(token, {
      username,
      loginTime: Date.now(),
      lastActive: Date.now()
    });
    return res.json({ success: true, token, message: 'Login successful' });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials. Please try again.' });
});
// API: Get all submissions (Authenticated)
app.get('/api/admin/submissions', authenticateAdmin, (req, res) => {
  const submissions = readSubmissions();
  res.json({ success: true, data: submissions });
});
// API: Update lead status (Authenticated)
app.patch('/api/admin/submissions/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const allowedStatuses = ['New', 'Confirmed', 'Completed', 'Cancelled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }
  const submissions = readSubmissions();
  const index = submissions.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Booking submission not found' });
  }
  submissions[index].status = status;
  if (writeSubmissions(submissions)) {
    res.json({ success: true, message: `Status updated to ${status}` });
  } else {
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});
// API: Delete submission (Authenticated)
app.delete('/api/admin/submissions/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const submissions = readSubmissions();
  const filteredSubmissions = submissions.filter(s => s.id !== id);
  if (submissions.length === filteredSubmissions.length) {
    return res.status(404).json({ success: false, message: 'Booking submission not found' });
  }
  if (writeSubmissions(filteredSubmissions)) {
    res.json({ success: true, message: 'Booking log deleted successfully' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to delete booking log' });
  }
});
// API: Verify Admin Token
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Session is valid' });
});
// API: Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      activeSessions.delete(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});
// Cleanup inactive sessions every hour
setInterval(() => {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24-hour sessions
  for (const [token, session] of activeSessions.entries()) {
    if (session.lastActive < oneDayAgo) {
      activeSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);
// Fallback: Route all non-API GET requests to index.html (except static files)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Luxury Hospitality Server is running on port ${PORT}`);
  console.log(`👉 Main Website: http://localhost:${PORT}`);
  console.log(`👉 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================`);
});