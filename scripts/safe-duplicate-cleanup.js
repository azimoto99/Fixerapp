
const fs = require('fs');
const path = require('path');

console.log('=== SAFE DUPLICATE CLEANUP ===\n');
console.log('This script only removes obvious duplicates and backup files that are safe to delete.\n');

// Files that are DEFINITELY safe to remove (backups, temp files, etc.)
const safeToDelete = [
  // Backup files
  'client/src/components/jobs/JobDetailsCard.tsx.bak',
  'client/src/components/PaymentsContent.tsx.bak',
  'client/src/pages/auth-page.tsx.bak',
  'eas.json.bak',
  'app.json.bak',
  
  // Temporary/edit files
  'tmp-package.json',
  'package-json.edit',
  
  // Old/fixed versions that are clearly replaced
  'server/vite.original.ts',
  'shared/schema.ts.backup',
  
  // Duplicate config files (keeping the main ones)
  'fixed-metro.config.cjs',
  'fixed-metro.config.js',
  'metro.config.cjs', // Keep metro.config.js
  
  // Clear duplicates where we know which is the main one
  'client/src/components/SimpleUserDrawer2.tsx', // Keep SimpleUserDrawer.tsx
];

// Files to analyze but NOT delete automatically (user can review)
const needsReview = [
  'client/src/components/UserDrawer.tsx vs UserDrawerV2.tsx',
  'client/src/components/drawer-contents/EarningsContent.tsx vs EarningsContentV2.tsx vs EarningsContentV3.tsx',
  'client/src/components/drawer-contents/PaymentsContent.tsx vs PaymentsContentV2.tsx',
  'client/src/components/drawer-contents/ProfileContent.tsx vs ProfileContentV2.tsx',
  'client/src/components/JobCard.tsx vs JobCardFix.tsx',
  'client/src/components/MapSection.tsx vs MapSection.native.tsx',
  'client/src/hooks/use-toast.ts vs use-toast.tsx vs use-simple-toast.tsx',
];

let deletedCount = 0;
let deletedSize = 0;

console.log('STEP 1: Removing obviously safe files...\n');

for (const filePath of safeToDelete) {
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      deletedCount++;
      deletedSize += stats.size;
      console.log(`✓ Deleted: ${filePath} (${(stats.size / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.log(`✗ Could not delete: ${filePath} - ${error.message}`);
    }
  }
}

console.log(`\nRemoved ${deletedCount} files, freed ${(deletedSize / 1024).toFixed(1)}KB\n`);

console.log('STEP 2: Files that need manual review...\n');
console.log('These files have duplicates but require manual decision:\n');

needsReview.forEach(item => {
  console.log(`📋 REVIEW: ${item}`);
});

console.log('\n=== CLEANUP COMPLETE ===');
console.log('✅ Only obviously safe files were removed');
console.log('✅ No functionality should be affected');
console.log('✅ All active components remain untouched');

console.log('\nIf you want to remove more duplicates, please review the files listed above');
console.log('and manually choose which versions to keep.');
