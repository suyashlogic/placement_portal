import * as service from '../services/placementService.js';

export const getOverview = async (req, res) => {
  res.json({ success: true, message: 'Placements fetched', data: await service.listPlacementsOverview() });
};

export const getMine = async (req, res) => {
  const placement = await service.getMyPlacement(req.user.student_id);
  res.json({ success: true, message: 'Placement status fetched', data: { placement } });
};

export const addPlacement = async (req, res) => {
  const result = await service.confirmPlacement(req.user.user_id, req.body);
  if (!result) return res.status(404).json({ success: false, message: 'Offer not found' });
  res.status(201).json({ success: true, message: 'Placement confirmed', data: result });
};

export const setStatus = async (req, res) => {
  const result = await service.markJoined(req.user.user_id, req.idParam);
  if (!result) return res.status(404).json({ success: false, message: 'Placement not found' });
  res.json({ success: true, message: 'Marked as joined', data: result });
};
