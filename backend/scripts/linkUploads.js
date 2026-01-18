// ============================================================
// LINK UPLOADS TO CPA - Match files in uploads folder
// ============================================================
// Run: node scripts/linkUploads.js
// 
// This links the actual files in uploads/unknown to the
// uploadedfiles collection so CPA can see the original images
// ============================================================

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function linkUploads() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');
    
    // Get all files in uploads/unknown folder
    const uploadsDir = path.join(process.cwd(), 'uploads', 'unknown');
    console.log('Checking uploads folder:', uploadsDir);
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ uploads/unknown folder not found!');
      console.log('   Looking for:', uploadsDir);
      process.exit(1);
    }
    
    const files = fs.readdirSync(uploadsDir).filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.pdf')
    );
    
    console.log(`Found ${files.length} files in uploads/unknown\n`);
    
    // Get all uploadedfiles records
    const uploadedFiles = await mongoose.connection.db.collection('uploadedfiles').find({}).toArray();
    console.log(`Found ${uploadedFiles.length} records in uploadedfiles collection\n`);
    
    // Try to match by timestamp in filename
    let linked = 0;
    
    for (const record of uploadedFiles) {
      if (record.fileName && files.includes(record.fileName)) {
        // Already linked
        continue;
      }
      
      // Try to find matching file by upload time
      const uploadTime = new Date(record.uploadedAt || record.createdAt).getTime();
      
      // Find file with closest timestamp
      let bestMatch = null;
      let bestDiff = Infinity;
      
      for (const file of files) {
        // Extract timestamp from filename like "2025-UPLOAD-1766632936699.jpg"
        const match = file.match(/UPLOAD-(\d+)/);
        if (match) {
          const fileTime = parseInt(match[1]);
          const diff = Math.abs(fileTime - uploadTime);
          
          // If within 1 hour, consider it a match
          if (diff < 3600000 && diff < bestDiff) {
            bestDiff = diff;
            bestMatch = file;
          }
        }
      }
      
      if (bestMatch) {
        await mongoose.connection.db.collection('uploadedfiles').updateOne(
          { _id: record._id },
          { $set: { fileName: bestMatch, filePath: `/uploads/unknown/${bestMatch}` } }
        );
        console.log(`✅ Linked: ${record.extractedData?.employee_name || 'Unknown'} → ${bestMatch}`);
        linked++;
      }
    }
    
    console.log(`\n========================================`);
    console.log(`✅ Linked ${linked} files`);
    console.log(`========================================\n`);
    
    // Also list unlinked files for manual linking
    console.log('Files without matches (may need manual linking):');
    for (const file of files.slice(0, 10)) {
      const hasRecord = uploadedFiles.some(r => r.fileName === file);
      if (!hasRecord) {
        console.log(`  📄 ${file}`);
      }
    }
    if (files.length > 10) {
      console.log(`  ... and ${files.length - 10} more`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

linkUploads();
