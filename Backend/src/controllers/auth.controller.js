// // controllers/auth.controller.js
// const jwt = require('jsonwebtoken');
// const { asyncHandler } = require('../utils/asyncHandler');
// const { ApiResponse } = require('../utils/ApiResponse');
// const { ApiError } = require('../utils/ApiError');
// const Patient = require('../models/Patient.models');
// const Practitioner = require('../models/Practitioner.models');
// const Admin = require('../models/Admin.models');
// const AuditLog = require('../models/AuditLog.models');

// const cookieOpts = {
//   httpOnly: true,

//   secure: process.env.NODE_ENV === 'production',
//   sameSite: 'strict'
// };

// // helper: choose model
// function getModelByRole(role) {
//   switch (role) {
//     case 'patient': return Patient;
//     case 'practitioner': return Practitioner;
//     case 'admin': return Admin;
//     default: throw new ApiError(400, 'Invalid role');
//   }
// }

// // POST /api/auth/register (role-specific endpoints prefer separate routes)
// exports.registerPatient = asyncHandler(async (req, res) => {
//   const { name, email, phone, password, gender, dateOfBirth } = req.body;
//   if (!email || !password) throw new ApiError(400, 'Email and password required');

//   const exists = await Patient.findOne({ email });
//   if (exists) throw new ApiError(400, 'Patient already exists');

//   const patient = await Patient.create({
//     name, email, phone, passwordHash: password, gender, dateOfBirth
//   });

//   const accessToken = patient.generateAccessToken();
//   const refreshToken = patient.generateRefreshToken();
//   await patient.storeRefreshToken(refreshToken);

//   res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15*60*1000 });
//   res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7*24*60*60*1000 });

//   await AuditLog.create({
//     userId: patient._id, userModel: 'Patient', action: 'create',
//     resourceType: 'Patient', resourceId: patient._id, description: 'Patient registered'
//   });

//   res.status(201).json(new ApiResponse(201, patient, 'Registered'));
// });

// exports.registerPractitioner = asyncHandler(async (req, res) => {
//   const { name, email, phone, password, experienceYears, centerId } = req.body;
//   if (!email || !password) throw new ApiError(400, 'Email and password required');

//   const exists = await Practitioner.findOne({ email });
//   if (exists) throw new ApiError(400, 'Practitioner already exists');

//   const practitioner = await Practitioner.create({
//     name, email, phone, passwordHash: password, experienceYears, centerId
//   });

//   const accessToken = practitioner.generateAccessToken();
//   const refreshToken = practitioner.generateRefreshToken();
//   await practitioner.storeRefreshToken(refreshToken);

//   res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15*60*1000 });
//   res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7*24*60*60*1000 });

//   await AuditLog.create({
//     userId: practitioner._id, userModel: 'Practitioner', action: 'create',
//     resourceType: 'Practitioner', resourceId: practitioner._id, description: 'Practitioner registered'
//   });

//   res.status(201).json(new ApiResponse(201, practitioner, 'Registered'));
// });

// // POST /api/auth/login
// exports.login = asyncHandler(async (req, res) => {
//   const { email, password, role } = req.body;
//   if (!email || !password || !role) throw new ApiError(400, 'email, password and role required');

//   const Model = getModelByRole(role);
//   const user = await Model.findOne({ email });
//   if (!user) throw new ApiError(404, 'User not found');

//   const ok = await user.isPasswordCorrect(password);
//   if (!ok) throw new ApiError(401, 'Invalid credentials');

//   const accessToken = user.generateAccessToken();
//   const refreshToken = user.generateRefreshToken();
//   await user.storeRefreshToken(refreshToken);

//   res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15*60*1000 });
//   res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7*24*60*60*1000 });

//   await AuditLog.create({
//     userId: user._id, userModel: role.charAt(0).toUpperCase()+role.slice(1),
//     action: 'login', resourceType: 'User', resourceId: user._id, description: `${role} logged in`
//   });

//   res.status(200).json(new ApiResponse(200, user, 'Login successful'));
// });

// // POST /api/auth/refresh
// exports.refresh = asyncHandler(async (req, res) => {
//   const token = req.cookies?.refreshToken;
//   if (!token) throw new ApiError(401, 'No refresh token');

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
//     const Model = getModelByRole(decoded.role);
//     const user = await Model.findById(decoded.id);
//     if (!user) throw new ApiError(404, 'User not found');

//     const valid = await user.verifyRefreshToken(token);
//     if (!valid) {
//       // possible reuse - clear
//       await user.clearRefreshToken();
//       throw new ApiError(403, 'Invalid or reused refresh token');
//     }

//     const newAccess = user.generateAccessToken();
//     const newRefresh = user.generateRefreshToken();
//     await user.storeRefreshToken(newRefresh);

