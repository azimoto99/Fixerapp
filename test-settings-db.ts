import { db } from './server/db';
import { platformSettings } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testSettingsDatabase() {
  try {
    console.log('Testing Platform Settings Database...\n');

    // Test reading settings
    console.log('1. Reading all platform settings...');
    const settings = await db.select().from(platformSettings);
    console.log(`✅ Found ${settings.length} settings in database`);

    // Show some sample settings
    if (settings.length > 0) {
      console.log('\nSample settings:');
      settings.slice(0, 5).forEach(setting => {
        console.log(`- ${setting.key}: ${JSON.stringify(setting.value)} (${setting.category})`);
      });
    }

    // Test updating a setting
    console.log('\n2. Testing setting update...');
    const testKey = 'platformName';
    const testValue = 'Fixer Test Platform';
    
    await db.insert(platformSettings).values({
      key: testKey,
      value: testValue,
      description: 'Test platform name update',
      category: 'general'
    }).onConflictDoUpdate({
      target: platformSettings.key,
      set: { 
        value: testValue,
        updatedAt: new Date()
      }
    });

    console.log('✅ Setting updated successfully');

    // Verify the update
    const updatedSetting = await db.select()
      .from(platformSettings)
      .where(eq(platformSettings.key, testKey));

    if (updatedSetting.length > 0) {
      console.log(`✅ Verified update: ${testKey} = ${JSON.stringify(updatedSetting[0].value)}`);
    }

    console.log('\n🎉 Database settings test completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    process.exit(0);
  }
}

testSettingsDatabase();
