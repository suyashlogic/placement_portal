// =====================================================
// CONCURRENCY DEMONSTRATION: run with   npm run demo:concurrency   (from the server folder)
//
// Two database connections act like two users clicking at the same moment. Each scenario shows a
// real problem first, then the PostgreSQL feature that fixes it. It uses two scratch tables
// (concurrency_demo_*) that it creates and drops itself, so your project data is never touched.
// =====================================================
import pool from '../config/db.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const line = (text = '') => console.log(text);
const title = (text) => { line(); line('='.repeat(70)); line(text); line('='.repeat(70)); };

// Two separate connections. A transaction lives on ONE connection, so "two users" = two clients.
const withTwoClients = async (work) => {
  const [a, b] = await Promise.all([pool.connect(), pool.connect()]);
  try { return await work(a, b); } finally { a.release(); b.release(); }
};

const resetAccounts = () =>
  pool.query(`INSERT INTO concurrency_demo_accounts (id, balance) VALUES (1, 100), (2, 100)
              ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance`);
const balance = async (id = 1) =>
  (await pool.query('SELECT balance FROM concurrency_demo_accounts WHERE id = $1', [id])).rows[0].balance;

// ---------------------------------------------------------------------------
// 1. LOST UPDATE: read, think, write back. The classic bug.
// ---------------------------------------------------------------------------
const addTen = async (client, lockRow) => {
  await client.query('BEGIN');
  const { rows } = await client.query(
    `SELECT balance FROM concurrency_demo_accounts WHERE id = 1 ${lockRow ? 'FOR UPDATE' : ''}`);
  await sleep(300);                                   // "thinking time" in application code
  await client.query('UPDATE concurrency_demo_accounts SET balance = $1 WHERE id = 1', [rows[0].balance + 10]);
  await client.query('COMMIT');
};

const lostUpdate = async () => {
  title('1. LOST UPDATE   (two users each add 10 to a balance of 100: the answer must be 120)');

  await resetAccounts();
  await withTwoClients((a, b) => Promise.all([addTen(a, false), addTen(b, false)]));
  line(`  Plain SELECT then UPDATE ........... final balance = ${await balance()}   <- one update was LOST`);

  await resetAccounts();
  await withTwoClients((a, b) => Promise.all([addTen(a, true), addTen(b, true)]));
  line(`  SELECT ... FOR UPDATE .............. final balance = ${await balance()}   <- correct: the second user waited for the row lock`);

  await resetAccounts();
  await withTwoClients((a, b) => Promise.all([
    a.query('UPDATE concurrency_demo_accounts SET balance = balance + 10 WHERE id = 1'),
    b.query('UPDATE concurrency_demo_accounts SET balance = balance + 10 WHERE id = 1'),
  ]));
  line(`  UPDATE ... SET balance = balance+10  final balance = ${await balance()}   <- correct, and the simplest fix when no logic is needed`);
  line('  Used in this project: drive/offer/application changes lock the row with FOR UPDATE first.');
};

// ---------------------------------------------------------------------------
// 2. ISOLATION LEVELS: what does a second read inside one transaction see?
// ---------------------------------------------------------------------------
const readTwice = async (level) => {
  await resetAccounts();
  return withTwoClients(async (reader, writer) => {
    await reader.query(`BEGIN ISOLATION LEVEL ${level}`);
    const first = (await reader.query('SELECT balance FROM concurrency_demo_accounts WHERE id = 1')).rows[0].balance;
    await writer.query('UPDATE concurrency_demo_accounts SET balance = 999 WHERE id = 1');   // commits at once
    const second = (await reader.query('SELECT balance FROM concurrency_demo_accounts WHERE id = 1')).rows[0].balance;
    await reader.query('COMMIT');
    return [first, second];
  });
};

const isolationLevels = async () => {
  title('2. ISOLATION LEVELS   (another user changes the row between my two reads)');
  const [rc1, rc2] = await readTwice('READ COMMITTED');
  line(`  READ COMMITTED  (PostgreSQL default) : first read ${rc1}, second read ${rc2}   <- "non-repeatable read": the answer changed inside my transaction`);
  const [rr1, rr2] = await readTwice('REPEATABLE READ');
  line(`  REPEATABLE READ                      : first read ${rr1}, second read ${rr2}   <- I keep seeing my snapshot`);
  line('  This project runs at READ COMMITTED and protects the rules that matter with row locks, unique');
  line('  constraints and advisory locks (scenarios 1, 3 and 5). Higher levels would need retry logic (scenario 3).');
};

// ---------------------------------------------------------------------------
// 3. SERIALIZATION FAILURE under REPEATABLE READ, and the retry loop it requires
// ---------------------------------------------------------------------------
const retryOnConflict = async (work, maxAttempts = 3) => {
  for (let attempt = 1; ; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const result = await work(client, attempt);
      await client.query('COMMIT');
      return { result, attempt };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      if (err.code !== '40001' || attempt >= maxAttempts) throw err;       // 40001 = serialization_failure
      line(`  attempt ${attempt} failed: "${err.message}"  -> retrying`);
    } finally {
      client.release();
    }
  }
};

