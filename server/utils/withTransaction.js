import { getClient } from '../config/db.js';

// Runs work(client) inside BEGIN ... COMMIT. Any error triggers ROLLBACK, so
// multi-step changes either all happen or none happen (atomicity).
//
// AFTER-COMMIT HOOKS: work() may call client.afterCommit(fn). Those functions run only if
// COMMIT succeeds (they are thrown away on ROLLBACK). Use this for side effects that must
// never happen for a change that did not really happen, such as sending an email.
// Hooks run in the background: they do not delay the response, and a failing hook is only
// logged, so it can never undo the transaction that already committed.
export const withTransaction = async (work) => {
  const client = await getClient();
  const hooks = [];
  client.afterCommit = (fn) => hooks.push(fn);

  let result;
  try {
    await client.query('BEGIN');
    result = await work(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    delete client.afterCommit;   // pooled clients are reused: leave no hooks behind
    client.release();
  }

  // Only reached after a successful COMMIT
  for (const hook of hooks) {
    Promise.resolve()
      .then(hook)
      .catch((err) => console.error('After-commit hook failed:', err.message));
  }
  return result;
};
