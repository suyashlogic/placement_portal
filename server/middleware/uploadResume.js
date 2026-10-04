import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { RESUME_DIR } from '../utils/uploadPaths.js';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

// First bytes of each real file type
const SIGNATURES = {
  '.pdf': [0x25, 0x50, 0x44, 0x46],  // %PDF
  '.doc': [0xd0, 0xcf, 0x11, 0xe0],  // old Office format
  '.docx': [0x50, 0x4b, 0x03, 0x04], // zip container
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESUME_DIR),
  filename: (req, file, cb) => {
    const random = crypto.randomBytes(8).toString('hex');
    cb(null, `student-${req.user.student_id}-${random}${ALLOWED_TYPES[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error('Only PDF, DOC or DOCX files are allowed'));
  },
});

const fail = (res, message) => res.status(400).json({ success: false, message });

// "resume" is the form field name. React must append the file under the same name.
export const uploadResume = (req, res, next) => {
  upload.single('resume')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return fail(res, err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2 MB)' : 'Invalid upload');
    }
    if (err) return fail(res, err.message);
    if (!req.file) return fail(res, 'Choose a file to upload');

    try {
      const handle = await fs.promises.open(req.file.path, 'r');
      const header = Buffer.alloc(4);
      await handle.read(header, 0, 4, 0);
      await handle.close();

      const signature = SIGNATURES[path.extname(req.file.filename)];
      if (!signature.every((byte, i) => header[i] === byte)) {
        await fs.promises.unlink(req.file.path); // do not keep a fake file
        return fail(res, 'File content does not match its type');
      }
      next();
    } catch (readErr) {
      next(readErr);
    }
  });
};