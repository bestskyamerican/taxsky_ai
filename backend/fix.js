// ============================================================
// DATABASE MIGRATION SCRIPT - Fix Existing Data
// ============================================================
// Run this script once to:
// 1. Add odtUserId to existing users
// 2. Fix sessions with invalid userId
// 3. Add unique index on userId + taxYear
// 
// Usage: node scripts/migrate.js
// ============================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taxsky';

// ============================================================
// CONNECT TO MONGODB
// ============================================================
async function connect() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// ============================================================
// GENERATE USER ID
// ============================================================
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// FIX USERS - Add odtUserId if missing
// ============================================================
async function fixUsers() {
  console.log('\n📋 Fixing Users...');
  
  const User = mongoose.connection.collection('users');
  
  // Find users without odtUserId
  const usersWithoutId = await User.find({ 
    $or: [
      { odtUserId: { $exists: false } },
      { odtUserId: null },
      { odtUserId: '' }
    ]
  }).toArray();
  
  console.log(`   Found ${usersWithoutId.length} users without odtUserId`);
  
  for (const user of usersWithoutId) {
    const newId = generateUserId();
    await User.updateOne(
      { _id: user._id },
      { $set: { odtUserId: newId } }
    );
    console.log(`   ✅ Added odtUserId to user: ${user.email} -> ${newId}`);
  }
  
  console.log('   ✅ Users fixed!');
}

// ============================================================
// FIX TAX SESSIONS - Remove invalid, merge data
// ============================================================
async function fixTaxSessions() {
  console.log('\n📋 Fixing Tax Sessions...');
  
  const TaxSession = mongoose.connection.collection('taxsessions');
  const User = mongoose.connection.collection('users');
  
  // 1. Find sessions with invalid userId
  const invalidSessions = await TaxSession.find({
    $or: [
      { userId: 'undefined' },
      { userId: 'null' },
      { userId: '' },
      { userId: null }
    ]
  }).toArray();
  
  console.log(`   Found ${invalidSessions.length} sessions with invalid userId`);
  
  for (const session of invalidSessions) {
    // Try to find the user by email in the session data
    const email = session.normalizedData?.personal?.email;
    
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user && user.odtUserId) {
        await TaxSession.updateOne(
          { _id: session._id },
          { $set: { userId: user.odtUserId } }
        );
        console.log(`   ✅ Fixed session ${session._id} -> userId: ${user.odtUserId}`);
        continue;
      }
    }
    
    // Can't fix - delete
    await TaxSession.deleteOne({ _id: session._id });
    console.log(`   🗑️ Deleted invalid session: ${session._id}`);
  }
  
  // 2. Add taxYear if missing
  const sessionsWithoutYear = await TaxSession.find({
    $or: [
      { taxYear: { $exists: false } },
      { taxYear: null }
    ]
  }).toArray();
  
  console.log(`   Found ${sessionsWithoutYear.length} sessions without taxYear`);
  
  for (const session of sessionsWithoutYear) {
    await TaxSession.updateOne(
      { _id: session._id },
      { $set: { taxYear: 2025 } }
    );
    console.log(`   ✅ Added taxYear 2025 to session: ${session._id}`);
  }
  
  // 3. Handle duplicate sessions (same userId + taxYear)
  const duplicates = await TaxSession.aggregate([
    { $group: { 
      _id: { odtUserId: '$userId', taxYear: '$taxYear' },
      count: { $sum: 1 },
      docs: { $push: '$_id' }
    }},
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  console.log(`   Found ${duplicates.length} duplicate userId+taxYear combinations`);
  
  for (const dup of duplicates) {
    // Keep the most recent one (by updatedAt), delete others
    const sessions = await TaxSession.find({ 
      _id: { $in: dup.docs } 
    }).sort({ updatedAt: -1 }).toArray();
    
    const keepSession = sessions[0];
    const deleteSessions = sessions.slice(1);
    
    // Merge data from other sessions into the kept one
    for (const delSession of deleteSessions) {
      // Merge normalizedData if keeper doesn't have it
      if (!keepSession.normalizedData?.personal?.first_name && delSession.normalizedData?.personal?.first_name) {
        await TaxSession.updateOne(
          { _id: keepSession._id },
          { $set: { 'normalizedData.personal': delSession.normalizedData.personal } }
        );
      }
      
      // Merge income data
      if (delSession.normalizedData?.income?.w2?.length > 0 && 
          (!keepSession.normalizedData?.income?.w2 || keepSession.normalizedData.income.w2.length === 0)) {
        await TaxSession.updateOne(
          { _id: keepSession._id },
          { $set: { 'normalizedData.income': delSession.normalizedData.income } }
        );
      }
      
      // Delete the duplicate
      await TaxSession.deleteOne({ _id: delSession._id });
      console.log(`   🔀 Merged and deleted duplicate: ${delSession._id}`);
    }
  }
  
  console.log('   ✅ Tax sessions fixed!');
}

// ============================================================
// CREATE INDEXES
// ============================================================
async function createIndexes() {
  console.log('\n📋 Creating Indexes...');
  
  const TaxSession = mongoose.connection.collection('taxsessions');
  
  try {
    // Create unique compound index
    await TaxSession.createIndex(
      { userId: 1, taxYear: 1 },
      { unique: true, background: true }
    );
    console.log('   ✅ Created unique index on userId + taxYear');
  } catch (error) {
    if (error.code === 11000) {
      console.log('   ⚠️ Index already exists or duplicates found - run fixTaxSessions first');
    } else {
      console.error('   ❌ Error creating index:', error);
    }
  }
  
  const User = mongoose.connection.collection('users');
  
  try {
    await User.createIndex({ odtUserId: 1 }, { unique: true, sparse: true });
    console.log('   ✅ Created unique index on odtUserId');
  } catch (error) {
    console.log('   ⚠️ odtUserId index already exists');
  }
}

// ============================================================
// PRINT SUMMARY
// ============================================================
async function printSummary() {
  console.log('\n📊 Database Summary:');
  
  const User = mongoose.connection.collection('users');
  const TaxSession = mongoose.connection.collection('taxsessions');
  
  const userCount = await User.countDocuments();
  const sessionCount = await TaxSession.countDocuments();
  const invalidSessions = await TaxSession.countDocuments({
    $or: [
      { userId: 'undefined' },
      { userId: 'null' },
      { userId: '' },
      { userId: null }
    ]
  });
  
  console.log(`   Users: ${userCount}`);
  console.log(`   Tax Sessions: ${sessionCount}`);
  console.log(`   Invalid Sessions: ${invalidSessions}`);
  
  // Sample sessions
  console.log('\n📋 Sample Sessions:');
  const samples = await TaxSession.find().limit(3).toArray();
  samples.forEach((s, i) => {
    console.log(`   ${i + 1}. userId: ${s.userId}, taxYear: ${s.taxYear}, hasIncome: ${!!s.normalizedData?.income?.w2?.length}`);
  });
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🚀 TaxSky Database Migration');
  console.log('============================\n');
  
  await connect();
  
  await fixUsers();
  await fixTaxSessions();
  await createIndexes();
  await printSummary();
  
  console.log('\n✅ Migration complete!');
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});