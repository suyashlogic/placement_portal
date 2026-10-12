// One function per email. Each returns a content model (see emailLayout.js).
// No database access and no sending in here: just words. Business logic never builds HTML.

const first = (name) => String(name || 'there').trim().split(' ')[0];
const lpa = (n) => `₹${Number(n)} LPA`;

// "YYYY-MM-DD" text -> "1 Jul 2027" (built from parts so no time zone can shift the day)
const day = (value) => {
  if (!value) return 'To be announced';
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const ROUND_TYPES = {
  APTITUDE: 'Aptitude test', CODING: 'Coding test', TECHNICAL: 'Technical interview',
  HR: 'HR interview', GROUP_DISCUSSION: 'Group discussion',
};

export const templates = {
  test: () => ({
    subject: 'Placement Portal: test email',
    heading: 'Email is working',
    paragraphs: ['This is a test message from the Placement Cell Portal. If you can read it, your email settings are correct.'],
  }),

  welcome: ({ name }) => ({
    subject: 'Welcome to the Placement Cell Portal',
    heading: `Welcome, ${first(name)}!`,
    paragraphs: [
      'Your student account is ready. Complete your profile, add your skills and upload your resume so the portal can match you with placement drives.',
    ],
    cta: { label: 'Complete my profile', path: '/student/profile' },
  }),

  applicationSubmitted: ({ name, driveTitle, applicationId }) => ({
    subject: `Application received: ${driveTitle}`,
    heading: 'Your application is in',
    paragraphs: [`Hi ${first(name)}, we received your application. You will be notified as it moves through the process.`],
    details: [['Drive', driveTitle]],
    cta: { label: 'Track my application', path: `/student/applications/${applicationId}` },
  }),

  shortlisted: ({ name, driveTitle, applicationId }) => ({
    subject: `You have been shortlisted: ${driveTitle}`,
    heading: 'Congratulations, you are shortlisted!',
    paragraphs: [`Hi ${first(name)}, you have been shortlisted. Round details will follow soon, so keep an eye on your inbox.`],
    details: [['Drive', driveTitle]],
    cta: { label: 'View my application', path: `/student/applications/${applicationId}` },
  }),

  roundScheduled: ({ name, driveTitle, roundNumber, roundName, roundType, when, location, updated, applicationId }) => ({
    subject: `${updated ? 'Round updated' : 'Round scheduled'}: ${roundName} (${driveTitle})`,
    heading: updated ? 'Your round has been updated' : 'Your next round is scheduled',
    paragraphs: [`Hi ${first(name)}, ${updated ? 'the details of' : 'here are the details for'} round ${roundNumber}. Please be on time.`],
    details: [
      ['Drive', driveTitle],
      ['Round', `${roundNumber}. ${roundName}`],
      ['Type', ROUND_TYPES[roundType] || roundType],
      ['When', when || 'To be announced'],
      ['Where', location || 'To be announced'],
    ],
    cta: { label: 'View round details', path: `/student/applications/${applicationId}` },
  }),

  roundResult: ({ name, driveTitle, roundNumber, roundName, result, applicationId }) => {
    const passed = result === 'PASSED';
    return {
      subject: `Round ${roundNumber} result: ${driveTitle}`,
      heading: passed ? 'You cleared the round!' : 'Round result',
      paragraphs: [
        passed
          ? `Hi ${first(name)}, well done. You passed round ${roundNumber}. We will share the next steps shortly.`
          : `Hi ${first(name)}, unfortunately you did not clear round ${roundNumber}${result === 'ABSENT' ? ' (marked absent)' : ''}, so your application for this drive is closed. Please keep applying to other drives.`,
      ],
      details: [['Drive', driveTitle], ['Round', `${roundNumber}. ${roundName}`], ['Result', result.charAt(0) + result.slice(1).toLowerCase()]],
      cta: { label: 'View my application', path: `/student/applications/${applicationId}` },
    };
  },

  selected: ({ name, driveTitle, applicationId }) => ({
    subject: `You have been selected: ${driveTitle}`,
    heading: 'Congratulations, you are selected!',
    paragraphs: [`Hi ${first(name)}, you have been selected. An offer from the company will follow once the placement cell processes it.`],
    details: [['Drive', driveTitle]],
    cta: { label: 'View my application', path: `/student/applications/${applicationId}` },
  }),

  applicationClosed: ({ name, driveTitle, applicationId }) => ({
    subject: `Application update: ${driveTitle}`,
    heading: 'An update on your application',
    paragraphs: [`Hi ${first(name)}, thank you for applying. Unfortunately your application for this drive was not successful. Other drives are open, so keep going!`],
    details: [['Drive', driveTitle]],
    cta: { label: 'Browse other drives', path: '/student/drives' },
  }),

  offerCreated: ({ name, companyName, driveTitle, packageLpa, joiningDate, remarks, updated }) => ({
    subject: `${updated ? 'Your offer was updated' : 'You have an offer'} from ${companyName}`,
    heading: updated ? 'Your offer was updated' : 'You have received an offer!',
    paragraphs: [
      `Hi ${first(name)}, ${companyName} has ${updated ? 'updated your offer' : 'made you an offer'}. Please review it and accept or reject it in the portal.`,
      ...(remarks ? [`Note from the placement cell: ${remarks}`] : []),
    ],
    details: [['Company', companyName], ['Drive', driveTitle], ['Package', lpa(packageLpa)], ['Joining date', day(joiningDate)]],
    cta: { label: 'Review my offer', path: '/student/offers' },
  }),

  offerClosed: ({ name, companyName }) => ({
    subject: `Your offer from ${companyName} has expired`,
    heading: 'Your offer has expired',
    paragraphs: [`Hi ${first(name)}, the offer from ${companyName} was not answered in time and has expired, so the application is closed.`],
    cta: { label: 'Browse drives', path: '/student/drives' },
  }),

  placementConfirmed: ({ name, companyName, jobTitle, finalPackageLpa, joiningDate }) => ({
    subject: `Placement confirmed: ${companyName}`,
    heading: 'Congratulations, you are placed!',
    paragraphs: [`Hi ${first(name)}, your placement has been confirmed. All the best for your career.`],
    details: [['Company', companyName], ['Role', jobTitle], ['Final package', lpa(finalPackageLpa)], ['Joining date', day(joiningDate)]],
    cta: { label: 'View my placement', path: '/student/placement' },
  }),

  newDrive: ({ name, driveId, driveTitle, companyName, jobTitle, deadline, packageRange }) => ({
    subject: `New placement drive: ${companyName}`,
    heading: 'A new drive is open for you',
    paragraphs: [`Hi ${first(name)}, a new placement drive is open and you meet its eligibility requirements.`],
    details: [['Company', companyName], ['Role', jobTitle], ['Drive', driveTitle], ['Package', packageRange], ['Apply by', deadline]],
    cta: { label: 'View drive and apply', path: `/student/drives/${driveId}` },
  }),

  deadlineReminder: ({ name, driveId, driveTitle, companyName, deadline }) => ({
    subject: `Reminder: applications for ${companyName} close soon`,
    heading: 'Applications close soon',
    paragraphs: [`Hi ${first(name)}, you are eligible for this drive but have not applied yet. Applications close soon.`],
    details: [['Company', companyName], ['Drive', driveTitle], ['Closes', deadline]],
    cta: { label: 'Apply now', path: `/student/drives/${driveId}` },
  }),
};
