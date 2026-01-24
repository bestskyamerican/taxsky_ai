// ============================================================
// DEPENDENT MANAGER COMPONENT
// A clean, ready-to-integrate component for managing dependents
// ============================================================

import React, { useState } from 'react';

// Helper function to mask SSN
const maskSSN = (ssn) => {
  if (!ssn) return '***-**-****';
  const clean = ssn.replace(/\D/g, '');
  if (clean.length >= 4) {
    return `***-**-${clean.slice(-4)}`;
  }
  return '***-**-****';
};

// Format SSN for display during editing
const formatSSNInput = (value) => {
  const clean = value.replace(/\D/g, '').slice(0, 9);
  if (clean.length >= 6) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;
  } else if (clean.length >= 4) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
};

const DependentManager = ({ 
  dependents, 
  setDependents, 
  userId, 
  token, 
  API_BASE,
  validateWithPython,
  styles 
}) => {
  const [editingDependent, setEditingDependent] = useState(null);
  const [dependentFormData, setDependentFormData] = useState({
    first_name: '',
    last_name: '',
    ssn: '',
    relationship: 'child',
    date_of_birth: '',
    months_lived: 12
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Open modal for new or existing dependent
  const openDependentModal = (index = 'new') => {
    setError(null);
    setEditingDependent(index);
    
    if (index === 'new') {
      setDependentFormData({
        first_name: '',
        last_name: '',
        ssn: '',
        relationship: 'child',
        date_of_birth: '',
        months_lived: 12
      });
    } else {
      const dep = dependents[index];
      setDependentFormData({
        first_name: dep.first_name || dep.name?.split(' ')[0] || '',
        last_name: dep.last_name || dep.name?.split(' ').slice(1).join(' ') || '',
        ssn: dep.ssn || '',
        relationship: dep.relationship || 'child',
        date_of_birth: dep.date_of_birth || '',
        months_lived: dep.months_lived ?? 12
      });
    }
  };

  // Save dependent (add or update)
  const saveDependent = async () => {
    // Validation
    if (!dependentFormData.first_name.trim()) {
      setError('First name is required');
      return;
    }
    if (!dependentFormData.last_name.trim()) {
      setError('Last name is required');
      return;
    }
    const cleanSSN = dependentFormData.ssn.replace(/\D/g, '');
    if (cleanSSN.length !== 9) {
      setError('SSN must be 9 digits');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newDependent = {
        first_name: dependentFormData.first_name.trim(),
        last_name: dependentFormData.last_name.trim(),
        ssn: cleanSSN,
        relationship: dependentFormData.relationship,
        date_of_birth: dependentFormData.date_of_birth,
        months_lived: dependentFormData.months_lived
      };

      let updatedDependents;
      if (editingDependent === 'new') {
        updatedDependents = [...dependents, newDependent];
      } else {
        updatedDependents = [...dependents];
        updatedDependents[editingDependent] = newDependent;
      }

      // Try to save to backend
      if (API_BASE && userId && token) {
        try {
          const res = await fetch(`${API_BASE}/api/tax/user/${userId}/dependents`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ dependents: updatedDependents })
          });

          if (!res.ok) {
            console.warn('[DependentManager] API save returned non-OK, saving locally');
          }
        } catch (apiError) {
          console.warn('[DependentManager] API save failed, saving locally:', apiError);
        }
      }

      // Update local state
      setDependents(updatedDependents);
      setEditingDependent(null);
      
      // Trigger validation if available
      if (validateWithPython) {
        setTimeout(() => validateWithPython(), 100);
      }
    } catch (err) {
      console.error('[DependentManager] Error saving dependent:', err);
      setError('Failed to save dependent. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete dependent
  const deleteDependent = async (index) => {
    if (!window.confirm('Are you sure you want to remove this dependent?')) {
      return;
    }

    const updatedDependents = dependents.filter((_, i) => i !== index);

    // Try to save to backend
    if (API_BASE && userId && token) {
      try {
        await fetch(`${API_BASE}/api/tax/user/${userId}/dependents`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ dependents: updatedDependents })
        });
      } catch (err) {
        console.warn('[DependentManager] API delete failed:', err);
      }
    }

    setDependents(updatedDependents);
    
    if (validateWithPython) {
      setTimeout(() => validateWithPython(), 100);
    }
  };

  // Default styles if not provided
  const defaultStyles = {
    infoCard: {
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },
    infoTitle: {
      color: '#e2e8f0',
      fontSize: '16px',
      fontWeight: '600',
      margin: 0
    },
    editBtn: {
      padding: '6px 12px',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    editModal: {
      backgroundColor: '#1e293b',
      borderRadius: '16px',
      padding: '24px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflowY: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    formLabel: {
      display: 'block',
      color: '#94a3b8',
      fontSize: '12px',
      marginBottom: '6px',
      fontWeight: '500'
    },
    formInput: {
      width: '100%',
      padding: '10px 12px',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      color: '#e2e8f0',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    formRowGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px',
      marginBottom: '16px'
    },
    editModalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    },
    cancelBtn: {
      padding: '10px 20px',
      backgroundColor: 'transparent',
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    saveBtn: {
      padding: '10px 20px',
      backgroundColor: '#7c3aed',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500'
    }
  };

  const s = { ...defaultStyles, ...styles };

  return (
    <>
      {/* Dependents Card */}
      <div style={s.infoCard}>
        <div style={s.cardHeader}>
          <h4 style={s.infoTitle}>👨‍👩‍👧‍👦 Dependents ({dependents.length})</h4>
          <button 
            onClick={() => openDependentModal('new')} 
            style={{
              ...s.editBtn,
              backgroundColor: '#10b981'
            }}
          >
            + Add Child
          </button>
        </div>
        
        {dependents.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
            No dependents added. Click "Add Child" to add dependents for tax credits.
          </p>
        ) : (
          dependents.map((dep, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: idx < dependents.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontWeight: '500' }}>
                  {dep.first_name || dep.name?.split(' ')[0]} {dep.last_name || dep.name?.split(' ').slice(1).join(' ')}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {dep.relationship || 'Child'} • SSN: {maskSSN(dep.ssn)}
                  {dep.date_of_birth && ` • DOB: ${dep.date_of_birth}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => openDependentModal(idx)}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'rgba(124, 58, 237, 0.2)',
                    color: '#a78bfa',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
                <button 
                  onClick={() => deleteDependent(idx)}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
        
        {dependents.length > 0 && (
          <div style={{ 
            marginTop: '12px', 
            padding: '10px 12px', 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <p style={{ fontSize: '12px', color: '#10b981', margin: 0 }}>
              💰 Tax Credit Estimate: Up to ${(dependents.length * 2000).toLocaleString()} in Child Tax Credits
            </p>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {editingDependent !== null && (
        <div style={s.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) setEditingDependent(null);
        }}>
          <div style={s.editModal}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '20px', marginTop: 0 }}>
              {editingDependent === 'new' ? '➕ Add Dependent' : '✏️ Edit Dependent'}
            </h3>
            
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#f87171',
                fontSize: '14px'
              }}>
                ⚠️ {error}
              </div>
            )}
            
            <div>
              <div style={s.formRowGrid}>
                <div>
                  <label style={s.formLabel}>First Name *</label>
                  <input
                    type="text"
                    value={dependentFormData.first_name}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      first_name: e.target.value 
                    })}
                    style={s.formInput}
                    placeholder="Child's first name"
                  />
                </div>
                <div>
                  <label style={s.formLabel}>Last Name *</label>
                  <input
                    type="text"
                    value={dependentFormData.last_name}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      last_name: e.target.value 
                    })}
                    style={s.formInput}
                    placeholder="Child's last name"
                  />
                </div>
                <div>
                  <label style={s.formLabel}>SSN * (9 digits)</label>
                  <input
                    type="text"
                    value={formatSSNInput(dependentFormData.ssn)}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      ssn: e.target.value.replace(/\D/g, '').slice(0, 9)
                    })}
                    placeholder="XXX-XX-XXXX"
                    style={s.formInput}
                    maxLength={11}
                  />
                </div>
              </div>
              
              <div style={s.formRowGrid}>
                <div>
                  <label style={s.formLabel}>Relationship</label>
                  <select
                    value={dependentFormData.relationship}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      relationship: e.target.value 
                    })}
                    style={s.formInput}
                  >
                    <option value="child">Child</option>
                    <option value="stepchild">Stepchild</option>
                    <option value="foster_child">Foster Child</option>
                    <option value="grandchild">Grandchild</option>
                    <option value="sibling">Sibling</option>
                    <option value="parent">Parent</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={s.formLabel}>Date of Birth</label>
                  <input
                    type="date"
                    value={dependentFormData.date_of_birth}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      date_of_birth: e.target.value 
                    })}
                    style={s.formInput}
                  />
                </div>
                <div>
                  <label style={s.formLabel}>Months Lived with You</label>
                  <select
                    value={dependentFormData.months_lived}
                    onChange={(e) => setDependentFormData({ 
                      ...dependentFormData, 
                      months_lived: parseInt(e.target.value)
                    })}
                    style={s.formInput}
                  >
                    {[...Array(13)].map((_, i) => (
                      <option key={i} value={i}>{i} months</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '8px', 
                padding: '12px', 
                marginTop: '16px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p style={{ fontSize: '12px', color: '#60a5fa', margin: 0 }}>
                  ℹ️ A qualifying child must have a valid SSN, live with you for more than half the year, 
                  and be under age 17 at year end to claim the Child Tax Credit.
                </p>
              </div>
            </div>
            
            <div style={s.editModalButtons}>
              <button 
                onClick={() => setEditingDependent(null)} 
                style={s.cancelBtn}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={saveDependent}
                disabled={saving || !dependentFormData.first_name || !dependentFormData.last_name || dependentFormData.ssn.replace(/\D/g, '').length !== 9}
                style={{
                  ...s.saveBtn,
                  opacity: (saving || !dependentFormData.first_name || !dependentFormData.last_name || dependentFormData.ssn.replace(/\D/g, '').length !== 9) ? 0.5 : 1,
                  cursor: (saving || !dependentFormData.first_name || !dependentFormData.last_name || dependentFormData.ssn.replace(/\D/g, '').length !== 9) ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : (editingDependent === 'new' ? 'Add Dependent' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DependentManager;
