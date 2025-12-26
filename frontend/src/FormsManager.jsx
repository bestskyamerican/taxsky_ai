import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:3000";

export default function FormsManager({ userId, onComplete }) {
  const [forms, setForms] = useState({
    w2: [],
    "1099-nec": [],
    "1099-int": [],
    "1099-div": [],
    "1099-r": [],
    "1098": [],
    "1098-t": []
  });
  
  const [aggregated, setAggregated] = useState(null);
  const [addingFormType, setAddingFormType] = useState(null);
  const [editingForm, setEditingForm] = useState(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/forms/list`, {
        params: { userId }
      });
      setForms(res.data.forms);
      setAggregated(res.data.aggregated);
    } catch (err) {
      console.error('Error loading forms:', err);
    }
  };

  const addForm = (formType) => {
    setAddingFormType(formType);
  };

  const saveForm = async (formType, formData) => {
    try {
      await axios.post(`${API_BASE}/api/forms/add`, {
        userId,
        formType,
        formData
      });
      await loadForms(); // Reload all forms
      setAddingFormType(null);
      setEditingForm(null);
    } catch (err) {
      console.error('Error saving form:', err);
      alert('Failed to save form');
    }
  };

  const deleteForm = async (formType, formId) => {
    if (!confirm('Delete this form?')) return;
    
    try {
      await axios.delete(`${API_BASE}/api/forms/delete`, {
        data: { userId, formType, formId }
      });
      await loadForms();
    } catch (err) {
      console.error('Error deleting form:', err);
      alert('Failed to delete form');
    }
  };

  const FORM_TYPES = {
    w2: {
      name: 'W-2 (Employment)',
      icon: '💼',
      color: 'blue',
      fields: [
        { name: 'employer_name', label: 'Employer Name', type: 'text' },
        { name: 'wages', label: 'Wages (Box 1)', type: 'number' },
        { name: 'federal_withholding', label: 'Federal Tax Withheld (Box 2)', type: 'number' },
        { name: 'state_withholding', label: 'State Tax Withheld', type: 'number' }
      ]
    },
    "1099-nec": {
      name: '1099-NEC (Self-Employment)',
      icon: '💰',
      color: 'green',
      fields: [
        { name: 'payer_name', label: 'Payer/Client Name', type: 'text' },
        { name: 'income', label: 'Nonemployee Compensation (Box 1)', type: 'number' }
      ]
    },
    "1099-int": {
      name: '1099-INT (Interest)',
      icon: '🏦',
      color: 'purple',
      fields: [
        { name: 'bank_name', label: 'Bank/Payer Name', type: 'text' },
        { name: 'interest', label: 'Interest Income (Box 1)', type: 'number' }
      ]
    },
    "1099-div": {
      name: '1099-DIV (Dividends)',
      icon: '📈',
      color: 'indigo',
      fields: [
        { name: 'account_name', label: 'Account/Payer Name', type: 'text' },
        { name: 'ordinary_dividends', label: 'Ordinary Dividends (Box 1a)', type: 'number' },
        { name: 'qualified_dividends', label: 'Qualified Dividends (Box 1b)', type: 'number' }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">📋 Your Tax Documents</h1>
          <p className="text-gray-600 mt-2">
            Add all your tax forms for {new Date().getFullYear()}. You can have multiple W-2s, 1099s, etc.
          </p>
        </div>

        {/* Aggregated Summary */}
        {aggregated && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
            <h2 className="text-2xl font-bold mb-4">💰 Total Income Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm opacity-90">W-2 Wages</div>
                <div className="text-2xl font-bold">${aggregated.totalW2Wages?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Self-Employment</div>
                <div className="text-2xl font-bold">${aggregated.totalSelfEmployment?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Interest</div>
                <div className="text-2xl font-bold">${aggregated.totalInterest?.toLocaleString() || 0}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Total Income</div>
                <div className="text-2xl font-bold">${aggregated.grandTotalIncome?.toLocaleString() || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* Forms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          {/* W-2 Forms */}
          <FormSection
            formType="w2"
            forms={forms.w2}
            config={FORM_TYPES.w2}
            onAdd={() => addForm('w2')}
            onEdit={(form) => setEditingForm({ type: 'w2', data: form })}
            onDelete={(formId) => deleteForm('w2', formId)}
          />

          {/* 1099-NEC Forms */}
          <FormSection
            formType="1099-nec"
            forms={forms['1099-nec']}
            config={FORM_TYPES['1099-nec']}
            onAdd={() => addForm('1099-nec')}
            onEdit={(form) => setEditingForm({ type: '1099-nec', data: form })}
            onDelete={(formId) => deleteForm('1099-nec', formId)}
          />

          {/* 1099-INT Forms */}
          <FormSection
            formType="1099-int"
            forms={forms['1099-int']}
            config={FORM_TYPES['1099-int']}
            onAdd={() => addForm('1099-int')}
            onEdit={(form) => setEditingForm({ type: '1099-int', data: form })}
            onDelete={(formId) => deleteForm('1099-int', formId)}
          />

          {/* 1099-DIV Forms */}
          <FormSection
            formType="1099-div"
            forms={forms['1099-div']}
            config={FORM_TYPES['1099-div']}
            onAdd={() => addForm('1099-div')}
            onEdit={(form) => setEditingForm({ type: '1099-div', data: form })}
            onDelete={(formId) => deleteForm('1099-div', formId)}
          />
        </div>

        {/* Form Editor Modal */}
        {(addingFormType || editingForm) && (
          <FormEditor
            formType={addingFormType || editingForm?.type}
            formData={editingForm?.data}
            config={FORM_TYPES[addingFormType || editingForm?.type]}
            onSave={(data) => saveForm(addingFormType || editingForm?.type, data)}
            onCancel={() => {
              setAddingFormType(null);
              setEditingForm(null);
            }}
          />
        )}

        {/* Continue Button */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-gray-800">Ready to continue?</div>
              <div className="text-sm text-gray-600">
                {aggregated?.grandTotalIncome > 0 
                  ? `You've added ${getTotalFormsCount(forms)} form(s) totaling $${aggregated.grandTotalIncome.toLocaleString()}`
                  : 'Add at least one tax form to continue'
                }
              </div>
            </div>
            <button
              onClick={onComplete}
              disabled={!aggregated || aggregated.grandTotalIncome === 0}
              className={`px-6 py-3 rounded-lg font-semibold ${
                aggregated?.grandTotalIncome > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Interview →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Form Section Component
function FormSection({ formType, forms, config, onAdd, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>{config.icon}</span>
          <span>{config.name}</span>
          <span className="text-sm font-normal text-gray-500">({forms.length})</span>
        </h3>
        <button
          onClick={onAdd}
          className={`bg-${config.color}-600 text-white px-4 py-2 rounded-lg hover:bg-${config.color}-700 text-sm font-medium`}
        >
          + Add
        </button>
      </div>

      {forms.length === 0 ? (
        <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          No {config.name} added yet
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map((form, idx) => (
            <div key={form.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {form.employer_name || form.payer_name || form.bank_name || form.account_name || `Form ${idx + 1}`}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formType === 'w2' && `Wages: $${form.wages?.toLocaleString()}`}
                    {formType === '1099-nec' && `Income: $${form.income?.toLocaleString()}`}
                    {formType === '1099-int' && `Interest: $${form.interest?.toLocaleString()}`}
                    {formType === '1099-div' && `Dividends: $${form.ordinary_dividends?.toLocaleString()}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(form)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(form.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Form Editor Modal
function FormEditor({ formType, formData, config, onSave, onCancel }) {
  const [data, setData] = useState(formData || {});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span>{config.icon}</span>
              <span>{formData ? 'Edit' : 'Add'} {config.name}</span>
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {config.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={data[field.name] || ''}
                  onChange={(e) => setData({
                    ...data,
                    [field.name]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                  })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>
            ))}
          </div>

          <div className="p-6 border-t flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper
function getTotalFormsCount(forms) {
  return Object.values(forms).reduce((sum, arr) => sum + arr.length, 0);
}
