import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:3000";

export default function FinalVerification({ userId, onBack, onConfirm }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [certifications, setCertifications] = useState({
    accuracy: false,
    electronicSignature: false,
    reviewed: false
  });
  const [ssnVerified, setSsnVerified] = useState(false);
  const [showFullSSN, setShowFullSSN] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/debug/session`, {
        params: { userId }
      });
      
      setUserData({
        name: res.data.session.answers.employee_name || '',
        ssn: res.data.session.answers.employee_ssa_number || '',
        address: res.data.session.answers.employee_address || '',
        city: res.data.session.answers.employee_city || '',
        state: res.data.session.answers.employee_state || '',
        zip: res.data.session.answers.employee_zip || '',
        filingStatus: res.data.session.answers.filing_status || '',
        dependents: res.data.session.answers.dependents || 0,
        totalIncome: res.data.calculation?.totalIncome || 0,
        federalWithholding: res.data.calculation?.federalWithholding || 0,
        estimatedRefund: res.data.calculation?.totalRefund || 0
      });
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setLoading(false);
    }
  };

  const maskSSN = (ssn) => {
    if (!ssn) return 'XXX-XX-XXXX';
    const digits = ssn.replace(/\D/g, '');
    if (digits.length === 9) {
      return `XXX-XX-${digits.slice(-4)}`;
    }
    return ssn;
  };

  const handleEdit = (field) => {
    setEditing(field);
  };

  const handleSave = async (field, value) => {
    try {
      await axios.post(`${API_BASE}/api/user/update`, {
        userId,
        field,
        value
      });
      setUserData({ ...userData, [field]: value });
      setEditing(null);
    } catch (err) {
      console.error('Error updating:', err);
      alert('Failed to update. Please try again.');
    }
  };

  const allCertified = () => {
    return certifications.accuracy && 
           certifications.electronicSignature && 
           certifications.reviewed &&
           ssnVerified;
  };

  const handleSubmit = () => {
    if (!allCertified()) {
      alert('Please complete all certifications before continuing.');
      return;
    }
    onConfirm(userData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading verification data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            🔒 Final Verification
          </h1>
          <p className="text-gray-600 mt-2">
            Please review and confirm all information before filing your return.
          </p>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            📋 Personal Information
          </h2>

          {/* Name */}
          <div className="border-b pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-sm text-gray-600 font-semibold">Full Name</label>
                {editing === 'name' ? (
                  <input
                    type="text"
                    className="mt-1 w-full border rounded px-3 py-2"
                    defaultValue={userData.name}
                    onBlur={(e) => handleSave('name', e.target.value)}
                    autoFocus
                  />
                ) : (
                  <div className="text-xl font-semibold text-gray-800">{userData.name}</div>
                )}
              </div>
              <button
                onClick={() => handleEdit('name')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          </div>

          {/* SSN */}
          <div className="border-b pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <label className="text-sm text-gray-600 font-semibold">Social Security Number</label>
                <div className="text-xl font-semibold text-gray-800 font-mono">
                  {showFullSSN ? userData.ssn : maskSSN(userData.ssn)}
                </div>
                <button
                  onClick={() => setShowFullSSN(!showFullSSN)}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                >
                  {showFullSSN ? '🙈 Hide' : '👁️ Show'} full SSN
                </button>
              </div>
              <div>
                {!ssnVerified ? (
                  <button
                    onClick={() => setSsnVerified(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    ✓ Verify SSN
                  </button>
                ) : (
                  <div className="text-green-600 font-semibold flex items-center">
                    ✅ Verified
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700">
              ⚠️ <strong>Important:</strong> Make sure your SSN is correct. It cannot be changed after filing.
            </div>
          </div>

          {/* Address */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-600 font-semibold">Mailing Address</label>
              <button
                onClick={() => handleEdit('address')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            </div>
            {editing === 'address' ? (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Street Address"
                  className="w-full border rounded px-3 py-2"
                  defaultValue={userData.address}
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    className="border rounded px-3 py-2"
                    defaultValue={userData.city}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    className="border rounded px-3 py-2"
                    defaultValue={userData.state}
                  />
                  <input
                    type="text"
                    placeholder="ZIP"
                    className="border rounded px-3 py-2"
                    defaultValue={userData.zip}
                  />
                </div>
                <button
                  onClick={() => setEditing(null)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="text-gray-800">
                <div>{userData.address}</div>
                <div>{userData.city}, {userData.state} {userData.zip}</div>
              </div>
            )}
          </div>

          {/* Filing Info */}
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Filing Status</label>
                <div className="text-lg font-semibold text-gray-800 capitalize">{userData.filingStatus}</div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Dependents</label>
                <div className="text-lg font-semibold text-gray-800">{userData.dependents}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-4">📊 Tax Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span>Total Income:</span>
              <span className="font-bold">${userData.totalIncome.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Federal Withholding:</span>
              <span className="font-bold">${userData.federalWithholding.toLocaleString()}</span>
            </div>
            <div className="border-t border-blue-400 pt-3 mt-3">
              <div className="flex justify-between text-2xl">
                <span className="font-bold">Estimated Refund:</span>
                <span className="font-bold">
                  ${Math.abs(userData.estimatedRefund).toLocaleString()}
                  {userData.estimatedRefund >= 0 ? ' refund' : ' owed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">⚠️ Important Certifications</h2>
          
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={certifications.accuracy}
                onChange={(e) => setCertifications({...certifications, accuracy: e.target.checked})}
                className="mt-1 w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-800">
                  I certify that the information is true, correct, and complete
                </div>
                <div className="text-sm text-gray-600">
                  Under penalties of perjury, I declare that I have examined this return and to the best of my knowledge and belief, it is true, correct, and complete.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={certifications.electronicSignature}
                onChange={(e) => setCertifications({...certifications, electronicSignature: e.target.checked})}
                className="mt-1 w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-800">
                  I understand I am electronically signing this return
                </div>
                <div className="text-sm text-gray-600">
                  Your electronic signature has the same legal effect as a handwritten signature.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={certifications.reviewed}
                onChange={(e) => setCertifications({...certifications, reviewed: e.target.checked})}
                className="mt-1 w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-800">
                  I have reviewed all information carefully
                </div>
                <div className="text-sm text-gray-600">
                  I have verified my SSN, address, and all tax information is accurate.
                </div>
              </div>
            </label>
          </div>

          {!allCertified() && (
            <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <div className="text-yellow-800 font-semibold">
                ⚠️ Please complete all certifications to continue
              </div>
              {!ssnVerified && (
                <div className="text-sm text-yellow-700 mt-1">
                  • Click "Verify SSN" to confirm your Social Security Number
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 font-semibold"
            >
              ← Back to Review
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allCertified()}
              className={`flex-1 py-3 px-6 rounded-lg font-semibold ${
                allCertified()
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allCertified() ? '📄 Generate 1040 & Submit →' : '⚠️ Complete Certifications First'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
