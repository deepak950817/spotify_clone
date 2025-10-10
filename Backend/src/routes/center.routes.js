import express from "express";
import { authMiddleware } from '../middleware/auth.middleware.js';
import { roleMiddleware } from '../middleware/role.middleware.js';
import { createCenter,removeCenter,getAvailableCenters, getCurrentCenter, joinCenter, leaveCenter, switchCenter } from "../controllers/center.controller.js";

const router = express.Router();


// router.use(roleMiddleware(['patient']));

// ... existing routes ...

// Center management routes
router.get('/available',authMiddleware,roleMiddleware(['patient', 'practitioner']),getAvailableCenters);
router.get('/current', authMiddleware,roleMiddleware(['patient', 'practitioner']),getCurrentCenter);
router.post('/join',authMiddleware,roleMiddleware(['patient', 'practitioner']), joinCenter);
router.post('/leave', authMiddleware,roleMiddleware(['patient', 'practitioner']), leaveCenter);
router.post('/switch',authMiddleware,roleMiddleware(['patient', 'practitioner']),  switchCenter);
router.post('/create',authMiddleware, createCenter);
router.delete('/remove/:centerId',authMiddleware, removeCenter);
export default router;

// import express from "express";
// import { authMiddleware } from '../middleware/auth.middleware.js';
// import { roleMiddleware } from '../middleware/role.middleware.js';
// import { 
//     createCenter,
//     removeCenter,
//     getAvailableCenters, 
//     getCurrentCenter, 
//     joinCenter, 
//     leaveCenter, 
//     switchCenter 
// } from "../controllers/center.controller.js";

// const router = express.Router();

// // ----------------------------------------------------------------------
// // Member-Related Center Routes (Accessible by both Patients and Practitioners)
// // ----------------------------------------------------------------------

// const CENTER_MEMBER_ROLES = ['patient', 'practitioner' ,'admin' ];

// router.get('/available', authMiddleware, roleMiddleware(CENTER_MEMBER_ROLES), getAvailableCenters);
// router.get('/current', authMiddleware, roleMiddleware(CENTER_MEMBER_ROLES), getCurrentCenter);
// router.post('/join', authMiddleware, roleMiddleware(CENTER_MEMBER_ROLES), joinCenter);
// router.post('/leave', authMiddleware, roleMiddleware(CENTER_MEMBER_ROLES), leaveCenter);
// router.post('/switch', authMiddleware, roleMiddleware(CENTER_MEMBER_ROLES), switchCenter);

// // ----------------------------------------------------------------------
// // Admin-Only Center Management Routes (CRITICAL SECURITY FIX)
// // ----------------------------------------------------------------------

// const ADMIN_ROLES = ['admin']; // Assuming 'admin' is the role for center management

// router.post('/create', authMiddleware, roleMiddleware(ADMIN_ROLES), createCenter);
// router.delete('/remove/:centerId', authMiddleware, roleMiddleware(ADMIN_ROLES), removeCenter);


// export default router;