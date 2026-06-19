import {
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';

describe('Firestore Security Rules Complete Verification Spec', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'gym-management-system-security-spec',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  // Helper to seed database entries without rules checks
  async function seedDoc(collection: string, docId: string, data: any) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection(collection).doc(docId).set(data);
    });
  }

  // --- Scenario 1: Gym A reads Gym A member (ALLOW) ---
  it('Scenario 1: Gym A reads Gym A member (ALLOW)', async () => {
    const userId = 'owner_gym_a';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_a', {
      gymId: 'gym_a',
      name: 'Jane Doe',
      branchId: 'branch_main'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_a');

    await expect(docRef.get()).resolves.toBeDefined();
  });

  // --- Scenario 2: Gym A reads Gym B member (BLOCK) ---
  it('Scenario 2: Gym A reads Gym B member (BLOCK)', async () => {
    const userId = 'owner_gym_a';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_b', {
      gymId: 'gym_b',
      name: 'John Smith',
      branchId: 'branch_other'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_b');

    await expect(docRef.get()).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 3: Gym A updates Gym A member (ALLOW) ---
  it('Scenario 3: Gym A updates Gym A member (ALLOW)', async () => {
    const userId = 'owner_gym_a';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_a', {
      gymId: 'gym_a',
      name: 'Jane Doe',
      branchId: 'branch_main'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_a');

    await expect(docRef.update({ name: 'Jane Updated' })).resolves.not.toThrow();
  });

  // --- Scenario 4: Gym A updates Gym B member (BLOCK) ---
  it('Scenario 4: Gym A updates Gym B member (BLOCK)', async () => {
    const userId = 'owner_gym_a';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_b', {
      gymId: 'gym_b',
      name: 'John Smith',
      branchId: 'branch_other'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_b');

    await expect(docRef.update({ name: 'John Updated' })).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 5: Gym A changes gymId field (BLOCK) ---
  it('Scenario 5: Gym A changes gymId field (BLOCK)', async () => {
    const userId = 'owner_gym_a';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_a', {
      gymId: 'gym_a',
      name: 'Jane Doe',
      branchId: 'branch_main'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_a');

    // Attempt to change gymId to 'gym_b' - should fail
    await expect(docRef.update({ gymId: 'gym_b' })).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 6: Suspended user reads data (BLOCK) ---
  it('Scenario 6: Suspended user reads data (BLOCK)', async () => {
    const userId = 'suspended_owner';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Suspended'
    });
    await seedDoc('members', 'member_gym_a', {
      gymId: 'gym_a',
      name: 'Jane Doe',
      branchId: 'branch_main'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_a');

    await expect(docRef.get()).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 7: Suspended user writes data (BLOCK) ---
  it('Scenario 7: Suspended user writes data (BLOCK)', async () => {
    const userId = 'suspended_owner';
    await seedDoc('users', userId, {
      role: 'gym_owner',
      gymId: 'gym_a',
      accountStatus: 'Suspended'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const collRef = db.collection('members');

    await expect(
      collRef.add({
        gymId: 'gym_a',
        name: 'John Doe',
        branchId: 'branch_main'
      })
    ).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 8: Trainer accesses unauthorized branch (BLOCK) ---
  it('Scenario 8: Trainer accesses unauthorized branch (BLOCK)', async () => {
    const userId = 'trainer_branch_a';
    await seedDoc('users', userId, {
      role: 'trainer',
      gymId: 'gym_a',
      branchId: 'branch_a',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_branch_b', {
      gymId: 'gym_a',
      name: 'Branch B member',
      branchId: 'branch_b'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_branch_b');

    // Access to member in branch_b should be denied to trainer of branch_a
    await expect(docRef.get()).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 9: Staff modifies employee role (BLOCK) ---
  it('Scenario 9: Staff modifies employee role (BLOCK)', async () => {
    const userId = 'staff_user';
    await seedDoc('users', userId, {
      role: 'staff',
      gymId: 'gym_a',
      accountStatus: 'Active'
    });
    await seedDoc('employees', 'employee_record', {
      gymId: 'gym_a',
      fullName: 'Alex Staff',
      role: 'staff'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('employees').doc('employee_record');

    // Attempting to change own/other employee record role to gym_owner should fail
    await expect(docRef.update({ role: 'gym_owner' })).rejects.toThrow(/permission-denied/);
  });

  // --- Scenario 10: Super Admin accesses all gyms (ALLOW) ---
  it('Scenario 10: Super Admin accesses all gyms (ALLOW)', async () => {
    const userId = 'admin_user';
    await seedDoc('users', userId, {
      role: 'super_admin',
      accountStatus: 'Active'
    });
    await seedDoc('members', 'member_gym_b', {
      gymId: 'gym_b',
      name: 'John Smith',
      branchId: 'branch_other'
    });

    const context = testEnv.authenticatedContext(userId);
    const db = context.firestore();
    const docRef = db.collection('members').doc('member_gym_b');

    await expect(docRef.get()).resolves.toBeDefined();
  });
});
