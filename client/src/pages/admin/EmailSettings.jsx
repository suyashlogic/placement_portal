import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { getEmailStatus, sendTestEmail, runReminders } from '../../services/adminService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import PageHeader from '../../components/PageHeader';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';

function EmailSettings() {
  const { data, loading, error, reload } = useFetch(getEmailStatus);
  const [busy, setBusy] = useState('');                 // which button is working
  const [result, setResult] = useState(null);           // { tone, text }

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const run = async (name, action) => {
    setBusy(name);
    setResult(null);
    try {
      const response = await action();
      setResult({ tone: 'success', text: response.message });
    } catch (err) {
      setResult({ tone: 'danger', text: getErrorMessage(err) });
    } finally {
      setBusy('');
    }
  };

  const dryRun = data.mode === 'dry-run';

  return (
    <>
      <PageHeader title="Email" subtitle="Check your email setup and try it safely" />

      {result && <div className={`alert alert-${result.tone}`}>{result.text}</div>}

      <div className="row g-3">
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Current mode</h6>
                <span className={`badge rounded-pill bg-${dryRun ? 'warning' : 'success'}-subtle text-${dryRun ? 'warning' : 'success'}-emphasis`}>
                  {dryRun ? 'Dry-run (nothing is sent)' : 'SMTP (sending)'}
                </span>
              </div>
              <ul className="list-unstyled small mb-3">
                <li className="mb-1"><span className="text-muted">Server:</span> {data.host ? `${data.host}:${data.port}` : 'not configured'}</li>
                <li><span className="text-muted">From:</span> {data.from}</li>
              </ul>
              {dryRun ? (
                <div className="small text-muted">
                  Emails are built and printed in the server console only. To try real delivery safely, add a fake-inbox
                  SMTP account (Ethereal or Mailtrap) to <code>.env</code> and restart the server.
                </div>
              ) : (
                <div className="small text-muted">Emails are sent through this server. Use a test inbox while developing.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-body">
              <h6>Try it</h6>
              <div className="d-grid gap-2">
                <button className="btn btn-primary" disabled={!!busy} onClick={() => run('test', sendTestEmail)}>
                  <i className="bi bi-send me-2"></i>{busy === 'test' ? 'Sending...' : 'Send a test email to me'}
                </button>
                <button className="btn btn-outline-primary" disabled={!!busy} onClick={() => run('reminders', runReminders)}>
                  <i className="bi bi-alarm me-2"></i>{busy === 'reminders' ? 'Checking...' : 'Run deadline reminders now'}
                </button>
              </div>
              <div className="small text-muted mt-3">
                Reminders go to eligible students who have not applied to drives closing within 24 hours. The server also
                checks automatically every hour, and nobody gets the same reminder twice.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default EmailSettings;
