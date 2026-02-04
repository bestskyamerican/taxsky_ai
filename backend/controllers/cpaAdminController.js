// ============================================================
// CPA ADMIN CONTROLLER - Manage CPA Users
// ============================================================
// Location: backend/controllers/cpaAdminController.js
// ✅ UPDATED: Added ZIP code assignment functionality
// ============================================================

import mongoose from 'mongoose';
import CPA from '../models/CPA.js';

const UploadedFile = mongoose.models.UploadedFile;
const TaxSession = mongoose.models.TaxSession;

// ============================================================
// GET ALL CPAs
// ============================================================
export async function getAllCPAs(req, res) {
  try {
    const { status, role, search, zipcode, page = 1, limit = 20 } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // ✅ Filter by assigned ZIP code
    if (zipcode) {
      query.assignedZipcodes = zipcode;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { licenseNumber: { $regex: search, $options: 'i' } },
        { assignedZipcodes: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [cpas, total] = await Promise.all([
      CPA.find(query)
        .select('-password -passwordResetToken -passwordResetExpires -loginHistory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CPA.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      count: cpas.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      cpas
    });
  } catch (error) {
    console.error('❌ getAllCPAs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET SINGLE CPA
// ============================================================
export async function getCPAById(req, res) {
  try {
    const { cpaId } = req.params;
    
    const cpa = await CPA.findById(cpaId)
      .select('-password -passwordResetToken -passwordResetExpires');
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    // Get review history (last 50 reviews) — search by CPA ID or name
    const reviewHistory = await UploadedFile?.find({
      $or: [
        { cpaReviewedById: cpa._id },
        { cpaReviewedBy: `${cpa.firstName} ${cpa.lastName}` }
      ]
    })
      .sort({ cpaReviewedAt: -1 })
      .limit(50)
      .select('formType status cpaReviewedAt userId');
    
    res.json({
      success: true,
      cpa,
      reviewHistory: reviewHistory || []
    });
  } catch (error) {
    console.error('❌ getCPAById error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// APPROVE CPA (Pending → Active)
// ============================================================
export async function approveCPA(req, res) {
  try {
    const { cpaId } = req.params;
    const { assignedZipcodes } = req.body;  // ✅ Can assign ZIPs during approval
    
    const cpa = await CPA.findById(cpaId);
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    if (cpa.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `CPA is already ${cpa.status}`
      });
    }
    
    cpa.status = 'active';
    cpa.approvedBy = req.cpa._id;
    cpa.approvedAt = new Date();
    
    // ✅ Assign ZIP codes if provided
    if (assignedZipcodes && Array.isArray(assignedZipcodes)) {
      cpa.assignedZipcodes = assignedZipcodes;
    }
    
    await cpa.save({ validateBeforeSave: false });
    
    console.log(`✅ CPA approved: ${cpa.email} by ${req.cpa.email}`);
    if (assignedZipcodes?.length) {
      console.log(`📍 Assigned ZIP codes: ${assignedZipcodes.join(', ')}`);
    }
    
    res.json({
      success: true,
      message: `CPA ${cpa.firstName} ${cpa.lastName} has been approved`,
      cpa: cpa.toJSON()
    });
  } catch (error) {
    console.error('❌ approveCPA error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ✅ UPDATE CPA ZIP CODES
// ============================================================
export async function updateCPAZipcodes(req, res) {
  try {
    const { cpaId } = req.params;
    const { zipcodes, action = 'set' } = req.body;
    
    // Validate zipcodes
    if (!zipcodes || !Array.isArray(zipcodes)) {
      return res.status(400).json({
        success: false,
        error: 'zipcodes must be an array'
      });
    }
    
    // Validate ZIP code format (5 digits)
    const validZips = zipcodes.filter(z => /^\d{5}$/.test(String(z).trim()));
    if (validZips.length !== zipcodes.length) {
      return res.status(400).json({
        success: false,
        error: 'All ZIP codes must be 5 digits'
      });
    }
    
    const cpa = await CPA.findById(cpaId);
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    let updateOperation;
    let message;
    
    switch (action) {
      case 'add':
        // Add new ZIP codes (no duplicates)
        updateOperation = { 
          $addToSet: { assignedZipcodes: { $each: validZips } } 
        };
        message = `Added ${validZips.length} ZIP code(s)`;
        break;
        
      case 'remove':
        // Remove specific ZIP codes
        updateOperation = { 
          $pull: { assignedZipcodes: { $in: validZips } } 
        };
        message = `Removed ${validZips.length} ZIP code(s)`;
        break;
        
      case 'set':
      default:
        // Replace all ZIP codes
        updateOperation = { 
          $set: { assignedZipcodes: validZips } 
        };
        message = `Set ${validZips.length} ZIP code(s)`;
        break;
    }
    
    const updatedCPA = await CPA.findByIdAndUpdate(
      cpaId,
      updateOperation,
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires -loginHistory');
    
    console.log(`📍 CPA ${cpa.email} ZIP codes updated: ${action} - ${validZips.join(', ')}`);
    
    res.json({
      success: true,
      message,
      cpa: updatedCPA
    });
  } catch (error) {
    console.error('❌ updateCPAZipcodes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ✅ BULK ASSIGN ZIP CODES TO MULTIPLE CPAs
// ============================================================
export async function bulkAssignZipcodes(req, res) {
  try {
    const { cpaIds, zipcodes, action = 'add' } = req.body;
    
    if (!cpaIds || !Array.isArray(cpaIds) || cpaIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cpaIds must be a non-empty array'
      });
    }
    
    if (!zipcodes || !Array.isArray(zipcodes) || zipcodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'zipcodes must be a non-empty array'
      });
    }
    
    // Validate ZIP codes
    const validZips = zipcodes.filter(z => /^\d{5}$/.test(String(z).trim()));
    
    let updateOperation;
    
    if (action === 'add') {
      updateOperation = { $addToSet: { assignedZipcodes: { $each: validZips } } };
    } else if (action === 'remove') {
      updateOperation = { $pull: { assignedZipcodes: { $in: validZips } } };
    } else {
      updateOperation = { $set: { assignedZipcodes: validZips } };
    }
    
    const result = await CPA.updateMany(
      { _id: { $in: cpaIds } },
      updateOperation
    );
    
    console.log(`📍 Bulk ZIP update: ${result.modifiedCount} CPAs updated`);
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} CPA(s)`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ bulkAssignZipcodes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ✅ GET ALL UNIQUE ZIP CODES IN SYSTEM
// ============================================================
export async function getAllZipcodes(req, res) {
  try {
    // Get ZIP codes from CPA assignments
    const cpaZips = await CPA.aggregate([
      { $unwind: '$assignedZipcodes' },
      { $group: { _id: '$assignedZipcodes' } },
      { $sort: { _id: 1 } }
    ]);
    
    // Get ZIP codes from uploaded files (user locations)
    const fileZips = await UploadedFile?.aggregate([
      { 
        $match: { 
          $or: [
            { 'extractedData.employee_zip': { $exists: true, $ne: '' } },
            { userZip: { $exists: true, $ne: '' } }
          ]
        } 
      },
      { 
        $group: { 
          _id: { $ifNull: ['$extractedData.employee_zip', '$userZip'] },
          count: { $sum: 1 }
        } 
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } }
    ]) || [];
    
    // Combine and deduplicate
    const assignedZips = cpaZips.map(z => z._id);
    const userZips = fileZips.map(z => ({ zip: z._id, fileCount: z.count }));
    
    res.json({
      success: true,
      assignedZipcodes: assignedZips,
      userZipcodes: userZips,
      totalAssigned: assignedZips.length,
      totalUserZips: userZips.length
    });
  } catch (error) {
    console.error('❌ getAllZipcodes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// ✅ GET ZIP CODE COVERAGE REPORT
// ============================================================
export async function getZipcodeCoverage(req, res) {
  try {
    // Get all user ZIP codes with file counts
    const userZips = await UploadedFile?.aggregate([
      { 
        $match: { 
          $or: [
            { 'extractedData.employee_zip': { $exists: true, $ne: '' } },
            { userZip: { $exists: true, $ne: '' } }
          ]
        } 
      },
      {
        $addFields: {
          zip: { $ifNull: ['$extractedData.employee_zip', '$userZip'] }
        }
      },
      { 
        $group: { 
          _id: '$zip',
          fileCount: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        } 
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $sort: { fileCount: -1 } }
    ]) || [];
    
    // Get CPA assignments per ZIP
    const cpaAssignments = await CPA.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$assignedZipcodes' },
      { 
        $group: { 
          _id: '$assignedZipcodes',
          cpas: { 
            $push: { 
              id: '$_id', 
              name: { $concat: ['$firstName', ' ', '$lastName'] },
              email: '$email'
            } 
          },
          cpaCount: { $sum: 1 }
        } 
      }
    ]);
    
    // Create coverage map
    const coverageMap = {};
    
    // Add user ZIPs
    userZips.forEach(uz => {
      if (uz._id) {
        coverageMap[uz._id] = {
          zipcode: uz._id,
          fileCount: uz.fileCount,
          pendingCount: uz.pendingCount,
          assignedCPAs: [],
          cpaCount: 0,
          covered: false
        };
      }
    });
    
    // Add CPA assignments
    cpaAssignments.forEach(ca => {
      if (coverageMap[ca._id]) {
        coverageMap[ca._id].assignedCPAs = ca.cpas;
        coverageMap[ca._id].cpaCount = ca.cpaCount;
        coverageMap[ca._id].covered = true;
      } else {
        // ZIP assigned but no files
        coverageMap[ca._id] = {
          zipcode: ca._id,
          fileCount: 0,
          pendingCount: 0,
          assignedCPAs: ca.cpas,
          cpaCount: ca.cpaCount,
          covered: true
        };
      }
    });
    
    const coverage = Object.values(coverageMap).sort((a, b) => b.fileCount - a.fileCount);
    const uncovered = coverage.filter(c => !c.covered && c.fileCount > 0);
    const covered = coverage.filter(c => c.covered);
    
    res.json({
      success: true,
      summary: {
        totalZipcodes: coverage.length,
        coveredZipcodes: covered.length,
        uncoveredZipcodes: uncovered.length,
        coveragePercent: coverage.length > 0 
          ? Math.round((covered.length / coverage.length) * 100) 
          : 100
      },
      uncoveredZipcodes: uncovered,
      allZipcodes: coverage
    });
  } catch (error) {
    console.error('❌ getZipcodeCoverage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// UPDATE CPA STATUS
// ============================================================
export async function updateCPAStatus(req, res) {
  try {
    const { cpaId } = req.params;
    const { status, reason } = req.body;
    
    if (!['active', 'inactive', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, inactive, suspended, or pending'
      });
    }
    
    const cpa = await CPA.findById(cpaId);
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    // Prevent self-suspension
    if (cpaId === req.cpa._id.toString() && status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own status to non-active'
      });
    }
    
    const oldStatus = cpa.status;
    cpa.status = status;
    
    // If activating, set approval info
    if (status === 'active' && oldStatus === 'pending') {
      cpa.approvedBy = req.cpa._id;
      cpa.approvedAt = new Date();
    }
    
    await cpa.save({ validateBeforeSave: false });
    
    console.log(`✅ CPA status changed: ${cpa.email} ${oldStatus} → ${status} by ${req.cpa.email}`);
    
    res.json({
      success: true,
      message: `CPA status updated to ${status}`,
      cpa: cpa.toJSON()
    });
  } catch (error) {
    console.error('❌ updateCPAStatus error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// UPDATE CPA PERMISSIONS
// ============================================================
export async function updateCPAPermissions(req, res) {
  try {
    const { cpaId } = req.params;
    const { permissions, role } = req.body;
    
    const cpa = await CPA.findById(cpaId);
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    // Prevent changing own permissions
    if (cpaId === req.cpa._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own permissions'
      });
    }
    
    const updates = {};
    
    if (permissions) {
      updates.permissions = {
        ...cpa.permissions,
        ...permissions
      };
    }
    
    if (role && ['cpa', 'senior_cpa', 'admin'].includes(role)) {
      updates.role = role;
    }
    
    const updatedCPA = await CPA.findByIdAndUpdate(
      cpaId,
      { $set: updates },
      { new: true }
    ).select('-password -passwordResetToken -passwordResetExpires -loginHistory');
    
    console.log(`✅ CPA permissions updated: ${cpa.email} by ${req.cpa.email}`);
    
    res.json({
      success: true,
      message: 'Permissions updated successfully',
      cpa: updatedCPA
    });
  } catch (error) {
    console.error('❌ updateCPAPermissions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// DELETE CPA
// ============================================================
export async function deleteCPA(req, res) {
  try {
    const { cpaId } = req.params;
    
    // Prevent self-deletion
    if (cpaId === req.cpa._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }
    
    const cpa = await CPA.findById(cpaId);
    
    if (!cpa) {
      return res.status(404).json({
        success: false,
        error: 'CPA not found'
      });
    }
    
    // Soft delete - just mark as inactive
    cpa.status = 'inactive';
    cpa.email = `deleted_${Date.now()}_${cpa.email}`; // Free up email
    cpa.assignedZipcodes = [];  // ✅ Remove ZIP assignments
    await cpa.save({ validateBeforeSave: false });
    
    console.log(`🗑️ CPA deleted: ${cpa.email} by ${req.cpa.email}`);
    
    res.json({
      success: true,
      message: 'CPA account has been deactivated'
    });
  } catch (error) {
    console.error('❌ deleteCPA error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET CPA STATS (Performance metrics)
// ============================================================
export async function getCPAStats(req, res) {
  try {
    const { period = '30' } = req.query; // days
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Get all active CPAs with their stats
    const cpas = await CPA.find({ status: 'active' })
      .select('firstName lastName email stats role assignedZipcodes')
      .sort({ 'stats.totalReviewed': -1 });
    
    // Get reviews in period
    const reviews = await UploadedFile?.aggregate([
      {
        $match: {
          cpaReviewedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$cpaReviewedBy',
          total: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { total: -1 } }
    ]) || [];
    
    // Count by status
    const statusCounts = await CPA.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      period: parseInt(period),
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      leaderboard: reviews.slice(0, 10),
      allCPAs: cpas
    });
  } catch (error) {
    console.error('❌ getCPAStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// GET SYSTEM STATS (Overview)
// ============================================================
export async function getSystemStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    // CPA counts
    const cpaStats = await CPA.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // File/review counts
    const fileStats = await UploadedFile?.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          today: [
            { $match: { uploadedAt: { $gte: today } } },
            { $count: 'count' }
          ],
          thisWeek: [
            { $match: { uploadedAt: { $gte: thisWeek } } },
            { $count: 'count' }
          ],
          thisMonth: [
            { $match: { uploadedAt: { $gte: thisMonth } } },
            { $count: 'count' }
          ]
        }
      }
    ]) || [{ byStatus: [], today: [], thisWeek: [], thisMonth: [] }];
    
    // User counts
    const userCount = await TaxSession?.countDocuments() || 0;
    
    // ✅ ZIP coverage stats
    const zipStats = await CPA.aggregate([
      { $match: { status: 'active' } },
      { $unwind: '$assignedZipcodes' },
      { $group: { _id: null, totalAssignments: { $sum: 1 }, uniqueZips: { $addToSet: '$assignedZipcodes' } } },
      { $project: { totalAssignments: 1, uniqueZipCount: { $size: '$uniqueZips' } } }
    ]);
    
    res.json({
      success: true,
      stats: {
        cpas: {
          total: cpaStats.reduce((sum, s) => sum + s.count, 0),
          byStatus: cpaStats.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
          }, {})
        },
        files: {
          byStatus: fileStats[0].byStatus.reduce((acc, s) => {
            acc[s._id] = s.count;
            return acc;
          }, {}),
          today: fileStats[0].today[0]?.count || 0,
          thisWeek: fileStats[0].thisWeek[0]?.count || 0,
          thisMonth: fileStats[0].thisMonth[0]?.count || 0
        },
        users: {
          total: userCount
        },
        zipcodes: {
          totalAssigned: zipStats[0]?.totalAssignments || 0,
          uniqueZips: zipStats[0]?.uniqueZipCount || 0
        }
      }
    });
  } catch (error) {
    console.error('❌ getSystemStats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================
// EXPORT
// ============================================================
export default {
  getAllCPAs,
  getCPAById,
  approveCPA,
  updateCPAStatus,
  updateCPAPermissions,
  updateCPAZipcodes,      // ✅ NEW
  bulkAssignZipcodes,     // ✅ NEW
  getAllZipcodes,         // ✅ NEW
  getZipcodeCoverage,     // ✅ NEW
  deleteCPA,
  getCPAStats,
  getSystemStats
};