//     res.cookie('accessToken', newAccess, { ...cookieOpts, maxAge: 15*60*1000 });
//     res.cookie('refreshToken', newRefresh, { ...cookieOpts, maxAge: 7*24*60*60*1000 });

//     res.status(200).json(new ApiResponse(200, {}, 'Token refreshed'));
//   } catch (err) {
//     throw new ApiError(403, 'Invalid refresh token');
//   }
// });

// // POST /api/auth/logout
// exports.logout = asyncHandler(async (req, res) => {
//   const access = req.cookies?.accessToken;
//   const refresh = req.cookies?.refreshToken;

//   try {
//     const decoded = jwt.decode(access || refresh);
//     if (decoded?.id && decoded?.role) {
//       const Model = getModelByRole(decoded.role);
//       const user = await Model.findById(decoded.id);
//       if (user) {
//         await user.clearRefreshToken();
//         await AuditLog.create({
//           userId: user._id, userModel: decoded.role.charAt(0).toUpperCase()+decoded.role.slice(1),
//           action: 'logout', resourceType: 'User', resourceId: user._id, description: 'User logged out'
//         });
//       }
//     }
//   } catch (err) {
//     // ignore
//   }

//   res.clearCookie('accessToken', cookieOpts);
//   res.clearCookie('refreshToken', cookieOpts);
//   res.status(200).json(new ApiResponse(200, {}, 'Logged out'));
// });

// // GET /api/auth/me
// exports.getMe = asyncHandler(async (req, res) => {
//   // req.user should be set by auth middleware
//   if (!req.user) throw new ApiError(401, 'Not authenticated');
//   const Model = getModelByRole(req.user.role);
//   const user = await Model.findById(req.user.id);
//   if (!user) throw new ApiError(404, 'User not found');
//   res.status(200).json(new ApiResponse(200, user, 'User info'));
// });


import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import Admin from '../models/Admin.models.js';
import AuditLog from '../models/AuditLog.models.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Helper function to set tokens in cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('accessToken', accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...options, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

// working correctly
export const registerPatient = asyncHandler(async (req, res) => {
  const { name, email, phone, password, gender, dateOfBirth } = req.body;
  
  const existingUser = await Patient.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) throw new ApiError(400, 'User with this email or phone already exists');

  const patient = await Patient.create({ name, email, phone, passwordHash: password, gender, dateOfBirth });

  const accessToken = patient.generateAccessToken();
  const refreshToken = patient.generateRefreshToken();
  await patient.storeRefreshToken(refreshToken);

  setTokenCookies(res, accessToken, refreshToken);

  await AuditLog.create({
    userId: patient._id,
    userModel: 'Patient',
    action: 'create',
    resourceType: 'Patient',
    resourceId: patient._id,
    description: 'Patient registered successfully',
    ipAddress: req.ip
  });

  const createdPatient = await Patient.findById(patient._id).select('-passwordHash -refreshToken');

  res.status(201).json(new ApiResponse(201, {
    user: createdPatient,
    accessToken,
    refreshToken
  }, "Patient registered successfully"));
});


export const registerPractitioner = asyncHandler(async (req, res) => {
  const { name, email, phone, password, specialization, experienceYears, centerId } = req.body;
  
  const existingUser = await Practitioner.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) throw new ApiError(400, 'Practitioner with this email or phone already exists');

  const practitioner = await Practitioner.create({ 
    name, email, phone, passwordHash: password, specialization, experienceYears, centerId 
  });

  const accessToken = practitioner.generateAccessToken();
  const refreshToken = practitioner.generateRefreshToken();
  await practitioner.storeRefreshToken(refreshToken);

  setTokenCookies(res, accessToken, refreshToken);

  await AuditLog.create({
    userId: practitioner._id,
    userModel: 'Practitioner',
    action: 'create',
    resourceType: 'Practitioner',
    resourceId: practitioner._id,
    description: 'Practitioner registered successfully',
    ipAddress: req.ip
  });

  const createdPractitioner = await Practitioner.findById(practitioner._id).select('-passwordHash -refreshToken');

  res.status(201).json(new ApiResponse(201, {
    user: createdPractitioner,
    accessToken,
    refreshToken
  }, "Practitioner registered successfully"));
});

