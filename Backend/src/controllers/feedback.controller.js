import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Feedback from '../models/Feedback.models.js';
import Session from '../models/Session.models.js';
import Patient from '../models/Patient.models.js';
import Practitioner from '../models/Practitioner.models.js';
import AuditLog from '../models/AuditLog.models.js';

export const createFeedback = asyncHandler(async (req, res) => {
  const { sessionId, ratings, comments, anonymous } = req.body;


  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  // Check if session is completed
  if (session.status !== 'completed') {
    throw new ApiError(400, 'Feedback can only be provided for completed sessions');
  }

  // Check if patient is providing feedback for their own session
  if (req.user.role === 'patient' && session.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only provide feedback for your own sessions');
  }

  // Check if feedback already exists for this session
  const existingFeedback = await Feedback.findOne({ sessionId });
  if (existingFeedback) {
    throw new ApiError(400, 'Feedback already provided for this session');
  }

  const feedback = await Feedback.create({
    sessionId,
    patientId: session.patientId,
    practitionerId: session.practitionerId,
    ratings,
    comments,
    anonymous: anonymous || false
  });

  // Update practitioner's average rating
  await updatePractitionerRating(session.practitionerId);

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'create',
    resourceType: 'Feedback',
    centerId: req.user.centerId,
    resourceId: feedback._id,
    description: 'Feedback submitted',
    details: { sessionId, anonymous },
    ipAddress: req.ip
  });

  const createdFeedback = await Feedback.findById(feedback._id)
    .populate('patientId', 'name')
    .populate('practitionerId', 'name')
    .populate('sessionId', 'therapyType scheduledStart');

  res.status(201).json(
    new ApiResponse(201, createdFeedback, "Feedback submitted successfully")
  );
});

export const getAllFeedback = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, practitionerId, patientId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const filter = {};
  if (practitionerId) filter.practitionerId = practitionerId;
  if (patientId) filter.patientId = patientId;

  // For patients, only show their own feedback
  if (req.user.role === 'patient') {
    filter.patientId = req.user._id;
  }

  // For practitioners, only show feedback for their sessions
  if (req.user.role === 'practitioner') {
    filter.practitionerId = req.user._id;
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const feedbacks = await Feedback.find(filter)
    .populate('patientId', 'name')
    .populate('practitionerId', 'name specialization')
    .populate('sessionId', 'therapyType scheduledStart')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Feedback.countDocuments(filter);

  res.status(200).json(
    new ApiResponse(200, {
      feedbacks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Feedback fetched successfully")
  );
});

export const getFeedbackById = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const feedback = await Feedback.findById(feedbackId)
    .populate('patientId', 'name')
    .populate('practitionerId', 'name specialization')
    .populate('sessionId', 'therapyType scheduledStart centerId');

  if (!feedback) throw new ApiError(404, 'Feedback not found');

  // Check permissions
  if (req.user.role === 'patient' && feedback.patientId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  if (req.user.role === 'practitioner' && feedback.practitionerId._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  res.status(200).json(
    new ApiResponse(200, feedback, "Feedback fetched successfully")
  );
});

export const getFeedbackBySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  // Check permissions
  if (req.user.role === 'patient' && session.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }
  if (req.user.role === 'practitioner' && session.practitionerId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  const feedback = await Feedback.findOne({ sessionId })
    .populate('patientId', 'name')
    .populate('practitionerId', 'name specialization');

  if (!feedback) throw new ApiError(404, 'No feedback found for this session');

  res.status(200).json(
    new ApiResponse(200, feedback, "Session feedback fetched successfully")
  );
});

export const getFeedbackByPractitioner = asyncHandler(async (req, res) => {
  const { practitionerId } = req.params;
  const { page = 1, limit = 10, minRating } = req.query;

  // Check if practitioner exists
  const practitioner = await Practitioner.findById(practitionerId);
  if (!practitioner) throw new ApiError(404, 'Practitioner not found');

  const filter = { practitionerId };
  if (minRating) {
    filter['ratings.overall'] = { $gte: parseInt(minRating) };
  }

  // For practitioners, they can only see their own feedback
  if (req.user.role === 'practitioner' && practitionerId !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  const feedbacks = await Feedback.find(filter)
    .populate('patientId', 'name')
    .populate('sessionId', 'therapyType scheduledStart')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Feedback.countDocuments(filter);

  // Calculate average ratings
  const ratingStats = await Feedback.aggregate([
    { $match: { practitionerId: practitioner._id } },
    {
      $group: {
        _id: '$practitionerId',
        averageOverall: { $avg: '$ratings.overall' },
        averageProfessionalism: { $avg: '$ratings.professionalism' },
        averageCleanliness: { $avg: '$ratings.cleanliness' },
        averageEffectiveness: { $avg: '$ratings.effectiveness' },
        averageCommunication: { $avg: '$ratings.communication' },
        totalFeedbacks: { $sum: 1 },
        ratingDistribution: {
          $push: '$ratings.overall'
        }
      }
    }
  ]);

  const stats = ratingStats[0] || {
    averageOverall: 0,
    averageProfessionalism: 0,
    averageCleanliness: 0,
    averageEffectiveness: 0,
    averageCommunication: 0,
    totalFeedbacks: 0,
    ratingDistribution: []
  };

  res.status(200).json(
    new ApiResponse(200, {
      feedbacks,
      stats: {
        averageOverall: Math.round(stats.averageOverall * 10) / 10,
        averageProfessionalism: Math.round(stats.averageProfessionalism * 10) / 10,
        averageCleanliness: Math.round(stats.averageCleanliness * 10) / 10,
        averageEffectiveness: Math.round(stats.averageEffectiveness * 10) / 10,
        averageCommunication: Math.round(stats.averageCommunication * 10) / 10,
        totalFeedbacks: stats.totalFeedbacks,
        ratingDistribution: calculateRatingDistribution(stats.ratingDistribution)
      },
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Practitioner feedback fetched successfully")
  );
});

export const getFeedbackByPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check permissions
  if (req.user.role === 'patient' && patientId !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  const feedbacks = await Feedback.find({ patientId })
    .populate('practitionerId', 'name specialization')
    .populate('sessionId', 'therapyType scheduledStart')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Feedback.countDocuments({ patientId });

  res.status(200).json(
    new ApiResponse(200, {
      feedbacks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Patient feedback fetched successfully")
  );
});

export const updateFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;
  const { ratings, comments } = req.body;

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError(404, 'Feedback not found');

  // Only the patient who created the feedback can update it
  if (feedback.patientId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Access denied');
  }

  // Check if feedback can be updated (within 24 hours)
  const hoursSinceCreation = (new Date() - feedback.createdAt) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    throw new ApiError(400, 'Feedback can only be updated within 24 hours of submission');
  }

  const updatedFeedback = await Feedback.findByIdAndUpdate(
    feedbackId,
    { ratings, comments },
    { new: true, runValidators: true }
  )
    .populate('patientId', 'name')
    .populate('practitionerId', 'name specialization')
    .populate('sessionId', 'therapyType scheduledStart');

  // Update practitioner's average rating
  await updatePractitionerRating(feedback.practitionerId);

  await AuditLog.create({
    userId: req.user._id,
    userModel: 'Patient',
    action: 'update',
    centerId: req.user.centerId,
    resourceType: 'Feedback',
    resourceId: feedbackId,
    description: 'Feedback updated',
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, updatedFeedback, "Feedback updated successfully")
  );
});

export const deleteFeedback = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError(404, 'Feedback not found');

  // Only the patient who created the feedback or admin can delete it
  if (feedback.patientId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Access denied');
  }

  await Feedback.findByIdAndDelete(feedbackId);

  // Update practitioner's average rating
  await updatePractitionerRating(feedback.practitionerId);

  await AuditLog.create({
    userId: req.user._id,
    userModel: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
    action: 'delete',
    resourceType: 'Feedback',
    resourceId: feedbackId,
    description: 'Feedback deleted',
    centerId: req.user.centerId, 
    ipAddress: req.ip
  });

  res.status(200).json(
    new ApiResponse(200, null, "Feedback deleted successfully")
  );
});

export const getFeedbackSummary = asyncHandler(async (req, res) => {
  const { centerId } = req.user;
  const { days = 30 } = req.query;

  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const summary = await Feedback.aggregate([
    {
      $lookup: {
        from: 'sessions',
        localField: 'sessionId',
        foreignField: '_id',
        as: 'session'
      }
    },
    { $unwind: '$session' },
    { $match: { 'session.centerId': centerId, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        averageOverall: { $avg: '$ratings.overall' },
        averageProfessionalism: { $avg: '$ratings.professionalism' },
        averageEffectiveness: { $avg: '$ratings.effectiveness' },
        averageCommunication: { $avg: '$ratings.communication' },
        ratingDistribution: {
          $push: '$ratings.overall'
        },
        feedbackByTherapy: {
          $push: {
            therapy: '$session.therapyType',
            rating: '$ratings.overall'
          }
        }
      }
    }
  ]);

  const feedbackStats = summary[0] || {
    totalFeedbacks: 0,
    averageOverall: 0,
    averageProfessionalism: 0,
    averageEffectiveness: 0,
    averageCommunication: 0,
    ratingDistribution: [],
    feedbackByTherapy: []
  };

  // Calculate therapy-wise averages
  const therapyStats = {};
  feedbackStats.feedbackByTherapy.forEach(item => {
    if (!therapyStats[item.therapy]) {
      therapyStats[item.therapy] = { total: 0, sum: 0, count: 0 };
    }
    therapyStats[item.therapy].sum += item.rating;
    therapyStats[item.therapy].count++;
    therapyStats[item.therapy].total++;
  });

  const therapyAverages = Object.keys(therapyStats).map(therapy => ({
    therapy,
    averageRating: Math.round((therapyStats[therapy].sum / therapyStats[therapy].count) * 10) / 10,
    totalFeedbacks: therapyStats[therapy].total
  }));

  const result = {
    overview: {
      totalFeedbacks: feedbackStats.totalFeedbacks,
      averageOverall: Math.round(feedbackStats.averageOverall * 10) / 10,
      averageProfessionalism: Math.round(feedbackStats.averageProfessionalism * 10) / 10,
      averageEffectiveness: Math.round(feedbackStats.averageEffectiveness * 10) / 10,
      averageCommunication: Math.round(feedbackStats.averageCommunication * 10) / 10,
      ratingDistribution: calculateRatingDistribution(feedbackStats.ratingDistribution)
    },
    therapyBreakdown: therapyAverages
  };

  res.status(200).json(
    new ApiResponse(200, result, "Feedback summary fetched successfully")
  );
});

export const analyzeSentiment = asyncHandler(async (req, res) => {
  const { feedbackId } = req.params;

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError(404, 'Feedback not found');

  // Simple sentiment analysis based on keywords (you can integrate with NLP services)
  const comments = `${feedback.comments.strengths || ''} ${feedback.comments.improvements || ''} ${feedback.comments.additionalComments || ''}`.toLowerCase();

  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'professional', 'helpful', 'effective', 'comfortable', 'clean'];
  const negativeWords = ['bad', 'poor', 'terrible', 'disappointing', 'unprofessional', 'rude', 'dirty', 'uncomfortable', 'ineffective'];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach(word => {
    if (comments.includes(word)) positiveCount++;
  });

  negativeWords.forEach(word => {
    if (comments.includes(word)) negativeCount++;
  });

  let sentiment = 'neutral';
  if (positiveCount > negativeCount) sentiment = 'positive';
  else if (negativeCount > positiveCount) sentiment = 'negative';

  // Extract tags based on keywords
  const tags = [];
  const keywordTags = {
    'professional': 'professionalism',
    'clean': 'cleanliness',
    'effective': 'effectiveness',
    'communication': 'communication',
    'friendly': 'friendliness',
    'knowledgeable': 'expertise',
    'punctual': 'punctuality'
  };

  Object.keys(keywordTags).forEach(keyword => {
    if (comments.includes(keyword)) {
      tags.push(keywordTags[keyword]);
    }
  });

  // Update feedback with analysis
  feedback.tags = [...new Set([...feedback.tags, ...tags])];
  await feedback.save();

  const analysis = {
    sentiment,
    positiveKeywords: positiveCount,
    negativeKeywords: negativeCount,
    tags: feedback.tags,
    confidence: Math.abs(positiveCount - negativeCount) / (positiveCount + negativeCount || 1)
  };

  res.status(200).json(
    new ApiResponse(200, analysis, "Sentiment analysis completed successfully")
  );
});

// Helper function to update practitioner rating
const updatePractitionerRating = async (practitionerId) => {
  const ratingStats = await Feedback.aggregate([
    { $match: { practitionerId } },
    {
      $group: {
        _id: '$practitionerId',
        averageRating: { $avg: '$ratings.overall' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);

  if (ratingStats.length > 0) {
    await Practitioner.findByIdAndUpdate(practitionerId, {
      'ratings.average': Math.round(ratingStats[0].averageRating * 10) / 10,
      'ratings.count': ratingStats[0].totalRatings
    });
  }
};

// Helper function to calculate rating distribution
const calculateRatingDistribution = (ratings) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach(rating => {
    const rounded = Math.round(rating);
    if (rounded >= 1 && rounded <= 5) {
      distribution[rounded]++;
    }
  });
  return distribution;
};