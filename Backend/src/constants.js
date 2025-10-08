export const DB_NAME= "spotify_clone";

export const UserRoles = {
  PATIENT: "patient",
  PRACTITIONER: "practitioner", 
  ADMIN: "admin"
};

export const SessionStatus = {
  BOOKED: "booked",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RESCHEDULED: "rescheduled",
  NO_SHOW: "no_show"
};

export const RescheduleStatus = {
  PENDING: "Pending",
  APPROVED: "Approved", 
  REJECTED: "Rejected",
  CANCELLED: "Cancelled"
};

export const NotificationTypes = {
  SESSION_REMINDER: "session_reminder",
  BOOKING_CONFIRMATION: "booking_confirmation",
  CANCELLATION: "cancellation",
  FEEDBACK_REQUEST: "feedback_request",
  SYSTEM_ALERT: "system_alert",
  PROMOTIONAL: "promotional"
};

export const NotificationChannels = {
  EMAIL: "email",
  SMS: "sms", 
  PUSH: "push",
  IN_APP: "in_app"
};

export const NotificationPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent"
};

export const AuditActions = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update", 
  DELETE: "delete",
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_CHANGE: "password_change",
  RESCHEDULE: "reschedule",
  CANCEL: "cancel"
};

export const TherapyTypes = {
  ABHYANGA: "Abhyanga",
  SHIRODHARA: "Shirodhara",
  PIZHICHIL: "Pizhichil",
  NASYA: "Nasya",
  BASTI: "Basti",
  VAMANA: "Vamana",
  VIRECHANA: "Virechana",
  RAKTAMOKSHANA: "Raktamokshana"
};

export const Gender = {
  MALE: "male",
  FEMALE: "female", 
  OTHER: "other"
};

export const Severity = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

export const ProficiencyLevel = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate", 
  ADVANCED: "advanced"
};