import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { getNotifications, markRead, markAllRead } from '../services/notificationService';
import { getErrorMessage } from '../utils/getErrorMessage';
import { formatDateTime } from '../utils/format';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';

// Shared by students, officers and admins: the server returns only the caller's own notifications.
function Notifications() {
  const { data, loading, error, reload } = useFetch(getNotifications);
  const [actionError, setActionError] = useState('');

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;

  const { notifications, unreadCount } = data;

  const run = async (action) => {
    setActionError('');
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}>
        {unreadCount > 0 && (
          <button className="btn btn-outline-primary" onClick={() => run(markAllRead)}>
            <i className="bi bi-check2-all me-1"></i>Mark all as read
          </button>
        )}
      </PageHeader>

      {actionError && <div className="alert alert-danger">{actionError}</div>}

      <div className="card">
        {notifications.length === 0 ? (
          <EmptyState icon="bi-bell" title="No notifications yet" text="Updates about your applications and drives appear here." />
        ) : (
          <ul className="list-group list-group-flush">
            {notifications.map((n) => (
              <li key={n.notificationId}
                className={`list-group-item d-flex gap-3 py-3 ${n.isRead ? '' : 'bg-primary-subtle bg-opacity-25'}`}>
                <i className={`bi ${n.isRead ? 'bi-bell text-muted' : 'bi-bell-fill text-primary'} fs-5`}></i>
                <div className="flex-grow-1">
                  <div className={n.isRead ? '' : 'fw-semibold'}>{n.title}</div>
                  <div className="small">{n.message}</div>
                  <div className="small text-muted mt-1">{formatDateTime(n.createdAt)}</div>
                </div>
                {!n.isRead && (
                  <button className="btn btn-sm btn-outline-secondary align-self-start"
                    onClick={() => run(() => markRead(n.notificationId))}>
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
export default Notifications;
