// ============================================================
// TAXSKY 2025 - INVESTOR RELATIONS PAGE v2.0
// ============================================================
// Updated UI colors to match TaxSky brand guidelines
// Added: Financial Metrics, Milestones, Press Coverage sections
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Globe, 
  ArrowRight,
  FileText,
  Mail,
  Building,
  BarChart3,
  Shield,
  Zap,
  Calendar,
  Award,
  Newspaper,
  Target,
  PieChart,
  ArrowUpRight,
  CheckCircle,
  Play,
  Download,
  ExternalLink
} from 'lucide-react';

const InvestorPage = () => {
  const [activeQuarter, setActiveQuarter] = useState('Q4 2024');

  const stats = [
    { label: 'Tax Returns Filed', value: '500K+', icon: FileText, change: '+127% YoY' },
    { label: 'Active Users', value: '1M+', icon: Users, change: '+89% YoY' },
    { label: 'Total Refunds', value: '$2B+', icon: DollarSign, change: '+156% YoY' },
    { label: 'States Supported', value: '50', icon: Globe, change: 'All US States' },
  ];

  const highlights = [
    {
      title: 'AI-First Approach',
      description: 'Revolutionary conversational tax filing powered by advanced AI technology. No forms, no uploads - just simple questions and answers.',
      icon: Zap,
      color: 'indigo',
    },
    {
      title: 'Massive Market',
      description: '$12B+ tax preparation market with 150M+ Americans filing annually. TaxSky is positioned to capture significant market share.',
      icon: BarChart3,
      color: 'purple',
    },
    {
      title: 'Strong Unit Economics',
      description: 'High margins, low customer acquisition cost, and strong retention rates. Our AI-driven model scales efficiently.',
      icon: TrendingUp,
      color: 'emerald',
    },
    {
      title: 'Bank-Level Security',
      description: 'SOC 2 compliant, IRS authorized e-file provider with 256-bit encryption. Trust and security are our foundation.',
      icon: Shield,
      color: 'cyan',
    },
  ];

  const financialMetrics = [
    { label: 'Annual Recurring Revenue', value: '$18.5M', change: '+142%', period: 'YoY Growth' },
    { label: 'Gross Margin', value: '78%', change: '+8pts', period: 'vs Prior Year' },
    { label: 'Customer Acquisition Cost', value: '$12', change: '-34%', period: 'YoY Improvement' },
    { label: 'Lifetime Value', value: '$156', change: '+67%', period: 'Per Customer' },
    { label: 'Net Revenue Retention', value: '124%', change: '+15pts', period: 'YoY Growth' },
    { label: 'Monthly Active Users', value: '847K', change: '+95%', period: 'Peak Season' },
  ];

  const quarterlyData = {
    'Q4 2024': { revenue: '$6.2M', users: '312K', returns: '145K', nps: 72 },
    'Q3 2024': { revenue: '$3.8M', users: '245K', returns: '89K', nps: 68 },
    'Q2 2024': { revenue: '$2.1M', users: '198K', returns: '52K', nps: 65 },
    'Q1 2024': { revenue: '$8.4M', users: '523K', returns: '287K', nps: 71 },
  };

  const milestones = [
    {
      date: 'January 2025',
      title: 'Launch 2025 Tax Season',
      description: 'Introduced new AI chat interface with 40% faster completion times',
      status: 'completed',
    },
    {
      date: 'November 2024',
      title: 'Series B Funding',
      description: 'Raised $50M led by Sequoia Capital at $320M valuation',
      status: 'completed',
    },
    {
      date: 'October 2024',
      title: '50-State Coverage',
      description: 'Expanded state tax filing support to all 50 US states',
      status: 'completed',
    },
    {
      date: 'August 2024',
      title: '1 Million Users',
      description: 'Reached milestone of 1M registered users on the platform',
      status: 'completed',
    },
    {
      date: 'May 2024',
      title: 'CPA Review Launch',
      description: 'Introduced optional CPA review feature for premium users',
      status: 'completed',
    },
    {
      date: 'Q2 2025',
      title: 'International Expansion',
      description: 'Planned launch in Canada and UK markets',
      status: 'upcoming',
    },
    {
      date: 'Q3 2025',
      title: 'Business Tax Filing',
      description: 'Expand to small business and Schedule C filing',
      status: 'upcoming',
    },
  ];

  const pressCoverage = [
    {
      outlet: 'TechCrunch',
      title: 'TaxSky AI raises $50M to make tax filing as easy as texting',
      date: 'Nov 28, 2024',
      logo: 'TC',
    },
    {
      outlet: 'Forbes',
      title: 'How AI is Disrupting the $12B Tax Preparation Industry',
      date: 'Oct 15, 2024',
      logo: 'F',
    },
    {
      outlet: 'Wall Street Journal',
      title: 'The Future of Tax Filing: Conversation Over Forms',
      date: 'Sep 22, 2024',
      logo: 'WSJ',
    },
    {
      outlet: 'Bloomberg',
      title: 'TaxSky AI Reaches 1M Users, Eyes International Growth',
      date: 'Aug 10, 2024',
      logo: 'B',
    },
  ];

  const team = [
    {
      name: 'Leadership Team',
      description: 'Experienced founders from leading fintech companies including Intuit, H&R Block, and top AI research labs.',
      icon: Users,
    },
    {
      name: 'Advisory Board',
      description: 'Tax professionals, CPAs, and technology experts guiding our product and compliance strategy.',
      icon: Award,
    },
    {
      name: 'Engineering',
      description: 'World-class AI and machine learning engineers building the future of tax preparation.',
      icon: Zap,
    },
  ];

  const investors = [
    { name: 'Sequoia Capital', type: 'Lead - Series B' },
    { name: 'Andreessen Horowitz', type: 'Series A' },
    { name: 'Y Combinator', type: 'Seed' },
    { name: 'Ribbit Capital', type: 'Series B' },
  ];

  const getColorClasses = (color) => {
    const colors = {
      indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_70%)]" />
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-500/30">
              <TrendingUp className="w-4 h-4" />
              Investor Relations
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Revolutionizing Tax Filing with AI
            </h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              TaxSky AI is transforming how Americans file their taxes. Join us in building 
              the future of financial services through conversational AI technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="mailto:investors@taxsky.ai"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
              >
                <Mail className="w-5 h-5" />
                Contact Investor Relations
              </a>
              <a 
                href="/downloads/taxsky-investor-deck.pdf"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
              >
                <Download className="w-5 h-5" />
                Download Investor Deck
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative bg-[#0f0f18] py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl mb-4 border border-indigo-500/20">
                    <Icon className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-slate-400 mb-2">{stat.label}</div>
                  <div className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium">
                    <ArrowUpRight className="w-3 h-3" />
                    {stat.change}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Financial Metrics Section - NEW */}
      <div className="relative py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-purple-500/30">
              <PieChart className="w-4 h-4" />
              Financial Performance
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Key Financial Metrics
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Strong growth across all key performance indicators
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialMetrics.map((metric, index) => (
              <div 
                key={index}
                className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-slate-400 text-sm">{metric.label}</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <ArrowUpRight className="w-3 h-3" />
                    {metric.change}
                  </span>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-sm text-slate-500">{metric.period}</div>
              </div>
            ))}
          </div>

          {/* Quarterly Performance */}
          <div className="mt-12 bg-white/[0.03] backdrop-blur rounded-2xl p-8 border border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white mb-4 md:mb-0">Quarterly Performance</h3>
              <div className="flex gap-2">
                {Object.keys(quarterlyData).map((quarter) => (
                  <button
                    key={quarter}
                    onClick={() => setActiveQuarter(quarter)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeQuarter === quarter
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {quarter}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{quarterlyData[activeQuarter].revenue}</div>
                <div className="text-sm text-slate-400">Revenue</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{quarterlyData[activeQuarter].users}</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-white">{quarterlyData[activeQuarter].returns}</div>
                <div className="text-sm text-slate-400">Returns Filed</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <div className="text-2xl font-bold text-emerald-400">{quarterlyData[activeQuarter].nps}</div>
                <div className="text-sm text-slate-400">NPS Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Highlights */}
      <div className="relative py-20 bg-[#0f0f18]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-indigo-500/30">
              <Target className="w-4 h-4" />
              Investment Thesis
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Investment Highlights
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Why TaxSky AI represents a compelling opportunity in the fintech space
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {highlights.map((highlight, index) => {
              const Icon = highlight.icon;
              const colors = getColorClasses(highlight.color);
              return (
                <div 
                  key={index}
                  className="bg-white/[0.03] backdrop-blur rounded-2xl p-8 border border-white/10 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 ${colors.bg} rounded-2xl mb-6 border ${colors.border}`}>
                    <Icon className={`w-7 h-7 ${colors.text}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {highlight.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestones Section - NEW */}
      <div className="relative py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-cyan-500/30">
              <Calendar className="w-4 h-4" />
              Company Timeline
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Key Milestones
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Our journey from startup to market leader
            </p>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500 via-purple-500 to-cyan-500 opacity-30" />
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div 
                  key={index}
                  className={`relative flex flex-col md:flex-row gap-4 md:gap-8 ${
                    index % 2 === 0 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-1/2 w-3 h-3 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 border-4 border-[#0a0a0f]" />
                  
                  {/* Content */}
                  <div className={`ml-10 md:ml-0 md:w-1/2 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                    <div className={`bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 ${
                      milestone.status === 'completed' ? 'hover:border-emerald-500/30' : 'hover:border-amber-500/30'
                    } transition-colors`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          milestone.status === 'completed' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {milestone.date}
                        </span>
                        {milestone.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{milestone.title}</h3>
                      <p className="text-slate-400 text-sm">{milestone.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Press Coverage Section - NEW */}
      <div className="relative py-20 bg-[#0f0f18]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-rose-500/30">
              <Newspaper className="w-4 h-4" />
              In The News
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Press Coverage
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              What leading publications are saying about TaxSky AI
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {pressCoverage.map((press, index) => (
              <a 
                key={index}
                href="#"
                className="group bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all flex gap-4"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-600">
                  <span className="text-white font-bold text-sm">{press.logo}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-400 font-medium text-sm">{press.outlet}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500 text-sm">{press.date}</span>
                  </div>
                  <h3 className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                    {press.title}
                  </h3>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link 
              to="/news"
              className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
            >
              View all press coverage
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Investors Section - NEW */}
      <div className="relative py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Backed by Leading Investors
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              World-class investors supporting our mission
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {investors.map((investor, index) => (
              <div 
                key={index}
                className="bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 text-center hover:border-indigo-500/30 transition-colors"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-slate-600">
                  <Building className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{investor.name}</h3>
                <p className="text-slate-500 text-sm">{investor.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="relative bg-gradient-to-br from-[#0f0f18] via-[#1a1a2e] to-[#0f0f18] text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-amber-500/30">
              <Users className="w-4 h-4" />
              Our People
            </div>
            <h2 className="text-3xl font-bold mb-4">World-Class Team</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Our team brings decades of experience from leading fintech and AI companies
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {team.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={index}
                  className="bg-white/[0.03] backdrop-blur rounded-2xl p-8 border border-white/10 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20">
                    <Icon className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{item.name}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="relative py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur rounded-3xl p-12 border border-indigo-500/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-lg mx-auto">
              Interested in learning more about investment opportunities with TaxSky AI? 
              Contact our investor relations team.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-sm text-slate-500 mb-1">Email</div>
                <a 
                  href="mailto:investors@taxsky.ai" 
                  className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                >
                  investors@taxsky.ai
                </a>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-sm text-slate-500 mb-1">Headquarters</div>
                <p className="text-white font-medium">San Jose, California</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="text-sm text-slate-500 mb-1">Founded</div>
                <p className="text-white font-medium">2022</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:investors@taxsky.ai"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
              >
                <Mail className="w-5 h-5" />
                Contact Investor Relations
              </a>
              <a
                href="/downloads/taxsky-investor-deck.pdf"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
              >
                <Download className="w-5 h-5" />
                Download Investor Deck
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorPage;