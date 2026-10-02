import { listDepartments } from '../services/departmentService.js';

export const getDepartments = async (req, res) => {
  const departments = await listDepartments();
  res.json({ success: true, message: 'Departments fetched', data: { departments } });
};