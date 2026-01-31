// ============================================================
// FAQ PAGE - TaxSky AI
// ============================================================
// Route: /faq
// Has smart back button that goes to home if no history
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Home,
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Search,
  Shield,
  CreditCard,
  FileText,
  Clock,
  Mail
} from 'lucide-react';

export default function FAQPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState({});

  // ✅ Smart back function - go home if no history
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: FileText,
      color: 'indigo',
      questions: [
        {
          id: 'gs1',
          question: 'What is TaxSky AI?',
          answer: 'TaxSky AI is a conversational tax preparation software that helps you file your taxes through simple chat. Instead of filling out complicated forms, you just answer questions in plain English (or Spanish/Vietnamese), and our AI prepares your tax return.'
        },
        {
          id: 'gs2',
          question: 'Is TaxSky AI a CPA or tax professional?',
          answer: 'No. TaxSky AI is tax preparation SOFTWARE, not a licensed CPA, tax attorney, or financial advisor. You are preparing your OWN tax return using our software tools. For complex tax situations, we recommend consulting a licensed tax professional.'
        },
        {
          id: 'gs3',
          question: 'How long does it take to file my taxes?',
          answer: 'Most users complete their federal tax return in 15-30 minutes. Simple returns (W-2 income only) can be done in as little as 10 minutes. More complex situations with multiple income sources may take longer.'
        },
        {
          id: 'gs4',
          question: 'What documents do I need?',
          answer: 'You\'ll need your W-2 forms, 1099 forms (if applicable), Social Security numbers for yourself and dependents, and bank account information for direct deposit. Have these ready before you start.'
        },
      ]
    },
    {
      title: 'Pricing & Refunds',
      icon: CreditCard,
      color: 'emerald',
      questions: [
        {
          id: 'pr1',
          question: 'How much does TaxSky AI cost?',
          answer: 'We offer several plans: Free (for simple returns), Standard ($29.99 for W-2 + common deductions), and Premium ($59.99 for self-employment, investments, and priority support). State filing is additional.'
        },
        {
          id: 'pr2',
          question: 'When will I get my refund?',
          answer: 'If you choose direct deposit and e-file, most refunds arrive within 21 days of IRS acceptance. Paper checks take 4-6 weeks. You can check your refund status at irs.gov/refunds.'
        },
        {
          id: 'pr3',
          question: 'What if I owe taxes instead of getting a refund?',
          answer: 'TaxSky AI will calculate what you owe and provide payment options. You can pay directly through IRS Direct Pay, by check, or set up a payment plan with the IRS.'
        },
        {
          id: 'pr4',
          question: 'Can I get a refund of the TaxSky service fee?',
          answer: 'Yes, we offer a satisfaction guarantee. If you\'re not satisfied before filing, contact support for a full refund. After filing, refunds are handled case-by-case.'
        },
      ]
    },
    {
      title: 'Tax Situations',
      icon: HelpCircle,
      color: 'purple',
      questions: [
        {
          id: 'ts1',
          question: 'Can I file if I have W-2 income?',
          answer: 'Yes! W-2 income from employment is fully supported. Just have your W-2 form ready and our AI will guide you through entering the information.'
        },
        {
          id: 'ts2',
          question: 'Do you support 1099 / self-employment income?',
          answer: 'Yes, our Standard and Premium plans support 1099-NEC, 1099-MISC, and Schedule C for self-employment income. We\'ll help you track deductions too.'
        },
        {
          id: 'ts3',
          question: 'Can I claim dependents?',
          answer: 'Absolutely! TaxSky AI helps you claim qualifying children and relatives as dependents, and calculates credits like the Child Tax Credit and Earned Income Credit.'
        },
        {
          id: 'ts4',
          question: 'Do you support state tax filing?',
          answer: 'Yes, we support all 50 states. State filing is available as an add-on. Some states have no income tax (like Texas and Florida).'
        },
      ]
    },
    {
      title: 'Security & Privacy',
      icon: Shield,
      color: 'cyan',
      questions: [
        {
          id: 'sp1',
          question: 'Is my data secure?',
          answer: 'Yes. We use 256-bit SSL encryption for all data transmission and AES-256 encryption for stored data. We\'re SOC 2 compliant and follow IRS Publication 4557 security requirements.'
        },
        {
          id: 'sp2',
          question: 'Do you sell my data?',
          answer: 'Absolutely NOT. We never sell, rent, or trade your personal or financial information to third parties. Your data is only shared with the IRS and state agencies to file your return.'
        },
        {
          id: 'sp3',
          question: 'How long do you keep my data?',
          answer: 'We retain tax returns for 7 years (IRS requirement). You can request deletion of your account at any time, subject to legal retention requirements.'
        },
        {
          id: 'sp4',
          question: 'Is TaxSky AI an authorized IRS e-file provider?',
          answer: 'Yes, TaxSky AI is an IRS-authorized e-file provider. Your returns are transmitted securely to the IRS through official channels.'
        },
      ]
    },
    {
      title: 'Technical Support',
      icon: Clock,
      color: 'amber',
      questions: [
        {
          id: 'tech1',
          question: 'What if I make a mistake?',
          answer: 'You can review and edit all your information before filing. If you\'ve already filed and find an error, you can file an amended return (Form 1040-X) through TaxSky AI.'
        },
        {
          id: 'tech2',
          question: 'Can I save my progress and continue later?',
          answer: 'Yes! Your progress is automatically saved. Just log back in with your Google account to continue where you left off.'
        },
        {
          id: 'tech3',
          question: 'What browsers are supported?',
          answer: 'TaxSky AI works on all modern browsers: Chrome, Firefox, Safari, and Edge. We also have mobile-optimized experience for phones and tablets.'
        },
        {
          id: 'tech4',
          question: 'How do I contact support?',
          answer: 'You can reach us at support@taxsky.ai or call +1-844-TAX-SKY1 (844-829-7591). Premium users get priority support with faster response times.'
        },
      ]
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    };
    return colors[color] || colors.indigo;
  };

  // Filter FAQs based on search
  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.1),transparent_70%)]" />
      </div>

      {/* Header */}
      <div className="relative border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-white font-semibold">TaxSky AI</span>
          </div>
          <Link 
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-indigo-500/30">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-slate-400">Find answers to common questions about TaxSky AI</p>
        </div>

        {/* Search */}
        <div className="relative mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const colors = getColorClasses(category.color);
            
            return (
              <div key={category.title}>
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center border ${colors.border}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <h2 className="text-xl font-bold text-white">{category.title}</h2>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  {category.questions.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white/[0.03] backdrop-blur border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                      >
                        <span className="text-white font-medium pr-4">{item.question}</span>
                        {openItems[item.id] ? (
                          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                      {openItems[item.id] && (
                        <div className="px-6 pb-4">
                          <p className="text-slate-400 leading-relaxed">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No questions found matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 text-indigo-400 hover:text-indigo-300"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Contact Box */}
        <div className="mt-12 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl p-8 border border-indigo-500/20 text-center">
          <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-slate-400 mb-6">Our support team is here to help!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@taxsky.ai"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 transition-all"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </a>
            <a
              href="tel:+18448297591"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/10"
            >
              📞 +1-844-TAX-SKY1
            </a>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-white/10 flex justify-center gap-4">
          <Link 
            to="/terms"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-slate-600">•</span>
          <Link 
            to="/privacy"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}