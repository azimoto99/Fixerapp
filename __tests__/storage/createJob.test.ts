import { describe, expect, it } from '@jest/globals';
import { testDb } from '../../tests/setup';
import { Storage } from '../../server/storage/DatabaseStorageV2';

// @ts-nocheck

describe('Storage.createJob', () => {
  it('inserts a job row', async () => {
    const job = await Storage.createJob({
      title: 'Test Job',
      description: 'Fix something',
      category: 'Other',
      posterId: 1,
      paymentType: 'fixed',
      paymentAmount: 100,
      totalAmount: 100,
      latitude: 0,
      longitude: 0,
      location: 'Nowhere',
      dateNeeded: new Date(),
      requiredSkills: [],
      equipmentProvided: false,
      autoAccept: false,
      status: 'open'
    });

    expect(job.id).toBeDefined();
    const rows = await testDb.query.jobs.findMany();
    expect(rows.length).toBe(1);
  });
}); 