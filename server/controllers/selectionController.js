import * as service from '../services/selectionService.js';

const notFound = (res, what) => res.status(404).json({ success: false, message: `${what} not found` });

export const getBoard = async (req, res) => {
  const board = await service.getSelectionBoard(req.idParam);
  if (!board) return notFound(res, 'Drive');
  res.json({ success: true, message: 'Selection board fetched', data: board });
};

export const addRound = async (req, res) => {
  const { applicationId, ...round } = req.body;
  const result = await service.createRound(req.user.user_id, { applicationId, ...round });
  if (!result) return notFound(res, 'Application');
  res.status(201).json({ success: true, message: `Round ${result.roundNumber} added`, data: result });
};

export const addRoundForDrive = async (req, res) => {
  const result = await service.createRoundForDrive(req.user.user_id, req.idParam, req.body);
  if (!result) return notFound(res, 'Drive');
  res.status(201).json({ success: true, message: `Round created for ${result.created} candidate(s)`, data: result });
};

export const editRound = async (req, res) => {
  const result = await service.updateRound(req.user.user_id, req.idParam, req.body);
  if (!result) return notFound(res, 'Round');
  res.json({ success: true, message: 'Round updated', data: result });
};

export const setResult = async (req, res) => {
  const result = await service.recordResult(req.user.user_id, req.idParam, req.body);
  if (!result) return notFound(res, 'Round');
  res.json({ success: true, message: 'Result recorded', data: result });
};

export const shortlist = async (req, res) => {
  const result = await service.shortlistApplications(req.user.user_id, req.body.applicationIds);
  res.json({ success: true, message: `${result.shortlisted} application(s) shortlisted`, data: result });
};
