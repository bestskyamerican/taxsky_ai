// ============================================================
// SUPER ADMIN ROUTES
// ============================================================
// Location: backend/routes/adminRoutes.js
//
// Standalone admin API that does NOT require CPA login.
// Uses a master admin key for authentication.
// Manages: Regular Users + CPA accounts
//
// Mount in server.js:
//   import adminRoutes from './routes/adminRoutes.js';
//   app.use('/api/admin', adminRoutes);
// ============================================================

import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// ── Master admin key (change this!) ──
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'taxsky-admin-2025';

// ══════════════════════════════════════════════════════════
// MIDDLEWARE: Verify admin key
// ══════════════════════════════════════════════════════════
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid admin key' });
  }
  next();
}

// Apply to all routes
router.use(requireAdmin);

// ══════════════════════════════════════════════════════════
// GET /api/admin/stats — Dashboard stats
// ══════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const [usersCount, cpasCount, paymentsCount] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('cpas').countDocuments(),
      db.collection('payments').countDocuments(),
    ]);

    const cpasByStatus = await db.collection('cpas').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    const paymentStats = await db.collection('payments').aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]).toArray();

    res.json({
      success: true,
      stats: {
        totalUsers: usersCount,
        totalCPAs: cpasCount,
        totalPayments: paymentsCount,
        totalRevenue: paymentStats[0]?.total || 0,
        completedPayments: paymentStats[0]?.count || 0,
        cpasByStatus: cpasByStatus.reduce((acc, s) => {
          acc[s._id || 'unknown'] = s.count;
          return acc;
        }, {}),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/admin/users — List all regular users
// ══════════════════════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { search, limit = 50, skip = 0 } = req.query;

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ]
      };
    }

    const users = await db.collection('users')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('users').countDocuments(filter);

    res.json({
      success: true,
      users: users.map(u => ({
        _id: u._id,
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
        picture: u.picture,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin || u.updatedAt,
        provider: u.provider || 'google',
      })),
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/admin/cpas — List all CPA accounts
// ══════════════════════════════════════════════════════════
router.get('/cpas', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { status, search } = req.query;

    let filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { firmName: { $regex: search, $options: 'i' } },
      ];
    }

    const cpas = await db.collection('cpas')
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      cpas: cpas.map(c => ({
        _id: c._id,
        email: c.email,
        firstName: c.firstName || '',
        lastName: c.lastName || '',
        firmName: c.firmName || '',
        licenseNumber: c.licenseNumber || '',
        licenseState: c.licenseState || '',
        phone: c.phone || '',
        role: c.role || 'cpa',
        status: c.status || 'pending',
        assignedZipcodes: c.assignedZipcodes || [],
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PUT /api/admin/cpas/:id/activate — Activate a CPA
// ══════════════════════════════════════════════════════════
router.put('/cpas/:id/activate', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const id = new mongoose.Types.ObjectId(req.params.id);

    const result = await db.collection('cpas').updateOne(
      { _id: id },
      {
        $set: {
          status: 'active',
          activatedAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'CPA not found' });
    }

    res.json({ success: true, message: 'CPA activated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PUT /api/admin/cpas/:id/status — Update CPA status
// ══════════════════════════════════════════════════════════
router.put('/cpas/:id/status', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const id = new mongoose.Types.ObjectId(req.params.id);
    const { status } = req.body;

    if (!['active', 'pending', 'suspended', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await db.collection('cpas').updateOne(
      { _id: id },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'CPA not found' });
    }

    res.json({ success: true, message: `CPA status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// PUT /api/admin/cpas/:id/role — Update CPA role
// ══════════════════════════════════════════════════════════
router.put('/cpas/:id/role', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const id = new mongoose.Types.ObjectId(req.params.id);
    const { role } = req.body;

    if (!['cpa', 'senior_cpa', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const result = await db.collection('cpas').updateOne(
      { _id: id },
      { $set: { role, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'CPA not found' });
    }

    res.json({ success: true, message: `CPA role updated to ${role}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// DELETE /api/admin/cpas/:id — Delete a CPA account
// ══════════════════════════════════════════════════════════
router.delete('/cpas/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const id = new mongoose.Types.ObjectId(req.params.id);

    const result = await db.collection('cpas').deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'CPA not found' });
    }

    res.json({ success: true, message: 'CPA deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════
// GET /api/admin/payments — List payments
// ══════════════════════════════════════════════════════════
router.get('/payments', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { limit = 50, skip = 0 } = req.query;

    const payments = await db.collection('payments')
      .find({})
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection('payments').countDocuments();

    res.json({ success: true, payments, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
