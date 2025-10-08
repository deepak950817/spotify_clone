import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './db/index.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;

// Connect to database and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS Origin: ${process.env.CORS_ORIGIN}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
