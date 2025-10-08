import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import Admin from '../models/Admin.models.js';

export const authMiddleware = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
    let user;
    switch (decodedToken.role) {
      case 'patient':
        user = await Patient.findById(decodedToken.id).select('-passwordHash -refreshToken');
        break;
      case 'practitioner':
        user = await Practitioner.findById(decodedToken.id).select('-passwordHash -refreshToken');
        break;
      case 'admin':
        user = await Admin.findById(decodedToken.id).select('-passwordHash -refreshToken');
        break;
      default:
        throw new ApiError(401, 'Invalid user role');
    }

    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    req.user = user;
     req.centerId = user.centerId;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});