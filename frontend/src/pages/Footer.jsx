// ============================================================
// TAXSKY 2025 - FOOTER COMPONENT v2.0
// ============================================================
// ✅ Added: COMPANY column with FAQ, Investor, Career, News
// ✅ Updated: 4-column responsive layout
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Twitter, 
  Linkedin, 
  Youtube, 
  Instagram,
  Shield,
  FileCheck,
  Lock
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Column 1: Contact */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">
                  123 Tax Street, Suite 100<br />
                  San Jose, CA 95110
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-pink-500 flex-shrink-0" />
                <a 
                  href="tel:+18448297591" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  +1-844-TAX-SKY1 (844-829-7591)
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <a 
                  href="mailto:support@taxsky.ai" 
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  support@taxsky.ai
                </a>
              </li>
            </ul>
            
            {/* Social Links */}
            <div className="flex gap-3 mt-6">
              <a 
                href="https://twitter.com/taxskyai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://linkedin.com/company/taxskyai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a 
                href="https://youtube.com/@taxskyai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a 
                href="https://instagram.com/taxskyai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider">
              Services
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/services/federal" className="text-gray-400 hover:text-white transition-colors">
                  Federal Tax Filing
                </Link>
              </li>
              <li>
                <Link to="/services/state" className="text-gray-400 hover:text-white transition-colors">
                  State Tax Filing
                </Link>
              </li>
              <li>
                <Link to="/services/self-employment" className="text-gray-400 hover:text-white transition-colors">
                  Self-Employment Taxes
                </Link>
              </li>
              <li>
                <Link to="/services/1099" className="text-gray-400 hover:text-white transition-colors">
                  1099 Processing
                </Link>
              </li>
              <li>
                <Link to="/calculator" className="text-gray-400 hover:text-white transition-colors">
                  Tax Refund Calculator
                </Link>
              </li>
              <li>
                <Link to="/cpa" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <span>🧑‍💼</span> CPA Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company (NEW!) */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/investor" className="text-gray-400 hover:text-white transition-colors">
                  Investor Relations
                </Link>
              </li>
              <li>
                <Link to="/career" className="text-gray-400 hover:text-white transition-colors">
                  Career
                </Link>
              </li>
              <li>
                <Link to="/news" className="text-gray-400 hover:text-white transition-colors">
                  News
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: About Us / Trust Badges */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6 uppercase tracking-wider">
              About Us
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              TaxSky AI is dedicated to providing smart, AI-powered tax preparation solutions. 
              Our mission is to maximize your refund while minimizing your stress. 
              File taxes through simple chat - no forms, no uploads, just answers.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
                <FileCheck className="w-3.5 h-3.5" />
                IRS E-File
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
                <Shield className="w-3.5 h-3.5" />
                SOC 2
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
                <Lock className="w-3.5 h-3.5" />
                256-bit SSL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} TaxSky AI. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-gray-500 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/security" className="text-gray-500 hover:text-white transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
