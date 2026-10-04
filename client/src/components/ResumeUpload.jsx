import { useState, useRef } from 'react';
import { uploadResume, downloadResume } from '../services/studentService';
import { getErrorMessage } from '../utils/getErrorMessage';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

function ResumeUpload({ resumePath, onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const handlePick = (e) => {
    const picked = e.target.files[0] || null;
    setError('');
    setSuccess('');
    setFile(null);
    if (!picked) return;

    const ext = picked.name.slice(picked.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return setError('Choose a PDF, DOC or DOCX file');
    if (picked.size > MAX_BYTES) return setError('File is too large (max 2 MB)');
    setFile(picked);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      await uploadResume(file);
      setSuccess('Resume uploaded successfully');
      setFile(null);
      inputRef.current.value = ''; // clear the file input
      onUploaded();                // parent refetches the profile
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    setError('');
    try {
      const blob = await downloadResume();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume${resumePath.slice(resumePath.lastIndexOf('.'))}`;
      link.click();
      URL.revokeObjectURL(url); // free the memory
    } catch {
      setError('Could not download your resume');
    }
  };

  return (
    <div className="card mt-3">
      <div className="card-body">
        <h6 className="mb-3">Resume</h6>

        {resumePath ? (
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="small"><i className="bi bi-file-earmark-text text-success me-2"></i>Resume on file</span>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleDownload}>
              <i className="bi bi-download me-1"></i>Download
            </button>
          </div>
        ) : (
          <div className="small text-muted mb-3">No resume uploaded yet.</div>
        )}

        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {success && <div className="alert alert-success py-2 small">{success}</div>}

        <input ref={inputRef} type="file" className="form-control mb-2"
          accept=".pdf,.doc,.docx" onChange={handlePick} />
        <div className="form-text mb-2">PDF, DOC or DOCX, up to 2 MB.</div>
        <button type="button" className="btn btn-primary w-100"
          disabled={!file || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading...' : resumePath ? 'Replace resume' : 'Upload resume'}
        </button>
      </div>
    </div>
  );
}
export default ResumeUpload;