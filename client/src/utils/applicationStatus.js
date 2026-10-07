// These lists only decide which buttons to SHOW. The database trigger is the real enforcer.
export const STAGES = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'OFFERED', 'PLACED'];

export const STUDENT_CAN_WITHDRAW = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED'];

// Next statuses an officer can set by hand (OFFERED and PLACED come from the offer module later)
export const STAFF_NEXT = {
  APPLIED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['SHORTLISTED', 'REJECTED'],
  SHORTLISTED: ['INTERVIEW', 'REJECTED'],
  INTERVIEW: ['SELECTED', 'REJECTED'],
  SELECTED: ['REJECTED'],
  OFFERED: [], PLACED: [], REJECTED: [], WITHDRAWN: [],
};

export const ALL_STATUSES = [...STAGES, 'REJECTED', 'WITHDRAWN'];
export const label = (status) => status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
