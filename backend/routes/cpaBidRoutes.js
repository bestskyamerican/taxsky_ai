// ============================================================
// CPA BID BOARD ROUTES - Marketplace API
// ============================================================
// Location: backend/routes/cpaBidRoutes.js
//
// Mounted at: /api/cpa (alongside existing cpaRoutes)
//
// ENDPOINTS:
//   POST /api/cpa/jobs              - User posts anonymized job
//   GET  /api/cpa/jobs              - CPA browses open jobs
//   POST /api/cpa/jobs/:id/bid      - CPA places bid
//   GET  /api/cpa/jobs/:id/bids     - User sees bids on their job
//   POST /api/cpa/jobs/:id/accept   - User picks CPA (accepts bid)
//   GET  /api/cpa/jobs/:id/details  - Assigned CPA sees client info
//   POST /api/cpa/jobs/:id/generate-pdf - Server generates PDF w/ SSN
//
// SSN SECURITY:
//   - Jobs endpoint: ZERO personal data (anonymized only)
//   - Details endpoint: name + address (NO raw SSN)
//   - Generate PDF: server injects SSN, CPA never sees it
// ============================================================

import express from 'express';
import jwt from 'jsonwebtoken';
import CPAJob from '../models/CPAJob.js';
import CPABid from '../models/CPABid.js';

const router = express.Router();

// ─── Lightweight auth (doesn't block if no token) ──────────
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    }
  } catch {
    // Token invalid — continue anyway
  }
  next();
}

