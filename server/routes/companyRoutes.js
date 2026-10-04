import express from 'express';
import * as c from '../controllers/companyController.js';
import { authorize } from '../middleware/roleMiddleware.js';
import { validateIdParam, validateCompany } from '../validators/managementValidator.js';

const router = express.Router();
router.use(authorize('PLACEMENT_OFFICER', 'ADMIN'));

router.get('/', c.getCompanies);
router.post('/', validateCompany, c.addCompany);
router.put('/:id', validateIdParam, validateCompany, c.editCompany);

export default router;
