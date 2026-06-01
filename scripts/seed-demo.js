const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const EXPENSES_PATH = path.join(__dirname, '..', 'data', 'expenses.json');
const GOALS_PATH = path.join(__dirname, '..', 'data', 'goals.json');
const FAMILIES_PATH = path.join(__dirname, '..', 'data', 'families.json');
const RECURRING_PATH = path.join(__dirname,'..','data','recurringAllowances.json');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); }
  catch(e) { return []; }
}
function writeJSON(p, d) {
  fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
}

async function seed() {
  console.log('Seeding demo account...');

  const password = await bcrypt.hash('demo1234', 10);
  const demoId = 'demo-user-001';
  const parentId = 'demo-parent-001';
  const childId = 'demo-child-001';
  const familyId = 'demo-family-001';

  // ── DEMO USER (maya) ──
  const demoUser = {
    id: demoId,
    username: 'maya',
    passwordHash: password,
    email: 'maya@grossmont.edu',
    schoolName: 'Grossmont High School',
    graduationYear: 2028,
    studentStatus: 'Sophomore',
    primaryFinancialGoal: 'Save for AirPods Pro',
    pfp: '/uploads/pfps/default.png',
    monthlyBudgetCap: 200,
    isAdmin: false,
    income: 1200,
    rent: 0,
    phoneBill: 45,
    otherBills: 28,
    diningBudget: 150,
    onboardingComplete: true,
    cancelledSubscriptions: ['netflix'],
    familyGroupId: familyId,
    familyRole: 'child',
    // Mirror into the canonical CP-F01/F02 field names the rest of the
    // codebase actually reads (role, familyId, allocations).
    role: 'child',
    familyId: familyId,
    pendingAllowance: 50,
    allocation: { save: 40, spend: 50, give: 10 },
    allocationStatus: 'confirmed',
    lastGrade: 'A',
    gradeFeedback: 'Amazing job putting 40% into savings! With your AirPods Pro goal in mind, this split will get you there faster than you think. Keep it up!',
    parentNote: 'Great job this week Maya! Remember to track everything, even small purchases.',
    financialProfile: {
      livingSituation: 'with_family_no_bills',
      paysRecurringBills: true,
      billTypes: ['phone', 'streaming'],
      hasIncome: true,
      monthlyIncome: 1200,
      foodSituation: 'cooks',
      hasSubscriptions: true,
      subscriptionDetails: 'Spotify, iCloud ($28/mo)',
      hasSavingsGoal: true,
      savingsGoalName: 'AirPods Pro',
      savingsGoalTarget: 179,
      spendingStyle: 'balanced',
      primaryIntent: 'save_for_goal',
      surveyCompletedAt: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
      surveyLastUpdatedAt: new Date(Date.now() - 7*24*60*60*1000).toISOString()
    }
  };

  // ── DEMO PARENT ──
  const demoParent = {
    id: parentId,
    username: 'parent_demo',
    passwordHash: password,
    email: 'parent@demo.com',
    schoolName: 'N/A',
    graduationYear: 2000,
    studentStatus: 'Senior',
    primaryFinancialGoal: 'Teach kids good money habits',
    pfp: '/uploads/pfps/default.png',
    monthlyBudgetCap: 0,
    isAdmin: false,
    income: 0, rent: 0, phoneBill: 0, otherBills: 0, diningBudget: 0,
    onboardingComplete: true,
    cancelledSubscriptions: [],
    familyGroupId: familyId,
    familyRole: 'parent',
    familyInviteCode: 'DEMO99',
    familyGroupName: "The Demo Family",
    // Canonical fields the real backend reads.
    role: 'parent',
    familyId: familyId,
    // /api/family/members surfaces parent.familyNotes[childId] on each
    // child summary; populate so the parent dashboard shows the notes.
    familyNotes: {
      'demo-user-001':  { message: 'Great job this week Maya! Remember to track everything, even small purchases.', sentAt: new Date(Date.now() - 2*24*60*60*1000).toISOString() },
      'demo-child-001': { message: 'Great job this week! Try to put a little more in savings next time.', sentAt: new Date(Date.now() - 2*24*60*60*1000).toISOString() }
    },
    pendingAllowance: 0,
    allocation: null,
    allocationStatus: 'none',
    lastGrade: null,
    gradeFeedback: null,
    parentNote: null,
    financialProfile: null
  };

  // ── DEMO CHILD (separate from maya for family demo) ──
  const demoChild = {
    id: childId,
    username: 'kid_demo',
    passwordHash: password,
    email: 'kid@demo.com',
    schoolName: 'Grossmont High School',
    graduationYear: 2030,
    studentStatus: 'Freshman',
    primaryFinancialGoal: 'Save for a gaming PC',
    pfp: '/uploads/pfps/default.png',
    monthlyBudgetCap: 100,
    isAdmin: false,
    income: 0, rent: 0, phoneBill: 0, otherBills: 0, diningBudget: 50,
    onboardingComplete: true,
    cancelledSubscriptions: [],
    familyGroupId: familyId,
    familyRole: 'child',
    // Canonical fields the real backend reads.
    role: 'child',
    familyId: familyId,
    pendingAllowance: 0,
    allocation: { save: 30, spend: 60, give: 10 },
    allocationStatus: 'confirmed',
    lastGrade: 'B',
    gradeFeedback: 'Good split! Saving 30% is solid. If you bump it to 35% you could hit your gaming PC goal even sooner.',
    parentNote: 'Great job this week! Try to put a little more in savings next time.',
    financialProfile: {
      livingSituation: 'with_family_no_bills',
      paysRecurringBills: false,
      billTypes: null,
      hasIncome: false,
      monthlyIncome: null,
      foodSituation: 'covered',
      hasSubscriptions: false,
      subscriptionDetails: null,
      hasSavingsGoal: true,
      savingsGoalName: 'Gaming PC',
      savingsGoalTarget: 800,
      spendingStyle: 'balanced',
      primaryIntent: 'save_for_goal',
      surveyCompletedAt: new Date(Date.now() - 3*24*60*60*1000).toISOString(),
      surveyLastUpdatedAt: new Date(Date.now() - 3*24*60*60*1000).toISOString()
    }
  };

  // ── EXPENSES for maya (2 months of data) ──
  const today = new Date();
  function daysAgo(n) {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0,10);
  }

  const expenses = [
    // This month
    {id:'exp_d001',userId:demoId,amount:6.50,category:'Food',merchant:'Boba Guys',date:daysAgo(1),notes:'After school with friends'},
    {id:'exp_d002',userId:demoId,amount:12.00,category:'Food',merchant:'Pizza with friends',date:daysAgo(1),notes:''},
    {id:'exp_d003',userId:demoId,amount:2.50,category:'Transport',merchant:'Bus fare',date:daysAgo(2),notes:''},
    {id:'exp_d004',userId:demoId,amount:15.00,category:'Entertainment',merchant:'Movie ticket',date:daysAgo(2),notes:''},
    {id:'exp_d005',userId:demoId,amount:24.90,category:'Shopping',merchant:'UNIQLO t-shirt',date:daysAgo(3),notes:''},
    {id:'exp_d006',userId:demoId,amount:7.25,category:'Coffee',merchant:'Starbucks',date:daysAgo(4),notes:''},
    {id:'exp_d007',userId:demoId,amount:9.99,category:'Subscriptions',merchant:'Spotify',date:daysAgo(5),notes:'Monthly'},
    {id:'exp_d008',userId:demoId,amount:2.99,category:'Subscriptions',merchant:'iCloud',date:daysAgo(5),notes:'Storage'},
    {id:'exp_d009',userId:demoId,amount:18.00,category:'Food',merchant:'Chipotle',date:daysAgo(6),notes:''},
    {id:'exp_d010',userId:demoId,amount:45.00,category:'Shopping',merchant:'Nike shoes',date:daysAgo(8),notes:'On sale'},
    {id:'exp_d011',userId:demoId,amount:3.50,category:'Coffee',merchant:'Dutch Bros',date:daysAgo(9),notes:''},
    {id:'exp_d012',userId:demoId,amount:8.00,category:'Food',merchant:'Subway',date:daysAgo(10),notes:'Lunch'},
    {id:'exp_d013',userId:demoId,amount:15.49,category:'Subscriptions',merchant:'Netflix',date:daysAgo(11),notes:''},
    {id:'exp_d014',userId:demoId,amount:2.50,category:'Transport',merchant:'Bus fare',date:daysAgo(12),notes:''},
    // Last month (for recurring detection)
    {id:'exp_d015',userId:demoId,amount:9.99,category:'Subscriptions',merchant:'Spotify',date:daysAgo(35),notes:'Monthly'},
    {id:'exp_d016',userId:demoId,amount:2.99,category:'Subscriptions',merchant:'iCloud',date:daysAgo(35),notes:''},
    {id:'exp_d017',userId:demoId,amount:15.49,category:'Subscriptions',merchant:'Netflix',date:daysAgo(36),notes:''},
    {id:'exp_d018',userId:demoId,amount:32.00,category:'Food',merchant:'Chipotle',date:daysAgo(37),notes:''},
    {id:'exp_d019',userId:demoId,amount:7.25,category:'Coffee',merchant:'Starbucks',date:daysAgo(38),notes:''},
    {id:'exp_d020',userId:demoId,amount:2.50,category:'Transport',merchant:'Bus fare',date:daysAgo(40),notes:''},
    {id:'exp_d021',userId:demoId,amount:18.00,category:'Shopping',merchant:'UNIQLO t-shirt',date:daysAgo(42),notes:''},
    // Two months ago (for recurring detection - 3rd month)
    {id:'exp_d022',userId:demoId,amount:9.99,category:'Subscriptions',merchant:'Spotify',date:daysAgo(65),notes:'Monthly'},
    {id:'exp_d023',userId:demoId,amount:2.99,category:'Subscriptions',merchant:'iCloud',date:daysAgo(65),notes:''},
    {id:'exp_d024',userId:demoId,amount:15.49,category:'Subscriptions',merchant:'Netflix',date:daysAgo(66),notes:''},
    // Kid demo expenses
    {id:'exp_d025',userId:childId,amount:5.00,category:'Food',merchant:'School lunch',date:daysAgo(1),notes:''},
    {id:'exp_d026',userId:childId,amount:15.00,category:'Entertainment',merchant:'Steam game',date:daysAgo(5),notes:''},
    {id:'exp_d027',userId:childId,amount:8.00,category:'Food',merchant:'McDonald\'s',date:daysAgo(8),notes:''},
  ];

  // ── GOALS for maya ──
  const goals = [
    {
      id:'goal_d001',
      userId:demoId,
      title:'AirPods Pro',
      targetAmount:179,
      currentSaved:89,
      deadline:new Date(Date.now()+14*24*60*60*1000).toISOString().slice(0,10),
      createdFromSurvey:true
    },
    {
      id:'goal_d002',
      userId:demoId,
      title:'Tyler the Creator concert',
      targetAmount:120,
      currentSaved:45,
      deadline:new Date(Date.now()+73*24*60*60*1000).toISOString().slice(0,10)
    },
    {
      id:'goal_d003',
      userId:demoId,
      title:'First car fund',
      targetAmount:2500,
      currentSaved:100,
      deadline:new Date(Date.now()+366*24*60*60*1000).toISOString().slice(0,10)
    },
    // Kid goal
    {
      id:'goal_d004',
      userId:childId,
      title:'Gaming PC',
      targetAmount:800,
      currentSaved:120,
      deadline:new Date(Date.now()+180*24*60*60*1000).toISOString().slice(0,10),
      createdFromSurvey:true
    }
  ];

  // ── FAMILY ──
  const families = [
    {
      id: familyId,
      name: "The Demo Family",
      inviteCode: 'DEMO99',
      parentId: parentId,
      childIds: [demoId, childId],
      createdAt: new Date(Date.now()-14*24*60*60*1000).toISOString()
    }
  ];

  // ── RECURRING ALLOWANCES ──
  const recurring = [
    {
      id: 'ra_demo001',
      parentId: parentId,
      childId: demoId,
      amount: 50,
      type: 'weekly',
      nextSendAt: new Date(Date.now()+7*24*60*60*1000).toISOString(),
      createdAt: new Date(Date.now()-7*24*60*60*1000).toISOString()
    }
  ];

  // ── WRITE ALL DATA ──
  // Merge with existing users (don't wipe real accounts)
  let users = readJSON(USERS_PATH);
  // Remove old demo accounts if they exist — match BOTH by id and by
  // username so stale rows from earlier tests with drifted ids don't
  // shadow the freshly seeded ones (which would leave expenses/goals
  // orphaned against an inaccessible userId).
  users = users.filter(u =>
    !['demo-user-001','demo-parent-001','demo-child-001'].includes(u.id) &&
    !['maya','parent_demo','kid_demo'].includes(u.username)
  );
  users.push(demoUser, demoParent, demoChild);
  writeJSON(USERS_PATH, users);

  // Merge expenses
  let allExpenses = readJSON(EXPENSES_PATH);
  allExpenses = allExpenses.filter(e => !e.id.startsWith('exp_d'));
  allExpenses = [...allExpenses, ...expenses];
  writeJSON(EXPENSES_PATH, allExpenses);

  // Merge goals
  let allGoals = readJSON(GOALS_PATH);
  allGoals = allGoals.filter(g => !g.id.startsWith('goal_d'));
  allGoals = [...allGoals, ...goals];
  writeJSON(GOALS_PATH, allGoals);

  // Families
  let allFamilies = readJSON(FAMILIES_PATH);
  allFamilies = allFamilies.filter(f => f.id !== familyId);
  allFamilies.push(...families);
  writeJSON(FAMILIES_PATH, allFamilies);

  // Recurring
  let allRecurring = readJSON(RECURRING_PATH);
  allRecurring = allRecurring.filter(r => !r.id.startsWith('ra_demo'));
  allRecurring.push(...recurring);
  writeJSON(RECURRING_PATH, allRecurring);

  console.log('✅ Demo accounts seeded successfully!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Student:  username=maya        password=demo1234');
  console.log('  Parent:   username=parent_demo password=demo1234');
  console.log('  Child:    username=kid_demo    password=demo1234');
  console.log('  Family invite code: DEMO99');
  console.log('');
  console.log('Features populated:');
  console.log('  ✓ 27 expenses across 3 months (triggers recurring detection)');
  console.log('  ✓ 3 savings goals with velocity data');
  console.log('  ✓ Completed financial survey');
  console.log('  ✓ Family group with parent + 2 children');
  console.log('  ✓ Weekly recurring allowance scheduled');
  console.log('  ✓ AI grade A on allocation');
  console.log('  ✓ Netflix marked as cancelled');
  console.log('  ✓ Parent note from parent_demo');
}

seed().catch(console.error);
