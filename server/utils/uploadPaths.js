import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
export const RESUME_DIR = path.join(UPLOADS_ROOT, 'resumes');

fs.mkdirSync(RESUME_DIR, { recursive: true }); // create the folder if it is missing

// relativePath is what we store in the database, e.g. "resumes/student-3-ab12.pdf"
export const deleteUpload = (relativePath) =>
  fs.promises.unlink(path.join(UPLOADS_ROOT, relativePath)).catch(() => {});