const serializationFailure = async () => {
  title('3. SERIALIZATION FAILURE   (REPEATABLE READ refuses to overwrite a row changed after my snapshot)');
  await resetAccounts();
  const slowUser = retryOnConflict(async (client, attempt) => {
    const { rows } = await client.query('SELECT balance FROM concurrency_demo_accounts WHERE id = 1');
    if (attempt === 1) await sleep(500);              // the fast user commits during this pause
    await client.query('UPDATE concurrency_demo_accounts SET balance = $1 WHERE id = 1', [rows[0].balance + 10]);
  });
  await sleep(100);
  await retryOnConflict(async (client) => {
    await client.query('UPDATE concurrency_demo_accounts SET balance = balance + 10 WHERE id = 1');
  });
  const { attempt } = await slowUser;
  line(`  slow user succeeded on attempt ${attempt}; final balance = ${await balance()}   <- both +10 applied, nothing lost`);
  line('  Rule: at REPEATABLE READ or SERIALIZABLE, code MUST be ready to retry error 40001.');
};

// ---------------------------------------------------------------------------
// 4. DEADLOCK: two users lock the same two rows in opposite order
// ---------------------------------------------------------------------------
const lockBoth = async (client, first, second) => {
  await client.query('BEGIN');
  await client.query('SELECT 1 FROM concurrency_demo_accounts WHERE id = $1 FOR UPDATE', [first]);
  await sleep(300);
  await client.query('SELECT 1 FROM concurrency_demo_accounts WHERE id = $1 FOR UPDATE', [second]);
  await client.query('COMMIT');
};
const outcome = (settled) => settled.map((s) => (s.status === 'fulfilled' ? 'finished' : `ABORTED (${s.reason.code}: ${s.reason.message})`));

const deadlock = async () => {
  title('4. DEADLOCK   (each user holds a row the other one needs)');
  await resetAccounts();
  const opposite = await withTwoClients(async (a, b) => {
    const settled = await Promise.allSettled([lockBoth(a, 1, 2), lockBoth(b, 2, 1)]);
    await Promise.all([a.query('ROLLBACK'), b.query('ROLLBACK')]).catch(() => {});
    return settled;
  });
  const [r1, r2] = outcome(opposite);
  line('  Opposite order (1 then 2, and 2 then 1):');
  line(`    user A: ${r1}`);
  line(`    user B: ${r2}`);
  line('    PostgreSQL noticed the circle after about a second and killed one transaction so the other could finish.');

  await resetAccounts();
  const sameOrder = await withTwoClients((a, b) =>
    Promise.allSettled([lockBoth(a, 1, 2), lockBoth(b, 1, 2)]));
  const [s1, s2] = outcome(sameOrder);
  line('  Same order for everyone (always the lower id first):');
  line(`    user A: ${s1}`);
  line(`    user B: ${s2}`);
  line('  Used in this project: every offer/placement function locks the APPLICATION first, then the offer.');
};

// ---------------------------------------------------------------------------
// 5. CHECK-THEN-INSERT RACE: the pattern behind "one open offer per student"
// ---------------------------------------------------------------------------
const giveOffer = async (client, studentId, useAdvisoryLock) => {
  await client.query('BEGIN');
  if (useAdvisoryLock) await client.query('SELECT pg_advisory_xact_lock(9001, $1)', [studentId]);
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM concurrency_demo_offers WHERE student_id = $1', [studentId]);
  if (rows[0].n > 0) { await client.query('ROLLBACK'); return 'refused (student already has an offer)'; }
  await sleep(300);                                   // time between the check and the insert
  await client.query('INSERT INTO concurrency_demo_offers (student_id) VALUES ($1)', [studentId]);
  await client.query('COMMIT');
  return 'offer created';
};

const checkThenInsert = async () => {
  title('5. CHECK-THEN-INSERT RACE   (a student may hold only ONE offer)');
  const count = async (id) => (await pool.query('SELECT COUNT(*)::int AS n FROM concurrency_demo_offers WHERE student_id = $1', [id])).rows[0].n;

  await pool.query('TRUNCATE concurrency_demo_offers');
  const unsafe = await withTwoClients((a, b) => Promise.all([giveOffer(a, 7, false), giveOffer(b, 7, false)]));
  line(`  No lock .................. results: ${unsafe.join(' | ')}`);
  line(`                             offers for student 7 = ${await count(7)}   <- the rule was BROKEN: both checks passed before either insert`);

  await pool.query('TRUNCATE concurrency_demo_offers');
  const safe = await withTwoClients((a, b) => Promise.all([giveOffer(a, 7, true), giveOffer(b, 7, true)]));
  line(`  pg_advisory_xact_lock .... results: ${safe.join(' | ')}`);
  line(`                             offers for student 7 = ${await count(7)}   <- correct: the second user waited, then saw the first offer`);
  line('  Used in this project: validate_offer_insert / validate_placement_insert take this lock per student.');
  line('  Where a UNIQUE constraint can express the rule (one application per student and drive) it is simpler still.');
};

// ---------------------------------------------------------------------------
const main = async () => {
  await pool.query(`
    DROP TABLE IF EXISTS concurrency_demo_accounts, concurrency_demo_offers;
    CREATE TABLE concurrency_demo_accounts (id INT PRIMARY KEY, balance INT NOT NULL);
    CREATE TABLE concurrency_demo_offers (id SERIAL PRIMARY KEY, student_id INT NOT NULL);`);
  try {
    await lostUpdate();
    await isolationLevels();
    await serializationFailure();
    await deadlock();
    await checkThenInsert();
    line();
    line('Done. The scratch tables are being removed.');
  } finally {
    await pool.query('DROP TABLE IF EXISTS concurrency_demo_accounts, concurrency_demo_offers');
    await pool.end();
  }
};

main().catch((err) => { console.error('Demo failed:', err.message); process.exitCode = 1; });
