#!/usr/bin/env node

/**
 * Script to validate team configuration setup
 * Usage: node scripts/validate-team-config.js [SEARCH_KEY]
 */

const { Teams, findTeamByName } = require('../build/lib/teams');

function findTeamBySearchKey(searchKey) {
  const key = searchKey.toLowerCase();
  
  // Try to find by ID first
  const byId = parseInt(key);
  if (!isNaN(byId)) {
    const team = Object.values(Teams).find(t => t.id === byId);
    if (team) return team;
  }
  
  // Use the existing findTeamByName function which handles nameRegex
  const team = findTeamByName(searchKey);
  if (team) return team;
  
  // Additional fallback for abbreviation and location (not covered by nameRegex)
  return Object.values(Teams).find(t => 
    t.abbreviation.toLowerCase() === key ||
    t.location.toLowerCase() === key
  ) || null;
}

function validateTeamConfig(searchKey) {
  console.log('🔍 Validating team configuration...\n');
  
  // Check if team can be found by search key
  const team = findTeamBySearchKey(searchKey);
  if (!team) {
    console.error(`❌ Team not found for search key '${searchKey}'!`);
    console.log('\n📋 Available teams:');
    Object.values(Teams).forEach(t => {
      console.log(`   ${t.location} ${t.name} (ID: ${t.id}) - ${t.abbreviation}`);
    });
    console.log('\n💡 Try searching with: team name, abbreviation, location, or ID');
    console.log('   Examples: osaka, kaiju, OSK, 9, baltimore, hawks, BAL, 1');
    process.exit(1);
  }
  
  console.log(`✅ Team found: ${team.location} ${team.name}`);
  console.log(`   - ID: ${team.id}`);
  console.log(`   - Abbreviation: ${team.abbreviation}`);
  console.log(`   - League: ${team.league}`);
  console.log(`   - Conference: ${team.conference}`);
  console.log(`   - Primary Color: ${team.colors.primary}`);
  
  // Generate suggested environment variables
  const dbPrefix = team.name.toLowerCase().replace(/\s+/g, '');
  
  console.log('\n🔧 Method 1: Single search key environment variables:');
  console.log(`TEAM_SEARCH_KEY=${searchKey}`);
  console.log(`DB_TABLE_PREFIX=${dbPrefix}`);
  
  console.log('\n🔧 Method 2: Guild-based mapping (add to config.ts):');
  console.log(`'YOUR_DISCORD_SERVER_ID': '${searchKey}',`);
  
  console.log('\n📁 Database tables needed:');
  const statTypes = ['games', 'passing', 'rushing', 'receiving', 'kicking', 'punting', 'defense', 'other'];
  statTypes.forEach(type => {
    console.log(`   ${dbPrefix}_${type}`);
  });
  
  console.log('\n✅ Team configuration is valid!');
}

// Get search key from command line argument or default to 'osaka'
const searchKey = process.argv[2] || 'osaka';
validateTeamConfig(searchKey);