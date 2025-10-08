import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import AuditLog from '../models/AuditLog.models.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import Admin from '../models/Admin.models.js';

export const getAllAuditLogs = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    action, 
    userModel, 
    resourceType, 
    startDate, 
    endDate,
    userId,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = req.query;

  const filter = {};

  // Build filter based on user role and permissions
  if (req.user.role === 'admin') {
    // Admins can see all logs for their center
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  } else if (req.user.role === 'practitioner') {
    // Practitioners can see their own logs and related patient logs
    const patientIds = await getPractitionerPatientIds(req.user._id);
    filter.$or = [
      { userId: req.user._id },
      { userId: { $in: patientIds } },
      { 
        resourceType: 'Session', 
        'details.practitionerId': req.user._id 
      }
    ];
  } else if (req.user.role === 'patient') {
    // Patients can only see their own logs
    filter.userId = req.user._id;
  }

  // Apply additional filters
  if (action) filter.action = action;
  if (userModel) filter.userModel = userModel;
  if (resourceType) filter.resourceType = resourceType;
  if (userId) filter.userId = userId;

  // Date range filter
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      filters: {
        action,
        userModel,
        resourceType,
        startDate,
        endDate
      }
    }, "Audit logs fetched successfully")
  );
});

export const getAuditLogsByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 20, action, startDate, endDate } = req.query;

  // Check permissions
  if (req.user.role === 'patient' && userId !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  if (req.user.role === 'practitioner') {
    const hasAccess = await checkPractitionerAccess(req.user._id, userId);
    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }
  }

  if (req.user.role === 'admin') {
    const hasAccess = await checkAdminAccess(req.user.centerId, userId);
    if (!hasAccess) {
      throw new ApiError(403, 'Access denied');
    }
  }

  const filter = { userId };
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "User audit logs fetched successfully")
  );
});

export const getAuditLogsByAction = asyncHandler(async (req, res) => {
  const { action } = req.params;
  const { page = 1, limit = 20, startDate, endDate } = req.query;

  const filter = { action };

  // Apply role-based filtering
  if (req.user.role === 'admin') {
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  } else if (req.user.role === 'practitioner') {
    const patientIds = await getPractitionerPatientIds(req.user._id);
    filter.$or = [
      { userId: req.user._id },
      { userId: { $in: patientIds } }
    ];
  } else if (req.user.role === 'patient') {
    filter.userId = req.user._id;
  }

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      action,
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Action-specific audit logs fetched successfully")
  );
});

export const getAuditLogsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const { page = 1, limit = 50 } = req.query;

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Start date and end date are required');
  }

  const filter = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  // Apply role-based filtering
  if (req.user.role === 'admin') {
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  } else if (req.user.role === 'practitioner') {
    const patientIds = await getPractitionerPatientIds(req.user._id);
    filter.$or = [
      { userId: req.user._id },
      { userId: { $in: patientIds } }
    ];
  } else if (req.user.role === 'patient') {
    filter.userId = req.user._id;
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  // Get activity summary
  const activitySummary = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        users: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        action: '$_id',
        count: 1,
        uniqueUsers: { $size: '$users' },
        _id: 0
      }
    }
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      auditLogs,
      summary: {
        totalActivities: total,
        dateRange: { startDate, endDate },
        activityBreakdown: activitySummary
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Date range audit logs fetched successfully")
  );
});

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const { format = 'json', startDate, endDate } = req.query;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can export audit logs');
  }

  const filter = {};
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  // Only export logs from admin's center
  const centerUsers = await getCenterUserIds(req.user.centerId);
  filter.userId = { $in: centerUsers };

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email role')
    .sort({ timestamp: -1 })
    .limit(1000); // Limit for export

  if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(auditLogs);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    
    return res.status(200).send(csvData);
  }

  // Default JSON format
  res.status(200).json(
    new ApiResponse(200, auditLogs, "Audit logs exported successfully")
  );
});

export const getSystemLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can access system logs');
  }

  // System logs are typically logs without a specific user (system-generated)
  const filter = {
    $or: [
      { userModel: 'System' },
      { userId: null },
      { action: { $in: ['system_start', 'system_stop', 'backup', 'maintenance'] } }
    ]
  };

  const systemLogs = await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  // Get system health metrics
  const systemMetrics = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
        },
        dailyLogs: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ["$action", "error"] }, 1, 0] } },
        warnings: { $sum: { $cond: [{ $eq: ["$action", "warning"] }, 1, 0] } }
      }
    },
    { $sort: { _id: -1 } },
    { $limit: 7 }
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      systemLogs,
      metrics: {
        totalSystemLogs: total,
        recentActivity: systemMetrics
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "System logs fetched successfully")
  );
});

