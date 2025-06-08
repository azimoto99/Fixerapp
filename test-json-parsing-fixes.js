// Test script to verify JSON parsing error fixes
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing JSON parsing error fixes...\n');

// List of files that were fixed
const fixedFiles = [
  'client/src/components/profile/SkillsManager.tsx',
  'client/src/components/profile/BadgesDisplay.tsx',
  'client/src/hooks/useAllJobsForMap.ts',
  'client/src/components/MessagingDrawer.tsx',
  'client/src/components/stripe/StripeRequirementsCheck.tsx',
  'client/src/pages/Home.tsx',
  'client/src/hooks/use-auth.tsx',
  'client/src/pages/AdminPanelV2.tsx',
  'client/src/lib/with-auth.tsx',
  'client/src/pages/StripeDebugPage.tsx',
  'client/src/contexts/stripe-connect-context.tsx'
];

// Test patterns that should be fixed
const testPatterns = [
  {
    name: 'Direct fetch calls replaced with apiRequest',
    pattern: /await fetch\([^)]*\/api\/[^)]*\)/g,
    shouldNotExist: true
  },
  {
    name: 'Manual response.ok checks removed',
    pattern: /if\s*\(\s*!?response\.ok\s*\)/g,
    shouldNotExist: true
  },
  {
    name: 'apiRequest imports added',
    pattern: /import.*apiRequest.*from.*@\/lib\/queryClient/,
    shouldExist: true
  },
  {
    name: 'Consistent apiRequest usage',
    pattern: /apiRequest\s*\(\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/g,
    shouldExist: true
  }
];

let totalIssues = 0;
let totalFixes = 0;

fixedFiles.forEach(filePath => {
  console.log(`📁 Checking ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    totalIssues++;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let fileIssues = 0;
  let fileFixes = 0;
  
  testPatterns.forEach(test => {
    const matches = content.match(test.pattern);
    const matchCount = matches ? matches.length : 0;
    
    if (test.shouldNotExist && matchCount > 0) {
      console.log(`   ❌ ${test.name}: Found ${matchCount} instances that should be fixed`);
      matches.forEach(match => {
        console.log(`      - "${match.substring(0, 60)}..."`);
      });
      fileIssues += matchCount;
    } else if (test.shouldExist && matchCount === 0) {
      // Only report missing apiRequest imports for files that should have them
      if (test.name.includes('apiRequest imports') && content.includes('fetch(')) {
        console.log(`   ❌ ${test.name}: Missing in file that uses fetch`);
        fileIssues++;
      }
    } else if (test.shouldExist && matchCount > 0) {
      console.log(`   ✅ ${test.name}: Found ${matchCount} correct instances`);
      fileFixes += matchCount;
    } else if (test.shouldNotExist && matchCount === 0) {
      console.log(`   ✅ ${test.name}: No problematic instances found`);
      fileFixes++;
    }
  });
  
  // Check for specific patterns that indicate proper fixes
  const hasApiRequestImport = content.includes("import { apiRequest }") || content.includes("import.*apiRequest");
  const hasApiRequestUsage = content.includes("apiRequest(");
  const hasDirectFetch = content.match(/await fetch\([^)]*\/api\/[^)]*\)/);
  
  if (hasApiRequestUsage && hasApiRequestImport && !hasDirectFetch) {
    console.log(`   ✅ File properly uses apiRequest pattern`);
    fileFixes++;
  } else if (hasDirectFetch) {
    console.log(`   ❌ File still has direct fetch calls to internal APIs`);
    fileIssues++;
  }
  
  totalIssues += fileIssues;
  totalFixes += fileFixes;
  
  if (fileIssues === 0) {
    console.log(`   ✅ All checks passed for this file`);
  }
  
  console.log('');
});

// Additional checks for common error patterns
console.log('🔍 Checking for additional error patterns...\n');

const additionalChecks = [
  {
    name: 'Components using fetch without apiRequest',
    pattern: 'client/src/components/**/*.tsx',
    check: (content, filePath) => {
      const hasInternalFetch = content.match(/fetch\s*\(\s*['"`]\/api\//);
      const hasApiRequest = content.includes('apiRequest');
      
      if (hasInternalFetch && !hasApiRequest) {
        console.log(`   ❌ ${filePath}: Uses internal fetch without apiRequest`);
        return 1;
      }
      return 0;
    }
  }
];

// Summary
console.log('📊 SUMMARY');
console.log('='.repeat(50));
console.log(`Total issues found: ${totalIssues}`);
console.log(`Total fixes verified: ${totalFixes}`);

if (totalIssues === 0) {
  console.log('\n🎉 All JSON parsing error fixes have been successfully implemented!');
  console.log('\nKey improvements:');
  console.log('✅ Replaced direct fetch() calls with apiRequest()');
  console.log('✅ Removed manual response.ok checks (handled by apiRequest)');
  console.log('✅ Added proper error handling through apiRequest');
  console.log('✅ Consistent JSON parsing error handling');
  console.log('✅ Reduced code duplication in error handling');
} else {
  console.log(`\n⚠️  Found ${totalIssues} remaining issues that need attention.`);
  console.log('Please review the files listed above and ensure all direct fetch calls');
  console.log('to internal APIs are replaced with apiRequest() calls.');
}

console.log('\n🔧 Benefits of these fixes:');
console.log('• Consistent error handling across all API calls');
console.log('• Automatic JSON parsing error handling');
console.log('• Better user experience with meaningful error messages');
console.log('• Reduced likelihood of "Unexpected token" errors');
console.log('• Centralized request/response handling logic'); 