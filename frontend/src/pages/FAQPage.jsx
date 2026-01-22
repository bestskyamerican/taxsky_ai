// ============================================================
// TAXSKY 2025 - FAQ PAGE v2.0
// ============================================================
// Updated UI colors to match TaxSky brand guidelines
// Dark theme with indigo/purple accents
// ============================================================

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  MessageCircle, 
  Shield, 
  Clock, 
  DollarSign, 
  FileText,
  HelpCircle,
  Mail,
  Phone
} from 'lucide-react';

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle, color: 'indigo' },
    { id: 'getting-started', name: 'Getting Started', icon: FileText, color: 'cyan' },
    { id: 'security', name: 'Security & Privacy', icon: Shield, color: 'emerald' },
    { id: 'pricing', name: 'Pricing & Billing', icon: DollarSign, color: 'amber' },
    { id: 'filing', name: 'Tax Filing', icon: Clock, color: 'purple' },
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: 'Do I need to upload my W-2 form?',
      answer: 'No! TaxSky AI is different. You simply answer questions in a chat conversation, and we extract all the necessary information. No document uploads required. Just tell us your income, and we\'ll handle the rest.'
    },
    {
      category: 'security',
      question: 'Is my Social Security Number (SSN) safe?',
      answer: 'Absolutely. We use 256-bit SSL encryption, the same level of security used by major banks. Your SSN is entered only in our secure form at the final step, never in the chat. We are SOC 2 compliant and never store your full SSN in plain text.'
    },
    {
      category: 'getting-started',
      question: 'How long does it take to file my taxes?',
      answer: 'Most users complete their tax return in just 15-20 minutes. Our AI-powered chat makes the process fast and simple by asking only relevant questions based on your situation.'
    },
    {
      category: 'pricing',
      question: 'Is TaxSky AI free to use?',
      answer: 'You can start for free and see your estimated refund or tax owed at no cost. To file your return with the IRS, our pricing starts at $29.99 for basic returns. Complex returns with multiple forms may cost more.'
    },
    {
      category: 'filing',
      question: 'What tax forms does TaxSky support?',
      answer: 'We support W-2 (employment income), 1099-NEC (self-employment), 1099-INT (interest), 1099-DIV (dividends), 1099-R (retirement), 1099-G (unemployment), 1099-B (stock sales), and SSA-1099 (Social Security). We also handle IRA contributions, HSA contributions, and student loan interest deductions.'
    },
    {
      category: 'filing',
      question: 'Can I file both federal and state taxes?',
      answer: 'Yes! TaxSky supports federal tax filing and state tax filing for all 50 states. State filing is available as an add-on for $19.99.'
    },
    {
      category: 'security',
      question: 'What happens to my data after I file?',
      answer: 'Your tax data is securely stored for 7 years as required by IRS regulations. You can access your past returns anytime. We never sell your data to third parties. You can request data deletion at any time after the retention period.'
    },
    {
      category: 'pricing',
      question: 'What if I make a mistake on my return?',
      answer: 'Don\'t worry! You can review and edit your information at any time before filing. Our AI also performs automatic checks to catch common errors. If you need to amend a return after filing, we can help with that too.'
    },
    {
      category: 'filing',
      question: 'How do I get my refund?',
      answer: 'You can choose direct deposit (fastest, usually 7-21 days) or request a paper check from the IRS. We\'ll ask for your bank information securely during the final filing step.'
    },
    {
      category: 'getting-started',
      question: 'Can my spouse and I file jointly?',
      answer: 'Yes! TaxSky fully supports Married Filing Jointly status. We\'ll collect income information for both you and your spouse and calculate the combined tax liability.'
    },
    {
      category: 'pricing',
      question: 'Do you offer CPA review?',
      answer: 'Yes! Our Premium plan includes a CPA review where a certified professional reviews your return before filing. This adds an extra layer of confidence and is available for an additional $49.99.'
    },
    {
      category: 'security',
      question: 'Are you IRS authorized?',
      answer: 'Yes, TaxSky is an IRS-authorized e-file provider. Your returns are transmitted directly and securely to the IRS through our certified connection.'
    },
  ];

  const getCategoryColor = (categoryId) => {
    const colors = {
      'getting-started': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      'security': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      'pricing': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
      'filing': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    };
    return colors[categoryId] || { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' };
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_70%)]" />
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-indigo-500/30">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Find answers to common questions about TaxSky AI
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 mb-10 justify-center">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] border border-white/10 hover:border-white/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const colors = getCategoryColor(faq.category);
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`bg-white/[0.03] backdrop-blur rounded-2xl border transition-all ${
                  isOpen ? 'border-indigo-500/30' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center"
                >
                  <div className="flex items-start gap-4 pr-4">
                    <span className={`hidden sm:flex mt-0.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {faq.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    <span className="font-medium text-white">{faq.question}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isOpen ? 'bg-indigo-500/20' : 'bg-white/5'
                  }`}>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-slate-400 leading-relaxed border-t border-white/5 pt-4 ml-0 sm:ml-[88px]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No questions found.</p>
            <p className="text-slate-600 text-sm mt-2">Try adjusting your search or filter.</p>
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur rounded-3xl p-8 md:p-10 text-center border border-indigo-500/20">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Still have questions?</h2>
          <p className="text-slate-400 mb-8">Our support team is here to help you 24/7</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@taxsky.ai"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
            >
              <Mail className="w-5 h-5" />
              Contact Support
            </a>
            <a
              href="tel:+18448297591"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
            >
              <Phone className="w-5 h-5" />
              1-844-TAX-SKY1
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;