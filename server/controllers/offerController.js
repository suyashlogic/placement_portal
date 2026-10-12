import * as service from '../services/offerService.js';

const notFound = (res, what = 'Offer') => res.status(404).json({ success: false, message: `${what} not found` });

// One URL, two audiences, decided by the role in the session
export const getOffers = async (req, res) => {
  const offers = req.user.role === 'STUDENT'
    ? await service.listOffersForStudent(req.user.student_id)
    : await service.listOffersForStaff(req.filters.status);
  res.json({ success: true, message: 'Offers fetched', data: { offers } });
};

export const getCandidates = async (req, res) => {
  res.json({ success: true, message: 'Candidates fetched', data: { candidates: await service.listOfferCandidates() } });
};

export const addOffer = async (req, res) => {
  const offer = await service.createOffer(req.user.user_id, req.body);
  if (!offer) return notFound(res, 'Application');
  res.status(201).json({ success: true, message: 'Offer created', data: offer });
};

export const editOffer = async (req, res) => {
  const result = await service.updateOffer(req.user.user_id, req.idParam, req.body);
  if (!result) return notFound(res);
  res.json({ success: true, message: 'Offer updated', data: result });
};

export const decide = async (req, res) => {
  // The student comes from the session, so nobody can answer someone else's offer
  const result = await service.decideOffer(req.user.student_id, req.user.user_id, req.idParam, req.body.decision);
  if (!result) return notFound(res);
  res.json({ success: true, message: `Offer ${result.status.toLowerCase()}`, data: result });
};

export const expire = async (req, res) => {
  const result = await service.expireOffer(req.user.user_id, req.idParam);
  if (!result) return notFound(res);
  res.json({ success: true, message: 'Offer marked as expired', data: result });
};