export const getAuditSummary = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  let filter = {};
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  filter.timestamp = { $gte: startDate };

  // Apply role-based filtering
  if (req.user.role === 'admin') {
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  } else if (req.user.role === 'practitioner') {
    const patientIds = await getPractitionerPatientIds(req.user._id);
    filter.$or = [
      { userId: req.user._id },
      { userId: { $in: patientIds } }
    ];
  } else if (req.user.role === 'patient') {
    filter.userId = req.user._id;
  }

  const summary = await AuditLog.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalActivities: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        byAction: {
          $push: {
            action: '$action',
            timestamp: '$timestamp'
          }
        },
        byResource: {
          $push: {
            resource: '$resourceType',
            timestamp: '$timestamp'
          }
        },
        byUserType: {
          $push: {
            userType: '$userModel',
            timestamp: '$timestamp'
          }
        }
      }
    }
  ]);

  const auditSummary = summary[0] || {
    totalActivities: 0,
    uniqueUsers: [],
    byAction: [],
    byResource: [],
    byUserType: []
  };

  // Process action distribution
  const actionDistribution = {};
  auditSummary.byAction.forEach(item => {
    actionDistribution[item.action] = (actionDistribution[item.action] || 0) + 1;
  });

  // Process resource distribution
  const resourceDistribution = {};
  auditSummary.byResource.forEach(item => {
    resourceDistribution[item.resource] = (resourceDistribution[item.resource] || 0) + 1;
  });

  // Process user type distribution
  const userTypeDistribution = {};
  auditSummary.byUserType.forEach(item => {
    userTypeDistribution[item.userType] = (userTypeDistribution[item.userType] || 0) + 1;
  });

  const result = {
    overview: {
      totalActivities: auditSummary.totalActivities,
      uniqueUsers: auditSummary.uniqueUsers.length,
      period: `${days} days`
    },
    distributions: {
      byAction: actionDistribution,
      byResource: resourceDistribution,
      byUserType: userTypeDistribution
    },
    dailyActivity: await getDailyActivity(startDate, filter)
  };

  res.status(200).json(
    new ApiResponse(200, result, "Audit summary fetched successfully")
  );
});

export const searchAuditLogs = asyncHandler(async (req, res) => {
  const { q: searchTerm, page = 1, limit = 20 } = req.query;

  if (!searchTerm) {
    throw new ApiError(400, 'Search term is required');
  }

  const filter = {
    $or: [
      { description: { $regex: searchTerm, $options: 'i' } },
      { resourceType: { $regex: searchTerm, $options: 'i' } },
      { action: { $regex: searchTerm, $options: 'i' } },
      { ipAddress: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  // Apply role-based filtering
  if (req.user.role === 'admin') {
    const centerUsers = await getCenterUserIds(req.user.centerId);
    filter.userId = { $in: centerUsers };
  } else if (req.user.role === 'practitioner') {
    const patientIds = await getPractitionerPatientIds(req.user._id);
    filter.$or = [
      { ...filter.$or[0], userId: req.user._id },
      { ...filter.$or[0], userId: { $in: patientIds } }
    ];
  } else if (req.user.role === 'patient') {
    filter.userId = req.user._id;
  }

  const auditLogs = await AuditLog.find(filter)
    .populate('userId', 'name email')
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      searchTerm,
      auditLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Audit logs search completed successfully")
  );
});

// Helper functions
const getCenterUserIds = async (centerId) => {
  const [patients, practitioners, admins] = await Promise.all([
    Patient.find({}).select('_id'),
    Practitioner.find({ centerId }).select('_id'),
    Admin.find({ centerId }).select('_id')
  ]);

  return [
    ...patients.map(p => p._id),
    ...practitioners.map(p => p._id),
    ...admins.map(a => a._id)
  ];
};

const getPractitionerPatientIds = async (practitionerId) => {
  const sessions = await Session.find({ practitionerId }).select('patientId');
  return [...new Set(sessions.map(s => s.patientId))];
};

const checkPractitionerAccess = async (practitionerId, targetUserId) => {
  if (practitionerId.toString() === targetUserId) return true;
  
  const patientIds = await getPractitionerPatientIds(practitionerId);
  return patientIds.some(pid => pid.toString() === targetUserId);
};

const checkAdminAccess = async (centerId, targetUserId) => {
  const centerUsers = await getCenterUserIds(centerId);
  return centerUsers.some(uid => uid.toString() === targetUserId);
};

const getDailyActivity = async (startDate, baseFilter) => {
  return await AuditLog.aggregate([
    { 
      $match: { 
        ...baseFilter,
        timestamp: { $gte: startDate } 
      } 
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
        },
        count: { $sum: 1 },
        actions: { $push: "$action" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const convertToCSV = (auditLogs) => {
  const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Description', 'IP Address'];
  const csvRows = [headers.join(',')];

  auditLogs.forEach(log => {
    const row = [
      log.timestamp.toISOString(),
      log.userId?.name || 'System',
      log.action,
      log.resourceType,
      `"${log.description?.replace(/"/g, '""') || ''}"`,
      log.ipAddress || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};