// ============================================================
// TERMS OF SERVICE PAGE - TaxSky AI
// ============================================================
// Route: /terms
// FIXED: Back button now goes to home if no history
// ============================================================

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, Home } from 'lucide-react';

export default function TermsOfService() {
  const navigate = useNavigate();

  // ✅ FIXED: Smart back function - go home if no history
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

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
            <FileText className="w-4 h-4" />
            Legal Agreement
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">Last Updated: January 30, 2025</p>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-amber-400 font-semibold mb-2">Important Notice</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                TaxSky AI is tax preparation SOFTWARE, not a licensed CPA, tax attorney, or financial advisor. 
                By using our service, you acknowledge that you are preparing your own tax return.
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8 text-slate-300">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using TaxSky AI ("Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">2. Nature of Service</h2>
            <p className="mb-4">
              TaxSky AI is tax preparation software designed to help you prepare your own tax return. 
              Our Service:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Is NOT a Certified Public Accountant (CPA) firm</li>
              <li>Is NOT a tax attorney or law firm</li>
              <li>Is NOT an enrolled agent</li>
              <li>Is NOT a licensed tax professional</li>
              <li>Does NOT provide personalized tax, legal, or financial advice</li>
            </ul>
            <p className="mt-4">
              We provide software tools and AI-assisted guidance to help you prepare your own tax return. 
              The final responsibility for your tax return rests with you.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">3. Your Responsibilities</h2>
            <p className="mb-4">By using TaxSky AI, you agree that:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>You are preparing your OWN tax return</li>
              <li>You are responsible for the accuracy of all information you enter</li>
              <li>You will review your tax return before filing</li>
              <li>You will consult a licensed tax professional for complex tax situations</li>
              <li>You are authorized to file the tax return (it is your own or you have proper authorization)</li>
              <li>All information you provide is truthful and accurate</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">4. No Guarantees</h2>
            <p className="mb-4">TaxSky AI does NOT guarantee:</p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Specific refund amounts (all calculations are estimates that may vary from actual results)</li>
              <li>IRS or state acceptance of your return</li>
              <li>Freedom from IRS audit, review, or penalties</li>
              <li>Accuracy of calculations if incorrect information is provided</li>
              <li>Any specific tax outcome</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p className="mb-4 text-amber-400 uppercase text-sm font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAXSKY AI SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Any errors or omissions in your tax return</li>
              <li>IRS penalties, interest, or audit outcomes</li>
              <li>State tax penalties or assessments</li>
              <li>Lost refunds or additional taxes owed</li>
              <li>Any indirect, incidental, special, or consequential damages</li>
            </ul>
            <p className="mt-4">
              Our maximum liability is limited to the fees you paid for our Service in the applicable tax year.
            </p>
          </section>

          {/* Section 6 - CPA Partner Services */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">6. CPA Partner Services</h2>
            <p className="mb-4">
              TaxSky AI offers optional CPA review and filing services through our network of licensed 
              Certified Public Accountants ("CPA Partners"). When you select CPA services:
            </p>
            <ul className="list-disc ml-6 space-y-2 mb-4">
              <li>Your tax return and personal information will be shared with a licensed CPA Partner</li>
              <li>The CPA Partner will review your return for accuracy and completeness</li>
              <li>The CPA Partner may contact you for additional information or clarification</li>
              <li>The CPA Partner will file your return with the IRS and applicable state agencies</li>
              <li>The CPA Partner is independently licensed and responsible for their professional services</li>
            </ul>
            <p className="mb-4">
              By selecting CPA services, you authorize TaxSky AI to share your tax information with our 
              CPA Partners for the purpose of reviewing and filing your tax return.
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <h3 className="text-blue-400 font-semibold mb-2">CPA Partner Relationship</h3>
              <p className="text-slate-400 text-sm">
                CPA Partners are independent licensed professionals, not employees of TaxSky AI. 
                The CPA Partner is responsible for their professional services and maintains their own 
                professional liability insurance. TaxSky AI facilitates the connection but does not 
                provide CPA services directly.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">7. Electronic Filing Authorization</h2>
            <p className="mb-4">
              When you choose to electronically file your tax return through TaxSky AI, you authorize us to:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Transmit your tax return to the IRS and applicable state tax agencies</li>
              <li>Receive acknowledgment of your filing</li>
              <li>Receive information about your refund status</li>
            </ul>
            <p className="mt-4">
              You confirm that all information in your return is accurate and complete to the best of your knowledge.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">8. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. 
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">9. Intellectual Property</h2>
            <p>
              All content, features, and functionality of TaxSky AI are owned by us and are protected 
              by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">10. Modifications to Service</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of our Service at any time. 
              We may also update these Terms of Service from time to time. Continued use of the Service 
              after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">11. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of California, 
              without regard to its conflict of law provisions.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-xl font-bold text-white mb-4">12. Dispute Resolution</h2>
            <p>
              Any disputes arising from these Terms or your use of TaxSky AI shall be resolved through 
              binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl p-8 border border-indigo-500/20">
            <h2 className="text-xl font-bold text-white mb-4">12. Contact Us</h2>
            <p className="mb-4">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <div className="space-y-2">
              <p>📧 Email: <a href="mailto:support@taxsky.ai" className="text-indigo-400 hover:underline">support@taxsky.ai</a></p>
              <p>📞 Phone: +1-844-TAX-SKY1 (844-829-7591)</p>
            </div>
          </section>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="text-blue-400 font-semibold mb-2">💡 Need Professional Tax Advice?</h3>
            <p className="text-slate-400 text-sm">
              If you have a complex tax situation, we recommend consulting with a licensed CPA or tax attorney. 
              TaxSky AI is designed for straightforward tax situations and self-preparation.
            </p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <Link 
            to="/privacy"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
          >
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}