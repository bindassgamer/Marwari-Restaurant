const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
require('dotenv').config();

const app = express();

const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');
const ADMIN_DATA_FILE = path.join(__dirname, 'admin_data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));


// Admin Session store (temporary)
const activeSessions = new Map();


// File helpers
const readSubmissions = () => {
  try {
    if (!fs.existsSync(SUBMISSIONS_FILE)) {
      return [];
    }

    const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data || '[]');

  } catch (error) {
    console.error("Read submissions error:", error);
    return [];
  }
};


const writeSubmissions = (submissions) => {
  try {
    fs.writeFileSync(
      SUBMISSIONS_FILE,
      JSON.stringify(submissions, null, 2)
    );

    return true;

  } catch (error) {
    console.error("Write submissions error:", error);
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

  } catch(error){

    console.error("Read admin data error:", error);
    return {};

  }
};


const writeAdminData = (data) => {

  try {

    fs.writeFileSync(
      ADMIN_DATA_FILE,
      JSON.stringify(data, null, 2)
    );

    return true;

  } catch(error){

    console.error("Write admin data error:", error);
    return false;

  }

};



// Authentication
const authenticateAdmin = (req,res,next)=>{

  const authHeader=req.headers.authorization;

  if(!authHeader){

    return res.status(401).json({
      success:false,
      message:"Authorization token required"
    });

  }


  const token=authHeader.split(" ")[1];


  if(!token || !activeSessions.has(token)){

    return res.status(403).json({
      success:false,
      message:"Invalid or expired session"
    });

  }


  next();

};



// Contact form
app.post('/api/contact',(req,res)=>{

const {name,phone,email,message}=req.body;


if(!name || !phone || !email || !message){

return res.status(400).json({
success:false,
message:"All fields are required"
});

}


const submission={

id:uuidv4(),
type:"general",
name,
phone,
email,
specialRequest:message,
date:new Date().toISOString(),
status:"New"

};


const submissions=readSubmissions();

submissions.unshift(submission);


console.log(submissions);{

res.json({
success:true,
message:"Message received successfully"
});

}
else{

res.status(500).json({
success:false,
message:"Failed saving data"
});

}


});




// Restaurant booking
app.post('/api/book/restaurant',(req,res)=>{

const {
name,
phone,
email,
bookingDate,
bookingTime,
guests,
specialRequest
}=req.body;



if(!name || !phone || !email || !bookingDate || !bookingTime || !guests){

return res.status(400).json({
success:false,
message:"Required fields missing"
});

}



const submission={

id:uuidv4(),
type:"restaurant",
name,
phone,
email,
bookingDate,
bookingTime,
guests:Number(guests),
specialRequest:specialRequest || "",
date:new Date().toISOString(),
status:"New"

};


const submissions=readSubmissions();

submissions.unshift(submission);


console.log(submissions);


res.json({

success:true,
message:"Reservation received"

});


});




// Event booking
app.post('/api/book/event',(req,res)=>{


const {
name,
phone,
email,
eventType,
guests,
preferredDate,
budget,
message
}=req.body;



if(!name || !phone || !email || !eventType || !guests || !preferredDate){

return res.status(400).json({

success:false,
message:"Required fields missing"

});

}



const submission={

id:uuidv4(),
type:"event",
name,
phone,
email,
eventType,
guests:Number(guests),
bookingDate:preferredDate,
budget:budget || "Not specified",
specialRequest:message || "",
date:new Date().toISOString(),
status:"New"

};



const submissions=readSubmissions();

submissions.unshift(submission);

console.log(submissions);



res.json({

success:true,
message:"Event inquiry received"

});


});




// Public content
app.get('/api/content',(req,res)=>{

res.json({

success:true,
data:readAdminData()

});

});




// Admin login
app.post('/api/admin/login',(req,res)=>{


const {username,password}=req.body;


const adminUser=process.env.ADMIN_USERNAME || "admin";

const adminPassword=
process.env.ADMIN_PASSWORD || "LuxuryGold@2026";



if(username===adminUser && password===adminPassword){


const token=uuidv4();


activeSessions.set(token,{
username,
created:Date.now()
});


return res.json({

success:true,
token

});


}



res.status(401).json({

success:false,
message:"Invalid credentials"

});


});





// Admin submissions
app.get('/api/admin/submissions',
authenticateAdmin,
(req,res)=>{


res.json({

success:true,
data:readSubmissions()

});


});




// Update content
app.post('/api/admin/content',
authenticateAdmin,
(req,res)=>{


if(writeAdminData(req.body)){


res.json({

success:true,
message:"Updated"

});


}
else{


res.status(500).json({

success:false

});


}


});





// Logout
app.post('/api/admin/logout',(req,res)=>{


const token=req.headers.authorization?.split(" ")[1];


if(token){

activeSessions.delete(token);

}


res.json({

success:true,
message:"Logged out"

});


});





// Frontend fallback
app.get('*',(req,res)=>{


res.sendFile(
path.join(__dirname,'public','index.html')
);


});




// IMPORTANT FOR VERCEL
module.exports = app;