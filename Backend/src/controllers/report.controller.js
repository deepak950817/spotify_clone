// controllers/report.controller.js
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');
const Session = require('../models/Session.models');
const Feedback = require('../models/Feedback.models');
const Practitioner = require('../models/Practitioner.models');
const AuditLog = require('../models/AuditLog.models');

// GET /api/admin/reports/export?type=sessions&start=...&end=...
exports.exportCSV = asyncHandler(async (req, res) => {
  const { type, start, end } = req.query;
  const startD = start ? new Date(start) : new Date(0);
  const endD = end ? new Date(end) : new Date();
  if (type === 'sessions') {
    const sessions = await Session.find({ scheduledStart: { $gte: startD, $lte: endD } }).populate('patientId practitionerId');
    // simple CSV generation
    const header = ['sessionId,patientName,practitionerName,start,end,duration,status,therapyType'];
    const rows = sessions.map(s => `${s._id},${s.patientId?.name || ''},${s.practitionerId?.name || ''},${s.scheduledStart.toISOString()},${s.scheduledEnd.toISOString()},${s.durationMinutes},${s.status},${s.therapyType}`);
    const csv = header.concat(rows).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sessions_${Date.now()}.csv"`);
    return res.send(csv);
  } else if (type === 'feedbacks') {
    const feedbacks = await Feedback.find({ createdAt: { $gte: startD, $lte: endD } }).populate('patientId practitionerId');
    const header = ['feedbackId,sessionId,patient,practitioner,overall,comments,createdAt'];
    const rows = feedbacks.map(f => `${f._id},${f.sessionId},${f.patientId?.name || ''},${f.practitionerId?.name || ''},${f.ratings?.overall || ''},"${(f.comments?.additionalComments||'').replace(/"/g,'""')}",${f.createdAt.toISOString()}`);
    const csv = header.concat(rows).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="feedbacks_${Date.now()}.csv"`);
    return res.send(csv);
  } else {
    throw new ApiError(400, 'Unknown export type');
  }
});

// GET /api/admin/feedbacks/report
exports.feedbackSummary = asyncHandler(async (req, res) => {
  const report = await Feedback.aggregate([
    { $group: { _id: '$practitionerId', avgOverall: { $avg: '$ratings.overall' }, count: { $sum: 1 } } },
    { $lookup: { from: 'practitioners', localField: '_id', foreignField: '_id', as: 'pr' } },
    { $unwind: '$pr' },
    { $project: { practitionerName: '$pr.name', avgOverall: 1, count: 1 } }
  ]);
  res.status(200).json(new ApiResponse(200, report));
});
