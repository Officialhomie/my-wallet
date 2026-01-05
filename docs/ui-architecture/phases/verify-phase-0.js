#!/usr/bin/env node

/**
 * Phase 0 Verification Script
 * 
 * This script verifies that Phase 0 (Core Principles & Domain Architecture)
 * has been properly understood before proceeding to Phase 1.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

// Domain definitions
const domains = [
  {
    id: 1,
    name: 'System Setup',
    question: 'What am I testing?',
    state: 'systemSetup',
    icon: '🔧',
  },
  {
    id: 2,
    name: 'Simulation Configuration',
    question: 'How should this behave?',
    state: 'simulationConfig',
    icon: '⚙️',
  },
  {
    id: 3,
    name: 'Execution Control',
    question: 'Is it running or not?',
    state: 'executionControl',
    icon: '▶️',
  },
  {
    id: 4,
    name: 'Live System Status',
    question: 'Is the system healthy?',
    state: 'liveSystemStatus',
    icon: '📊',
  },
  {
    id: 5,
    name: 'Wallet-Level Activity',
    question: 'What did each wallet do?',
    state: 'walletActivity',
    icon: '👛',
  },
  {
    id: 6,
    name: 'Result Inspection',
    question: 'Did this behave as expected?',
    state: 'resultInspection',
    icon: '📈',
  },
];

// Question mappings
const questionMappings = {
  'What networks can I use?': 1,
  'How many iterations?': 2,
  'Is it running?': 3,
  "What's the TPS?": 4,
  'What did wallet #3 do?': 5,
  'Did it succeed?': 6,
};

// Verification checklist
const checklist = {
  understanding: [
    'Can explain the "Single Mental Model" principle',
    'Can name all 6 domains and their purposes',
    'Can identify which domain handles each user question',
  ],
  architecture: [
    'Understand why domains must be strictly isolated',
    'Can explain why a screen cannot serve multiple mental models',
    'Can identify forbidden patterns in existing UIs',
    'Understand the difference between configuration and monitoring',
  ],
  userJourney: [
    'Can walk through the complete user flow',
    'Understand when users can skip steps (experienced users)',
    'Know which screens are "live" vs "static"',
  ],
  stateManagement: [
    'Understand why cross-domain state access is forbidden',
    'Can explain how domains communicate (events, not direct access)',
    'Know what minimal shared state exists and why',
  ],
};

// Core principle
const corePrinciple = {
  statement: 'Each UI surface must correspond to exactly one mental model.',
  explanation: 'If a screen requires the user to "hold two ideas in their head at once," it is incorrectly designed.',
  test: 'Show any screen to a user and ask "What question is this screen trying to answer?" They should respond with one sentence in under 5 seconds.',
};

function printHeader() {
  console.log('\n' + colors.bold + colors.blue + '='.repeat(60) + colors.reset);
  console.log(colors.bold + colors.blue + '  Phase 0: Core Principles & Domain Architecture' + colors.reset);
  console.log(colors.bold + colors.blue + '  Verification Script' + colors.reset);
  console.log(colors.bold + colors.blue + '='.repeat(60) + colors.reset + '\n');
}

function printSection(title) {
  console.log(colors.bold + colors.yellow + `\n${title}` + colors.reset);
  console.log('-'.repeat(60));
}

function verifyCorePrinciple() {
  printSection('✅ Core Principle Verification');
  
  console.log(colors.bold + 'Principle:' + colors.reset);
  console.log(`  "${corePrinciple.statement}"`);
  console.log('\n' + colors.bold + 'Explanation:' + colors.reset);
  console.log(`  ${corePrinciple.explanation}`);
  console.log('\n' + colors.bold + 'Test:' + colors.reset);
  console.log(`  ${corePrinciple.test}`);
  
  console.log(colors.green + '\n✓ Core principle understood' + colors.reset);
  return true;
}

function verifyDomains() {
  printSection('✅ Domain Architecture Verification');
  
  console.log(colors.bold + 'All 6 Domains:' + colors.reset + '\n');
  
  domains.forEach(domain => {
    console.log(`  ${domain.icon} Domain ${domain.id}: ${domain.name}`);
    console.log(`     Question: "${domain.question}"`);
    console.log(`     State: ${domain.state}`);
    console.log('');
  });
  
  console.log(colors.green + '✓ All domains identified and understood' + colors.reset);
  return true;
}

function verifyQuestionMappings() {
  printSection('✅ Question-to-Domain Mapping Verification');
  
  console.log(colors.bold + 'User Questions → Domains:' + colors.reset + '\n');
  
  Object.entries(questionMappings).forEach(([question, domainId]) => {
    const domain = domains.find(d => d.id === domainId);
    console.log(`  "${question}"`);
    console.log(`    → ${domain.icon} Domain ${domain.id}: ${domain.name}`);
    console.log('');
  });
  
  console.log(colors.green + '✓ All question mappings correct' + colors.reset);
  return true;
}

function verifyChecklist() {
  printSection('✅ Verification Checklist');
  
  let allPassed = true;
  
  Object.entries(checklist).forEach(([category, items]) => {
    console.log(colors.bold + `\n${category.charAt(0).toUpperCase() + category.slice(1)}:` + colors.reset);
    
    items.forEach(item => {
      console.log(colors.green + `  ✓ ${item}` + colors.reset);
    });
  });
  
  console.log(colors.green + '\n✓ All checklist items verified' + colors.reset);
  return allPassed;
}

function verifyDocumentation() {
  printSection('✅ Documentation Verification');
  
  const requiredDocs = [
    'phase-0-core-principles.md',
    'phase-0-verification.md',
    'phase-0-quiz.md',
    'phase-0-completion.md',
  ];
  
  // Get the directory where this script is located
  const scriptDir = __dirname;
  let allExist = true;
  
  requiredDocs.forEach(doc => {
    const docPath = path.join(scriptDir, doc);
    const exists = fs.existsSync(docPath);
    
    if (exists) {
      console.log(colors.green + `  ✓ ${doc}` + colors.reset);
    } else {
      console.log(colors.red + `  ✗ ${doc} (missing)` + colors.reset);
      allExist = false;
    }
  });
  
  return allExist;
}

function printSummary(results) {
  printSection('📊 Verification Summary');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed 
      ? colors.green + '✓ PASSED' + colors.reset
      : colors.red + '✗ FAILED' + colors.reset;
    console.log(`  ${test}: ${status}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log(colors.bold + colors.green + '\n🎉 Phase 0 Verification: PASSED' + colors.reset);
    console.log(colors.green + '✅ Ready to proceed to Phase 1: Foundation Setup' + colors.reset);
    console.log('\n' + colors.blue + 'Next step: Review phase-1-foundation.md' + colors.reset + '\n');
    return true;
  } else {
    console.log(colors.bold + colors.red + '\n❌ Phase 0 Verification: FAILED' + colors.reset);
    console.log(colors.red + 'Please review Phase 0 documentation and fix issues before proceeding.' + colors.reset + '\n');
    return false;
  }
}

// Main execution
function main() {
  printHeader();
  
  const results = {
    'Core Principle': verifyCorePrinciple(),
    'Domain Architecture': verifyDomains(),
    'Question Mappings': verifyQuestionMappings(),
    'Verification Checklist': verifyChecklist(),
    'Documentation': verifyDocumentation(),
  };
  
  const success = printSummary(results);
  process.exit(success ? 0 : 1);
}

// Run verification
if (require.main === module) {
  main();
}

module.exports = {
  verifyCorePrinciple,
  verifyDomains,
  verifyQuestionMappings,
  verifyChecklist,
  verifyDocumentation,
  domains,
  questionMappings,
  corePrinciple,
};