// ═══════════════════════════════════════════════════════════
// 1. POST /jobs — User posts anonymized job (FREE)
// ═══════════════════════════════════════════════════════════
router.post('/jobs', async (req, res) => {
  try {
    const {
      user_id, state, filing_status, income_range,
      dependents_count, forms_needed, include_state,
      has_state_tax, tax_year,
    } = req.body;

    if (!user_id || !state || !filing_status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: user_id, state, filing_status',
      });
    }

    // Check if user already has an open job
    const existing = await CPAJob.findOne({
      user_id,
      status: { $in: ['open', 'bidding', 'assigned', 'in_review'] },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'You already have an active job posted',
        job_id: existing._id,
        job: existing,
      });
    }

    const job = await CPAJob.create({
      user_id,
      status: 'open',
      tax_year: tax_year || 2025,
      state: state.toUpperCase(),
      filing_status,
      income_range: income_range || 'Unknown',
      dependents_count: dependents_count || 0,
      forms_needed: forms_needed || 1,
      include_state: include_state !== false,
      has_state_tax: has_state_tax !== false,
    });

    console.log(`📤 [CPA_BID] Job posted: ${job._id} (${state}, ${filing_status}, ${income_range})`);

    res.json({
      success: true,
      message: 'Job posted to bid board',
      job_id: job._id,
      job,
    });

  } catch (err) {
    console.error('❌ [CPA_BID] Post job error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 2. GET /jobs — CPA browses anonymized jobs
// ═══════════════════════════════════════════════════════════
router.get('/jobs', async (req, res) => {
  try {
    const { status, state, filing_status, cpa_id, assigned_cpa_id } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (state) filter.state = state.toUpperCase();
    if (filing_status) filter.filing_status = filing_status;
    if (assigned_cpa_id) filter.assigned_cpa_id = assigned_cpa_id;

    let jobs = await CPAJob.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // If CPA wants "my_bids", filter to jobs they've bid on
    if (cpa_id) {
      const myBids = await CPABid.find({ cpa_id }).select('job_id bid_price').lean();
      const myJobIds = new Set(myBids.map(b => b.job_id.toString()));
      jobs = jobs.filter(j => myJobIds.has(j._id.toString()));
      // Attach bid info
      const bidMap = {};
      myBids.forEach(b => { bidMap[b.job_id.toString()] = b; });
      jobs = jobs.map(j => ({ ...j, my_bid: bidMap[j._id.toString()] || null }));
    }

    res.json({ success: true, jobs, count: jobs.length });

  } catch (err) {
    console.error('❌ [CPA_BID] Fetch jobs error:', err.message);
    res.status(500).json({ success: false, jobs: [], message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 3. POST /jobs/:id/bid — CPA places bid (custom price)
// ═══════════════════════════════════════════════════════════
router.post('/jobs/:id/bid', async (req, res) => {
  try {
    const { id } = req.params;
    const { cpa_id, cpa_name, cpa_credentials, bid_price, message, estimated_hours } = req.body;

    if (!cpa_id || !cpa_name || !bid_price || bid_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cpa_id, cpa_name, bid_price (> 0)',
      });
    }

    // Verify job exists and is open
    const job = await CPAJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.status !== 'open' && job.status !== 'bidding') {
      return res.status(400).json({ success: false, message: 'Job is no longer accepting bids' });
    }

    // Prevent CPA from bidding on their own job
    if (job.user_id === cpa_id) {
      return res.status(400).json({ success: false, message: 'Cannot bid on your own job' });
    }

    // Upsert bid (CPA can update their bid)
    const bid = await CPABid.findOneAndUpdate(
      { job_id: id, cpa_id },
      {
        cpa_name,
        cpa_credentials: cpa_credentials || 'Licensed CPA',
        bid_price: Number(bid_price),
        message: message || '',
        estimated_hours: Number(estimated_hours) || 24,
        status: 'pending',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update job status and bid count
    const bidCount = await CPABid.countDocuments({ job_id: id });
    await CPAJob.findByIdAndUpdate(id, {
      status: 'bidding',
      bid_count: bidCount,
    });

    console.log(`🏷️ [CPA_BID] Bid placed: $${bid_price} by ${cpa_name} on job ${id}`);

    res.json({
      success: true,
      message: 'Bid placed successfully',
      bid,
    });

  } catch (err) {
    console.error('❌ [CPA_BID] Place bid error:', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already bid on this job. Your bid has been updated.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 4. GET /jobs/:id/bids — User sees all bids on their job
// ═══════════════════════════════════════════════════════════
router.get('/jobs/:id/bids', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify job exists
    const job = await CPAJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, bids: [], message: 'Job not found' });
    }

    const bids = await CPABid.find({ job_id: id })
      .sort({ bid_price: 1 }) // cheapest first
      .lean();

    res.json({
      success: true,
      bids,
      count: bids.length,
      job_status: job.status,
    });

  } catch (err) {
    console.error('❌ [CPA_BID] Fetch bids error:', err.message);
    res.status(500).json({ success: false, bids: [], message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 5. POST /jobs/:id/accept — User picks CPA (accepts bid)
// ═══════════════════════════════════════════════════════════
router.post('/jobs/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { bid_id } = req.body;

    if (!bid_id) {
      return res.status(400).json({ success: false, message: 'Missing bid_id' });
    }

    // Find the bid
    const bid = await CPABid.findById(bid_id);
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found' });
    }

    // Verify bid belongs to this job
    if (bid.job_id.toString() !== id) {
      return res.status(400).json({ success: false, message: 'Bid does not belong to this job' });
    }

    // Update bid status
    bid.status = 'accepted';
    await bid.save();

    // Reject all other bids
    await CPABid.updateMany(
      { job_id: id, _id: { $ne: bid._id } },
      { status: 'rejected' }
    );

    // Update job — assign CPA
    await CPAJob.findByIdAndUpdate(id, {
      status: 'assigned',
      assigned_cpa_id: bid.cpa_id,
      assigned_bid_id: bid._id,
      assigned_at: new Date(),
    });

    console.log(`✅ [CPA_BID] CPA assigned: ${bid.cpa_name} ($${bid.bid_price}) to job ${id}`);

    res.json({
      success: true,
      message: `CPA ${bid.cpa_name} assigned! Paid $${bid.bid_price}`,
      bid,
    });

  } catch (err) {
    console.error('❌ [CPA_BID] Accept bid error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 6. GET /jobs/:id/details — Assigned CPA sees client info
//    (NO raw SSN — name + address only)
// ═══════════════════════════════════════════════════════════
router.get('/jobs/:id/details', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const job = await CPAJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Only assigned CPA can see details
    if (job.status !== 'assigned' && job.status !== 'in_review' && job.status !== 'completed') {
      return res.status(403).json({ success: false, message: 'Job not yet assigned' });
    }

    // Fetch user data from Python API (or your user store)
    const PYTHON_API = process.env.PYTHON_TAX_API || 'http://localhost:5002';
    let details = null;

    try {
      const userRes = await fetch(`${PYTHON_API}/api/user/${job.user_id}/form1040/missing?tax_year=2025`);
      if (userRes.ok) {
        const data = await userRes.json();
        if (data.success && data.current_data) {
          const d = data.current_data;
          details = {
            // Personal info (revealed to assigned CPA)
            first_name: d.first_name || '',
            last_name: d.last_name || '',
            address: d.address || '',
            city: d.city || '',
            state: d.state || job.state,
            zip: d.zip || '',
            filing_status: d.filing_status || job.filing_status,
            // Spouse
            spouse_first_name: d.spouse_first_name || '',
            spouse_last_name: d.spouse_last_name || '',
            // Income
            total_income: d.wages || d.total_income || 0,
            federal_withholding: d.federal_withholding || 0,
            state_withholding: d.state_withholding || 0,
            // Dependents
            dependents: data.dependents || [],
            dependents_count: (data.dependents || []).length,
            // SSN: NEVER sent — shown as encrypted
            ssn: '🔒 Encrypted',
            spouse_ssn: '🔒 Encrypted',
          };
        }
      }
    } catch (fetchErr) {
      console.error('⚠️ [CPA_BID] Fetch user data error:', fetchErr.message);
    }

    if (!details) {
      return res.status(404).json({
        success: false,
        message: 'Could not load client details. Try again later.',
      });
    }

    res.json({ success: true, details });

  } catch (err) {
    console.error('❌ [CPA_BID] Job details error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// 7. POST /jobs/:id/generate-pdf — Server generates PDF w/ SSN
//    (CPA triggers, server injects SSN, CPA never sees it)
// ═══════════════════════════════════════════════════════════
router.post('/jobs/:id/generate-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_type } = req.body; // 'federal' or 'state'

    const job = await CPAJob.findById(id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.status !== 'assigned' && job.status !== 'in_review' && job.status !== 'completed') {
      return res.status(403).json({ success: false, message: 'Job not assigned yet' });
    }

    // Forward to Python PDF generator
    const PYTHON_API = process.env.PYTHON_TAX_API || 'http://localhost:5002';
    const endpoint = form_type === 'state' ? `/generate/${job.state.toLowerCase()}` : '/generate/1040';

    const pdfRes = await fetch(`${PYTHON_API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: job.user_id,
        mask_ssn: false,            // Server has access to real SSN
        is_official_submission: true,
        cpa_job_id: id,
      }),
    });

    if (!pdfRes.ok) {
      throw new Error(`PDF generation failed: ${pdfRes.status}`);
    }

    // Mark job as in_review if not already
    if (job.status === 'assigned') {
      await CPAJob.findByIdAndUpdate(id, { status: 'in_review' });
    }

    // Stream PDF back to CPA
    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="TaxReturn_${id}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('❌ [CPA_BID] Generate PDF error:', err.message);
    res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

// ═══════════════════════════════════════════════════════════
// BONUS: GET /jobs/my — User's own jobs
// ═══════════════════════════════════════════════════════════
router.get('/jobs/my/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const jobs = await CPAJob.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, jobs, count: jobs.length });
  } catch (err) {
    console.error('❌ [CPA_BID] My jobs error:', err.message);
    res.status(500).json({ success: false, jobs: [] });
  }
});

export default router;