export const registerAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, centerId, permissions } = req.body;
  
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) throw new ApiError(400, 'Admin with this email already exists');

  const admin = await Admin.create({ name, email, passwordHash: password, centerId, permissions });

  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();
  await admin.storeRefreshToken(refreshToken);

  setTokenCookies(res, accessToken, refreshToken);

  await AuditLog.create({
    userId: admin._id,
    userModel: 'Admin',
    action: 'create',
    resourceType: 'Admin',
    resourceId: admin._id,
    description: 'Admin registered successfully',
    ipAddress: req.ip
  });

  const createdAdmin = await Admin.findById(admin._id).select('-passwordHash -refreshToken');

  res.status(201).json(new ApiResponse(201, {
    user: createdAdmin,
    accessToken,
    refreshToken
  }, "Admin registered successfully"));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  

  let user;
  switch (role) {
    case 'patient': user = await Patient.findOne({ email }); break;
    case 'practitioner': user = await Practitioner.findOne({ email }); break;
    case 'admin': user = await Admin.findOne({ email }); break;
    default: throw new ApiError(400, 'Invalid role specified');
  }

  if (!user) throw new ApiError(404, 'User not found');

    console.log(user,"hel")
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, 'Invalid credentials');

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  await user.storeRefreshToken(refreshToken);
  user.lastLogin = new Date();
  await user.save();

  setTokenCookies(res, accessToken, refreshToken);

  await AuditLog.create({
    userId: user._id,
    userModel: role.charAt(0).toUpperCase() + role.slice(1),
    action: 'login',
    resourceType: 'Auth',
    description: 'User logged in successfully',
    ipAddress: req.ip
  });

  const loggedInUser = await user.constructor.findById(user._id).select('-passwordHash -refreshToken');

  res.status(200).json(new ApiResponse(200, {
    user: loggedInUser,
    accessToken,
    refreshToken
  }, "User logged in successfully"));
});

export const logout = asyncHandler(async (req, res) => {
  await req.user.clearRefreshToken();
  clearTokenCookies(res);

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'logout',
    resourceType: 'Auth',
    description: 'User logged out successfully',
    ipAddress: req.ip
  });

  res.status(200).json(new ApiResponse(200, {}, "User logged out successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, 'Unauthorized request');

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    let user;
    switch (decodedToken.role) {
      case 'patient': user = await Patient.findById(decodedToken.id); break;
      case 'practitioner': user = await Practitioner.findById(decodedToken.id); break;
      case 'admin': user = await Admin.findById(decodedToken.id); break;
      default: throw new ApiError(401, 'Invalid refresh token');
    }

    if (!user) throw new ApiError(401, 'Invalid refresh token');

    const isValidToken = await user.verifyRefreshToken(incomingRefreshToken);
    if (!isValidToken) throw new ApiError(401, 'Refresh token is expired or used');

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    await user.storeRefreshToken(newRefreshToken);

    setTokenCookies(res, newAccessToken, newRefreshToken);

    await AuditLog.create({
      userId: user._id,
      userModel: decodedToken.role.charAt(0).toUpperCase() + decodedToken.role.slice(1),
      action: 'update',
      resourceType: 'Auth',
      description: 'Access token refreshed successfully',
      ipAddress: req.ip
    });

    res.status(200).json(new ApiResponse(200, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }, "Access token refreshed successfully"));

  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await req.user.constructor.findById(req.user._id);
  const isPasswordValid = await user.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) throw new ApiError(400, 'Current password is incorrect');

  user.passwordHash = newPassword;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    userModel: user.role.charAt(0).toUpperCase() + user.role.slice(1),
    action: 'password_change',
    resourceType: 'Auth',
    description: 'Password changed successfully',
    ipAddress: req.ip
  });

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await req.user.constructor.findById(req.user._id).select('-passwordHash -refreshToken');
  res.status(200).json(new ApiResponse(200, user, "Current user fetched successfully"));
});


export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  let user;
  switch (role) {
    case 'patient': user = await Patient.findOne({ email }); break;
    case 'practitioner': user = await Practitioner.findOne({ email }); break;
    case 'admin': user = await Admin.findOne({ email }); break;
    default: throw new ApiError(400, 'Invalid role specified');
  }

  if (!user) throw new ApiError(404, 'User not found');

  // Generate reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  // TODO: Send email with resetToken

  await AuditLog.create({
    userId: user._id,
    userModel: role.charAt(0).toUpperCase() + role.slice(1),
    action: 'password_change',
    resourceType: 'Auth',
    description: 'Password reset requested',
    ipAddress: req.ip
  });

  res.status(200).json(new ApiResponse(200, { resetToken }, "Password reset email sent successfully"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword, role } = req.body;

  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  let user;
  switch (role) {
    case 'patient': user = await Patient.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } }); break;
    case 'practitioner': user = await Practitioner.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } }); break;
    case 'admin': user = await Admin.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } }); break;
    default: throw new ApiError(400, 'Invalid role specified');
  }

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await AuditLog.create({
    userId: user._id,
    userModel: role.charAt(0).toUpperCase() + role.slice(1),
    action: 'password_change',
    resourceType: 'Auth',
    description: 'Password reset successfully',
    ipAddress: req.ip
  });

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});
