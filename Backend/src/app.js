import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import dotenv from 'dotenv'
 dotenv.config({
    path: './.env'
})

const app=express();

if (!process.env.CORS_ORIGIN) {
   
    console.warn("⚠️  CORS_ORIGIN not defined in .env");
}//warning 

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
})) // ese likhne se mostly configure ho jata hai

app.use(express.json({limit:'20kb'})); // blob se json data ko read karne ke liye

app.use(express.urlencoded({extended:true,limit:'20kb'})) // blob se url ko read karne ke liye

app.use(express.static("public"))
 // hum chahte hai ki files sabse phele humare hi server me store ho jaye ,iske liye humne alag se pubic folder banaya hai
app.use(cookieParser())




import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import practitionerRoutes from './routes/practitioner.routes.js';
import adminRoutes from './routes/admin.routes.js';
import sessionRoutes from './routes/session.routes.js';
import rescheduleRequestRoutes from './routes/rescheduleRequest.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import centerRoutes from './routes/center.routes.js';
import aiRoutes from './routes/ai.routes.js';
import exportRoutes from './routes/exportCSV.routes.js'; 


// API routes

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/practitioners', practitionerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/reschedule-requests', rescheduleRequestRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/center', centerRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/reports', exportRoutes);


// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ayursutra API is running',
    timestamp: new Date().toISOString()
  });
});

export default app;