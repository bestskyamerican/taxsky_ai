// ============================================================
// TAXSKY 2025 - NEWS PAGE v2.0
// ============================================================
// Updated UI colors to match TaxSky brand guidelines
// - Dark theme with indigo/purple accents
// - Glassmorphism cards
// - Gradient effects
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  ArrowRight, 
  Tag, 
  Newspaper, 
  Award, 
  Users, 
  Megaphone,
  ExternalLink,
  Download,
  Mail,
  Search,
  TrendingUp,
  Clock,
  ChevronRight
} from 'lucide-react';

const NewsPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All News', icon: Newspaper, color: 'indigo' },
    { id: 'press', name: 'Press Releases', icon: Megaphone, color: 'purple' },
    { id: 'product', name: 'Product Updates', icon: Tag, color: 'cyan' },
    { id: 'company', name: 'Company News', icon: Users, color: 'emerald' },
    { id: 'awards', name: 'Awards', icon: Award, color: 'amber' },
  ];

  const newsItems = [
    {
      id: 1,
      category: 'press',
      date: 'January 15, 2025',
      title: 'TaxSky AI Launches Revolutionary Chat-Based Tax Filing for 2025 Season',
      excerpt: 'TaxSky AI announces the launch of its innovative conversational tax filing platform, eliminating the need for form uploads and simplifying the tax filing process for millions of Americans.',
      image: '/images/news/launch-2025.jpg',
      featured: true,
      readTime: '4 min read',
    },
    {
      id: 2,
      category: 'product',
      date: 'January 10, 2025',
      title: 'New Feature: Instant Tax Refund Estimates',
      excerpt: 'Our AI can now provide instant refund or tax owed estimates as you chat, giving you real-time visibility into your tax situation.',
      image: '/images/news/instant-estimate.jpg',
      featured: false,
      readTime: '3 min read',
    },
    {
      id: 3,
      category: 'awards',
      date: 'December 20, 2024',
      title: 'TaxSky AI Named "Best AI Tax Solution" by Fintech Magazine',
      excerpt: 'We\'re honored to receive this recognition for our innovative approach to making tax filing simple and accessible for everyone.',
      image: '/images/news/award.jpg',
      featured: false,
      readTime: '2 min read',
    },
    {
      id: 4,
      category: 'company',
      date: 'December 5, 2024',
      title: 'TaxSky AI Reaches 1 Million Users Milestone',
      excerpt: 'We\'re thrilled to announce that over 1 million Americans have used TaxSky AI to file their taxes since our launch.',
      image: '/images/news/milestone.jpg',
      featured: true,
      readTime: '3 min read',
    },
    {
      id: 5,
      category: 'press',
      date: 'November 28, 2024',
      title: 'TaxSky AI Secures $50M Series B Funding',
      excerpt: 'The funding round was led by Sequoia Capital, with participation from existing investors. The funds will be used to expand our AI capabilities and enter new markets.',
      image: '/images/news/funding.jpg',
      featured: false,
      readTime: '5 min read',
    },
    {
      id: 6,
      category: 'product',
      date: 'November 15, 2024',
      title: 'Introducing CPA Review: Expert Verification for Your Return',
      excerpt: 'Premium users can now opt for a certified CPA to review their tax return before filing, providing an extra layer of confidence and accuracy.',
      image: '/images/news/cpa-review.jpg',
      featured: false,
      readTime: '4 min read',
    },
    {
      id: 7,
      category: 'company',
      date: 'October 30, 2024',
      title: 'TaxSky AI Expands to Support All 50 States',
      excerpt: 'We now offer state tax filing for all 50 states, making TaxSky the most comprehensive AI tax solution available.',
      image: '/images/news/50-states.jpg',
      featured: false,
      readTime: '3 min read',
    },
    {
      id: 8,
      category: 'awards',
      date: 'October 15, 2024',
      title: 'TaxSky Wins "Innovation in Financial Services" Award',
      excerpt: 'Recognized by the American Fintech Association for our groundbreaking approach to AI-powered tax preparation.',
      image: '/images/news/innovation-award.jpg',
      featured: false,
      readTime: '2 min read',
    },
    {
      id: 9,
      category: 'product',
      date: 'September 20, 2024',
      title: 'Multi-Language Support: Now Available in Spanish and Vietnamese',
      excerpt: 'TaxSky AI now supports Spanish and Vietnamese, making tax filing accessible to more Americans in their preferred language.',
      image: '/images/news/languages.jpg',
      featured: false,
      readTime: '3 min read',
    },
    {
      id: 10,
      category: 'company',
      date: 'August 15, 2024',
      title: 'TaxSky Opens New Engineering Hub in Austin, Texas',
      excerpt: 'Our new Austin office will focus on AI research and development, bringing 50 new jobs to the area.',
      image: '/images/news/austin-office.jpg',
      featured: false,
      readTime: '4 min read',
    },
  ];

  const getCategoryColor = (categoryId) => {
    const colors = {
      press: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
      product: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
      company: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      awards: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
    };
    return colors[categoryId] || { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' };
  };

  const getGradient = (categoryId) => {
    const gradients = {
      press: 'from-purple-600 to-indigo-600',
      product: 'from-cyan-600 to-blue-600',
      company: 'from-emerald-600 to-teal-600',
      awards: 'from-amber-600 to-orange-600',
    };
    return gradients[categoryId] || 'from-indigo-600 to-purple-600';
  };

  const filteredNews = newsItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && (searchQuery === '' || matchesSearch);
  });

  const featuredNews = newsItems.filter(item => item.featured);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_70%)]" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_70%)]" />
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <div className="flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30">
              <Newspaper className="w-4 h-4" />
              <span className="font-medium text-sm">TaxSky Newsroom</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Latest News & Updates
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mb-8">
            Stay up to date with the latest from TaxSky AI - product updates, press releases, and company announcements.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 backdrop-blur border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-12">
        {/* Featured News */}
        {activeCategory === 'all' && searchQuery === '' && featuredNews.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Featured Stories</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredNews.map((item) => {
                const colors = getCategoryColor(item.category);
                const gradient = getGradient(item.category);
                return (
                  <div 
                    key={item.id}
                    className="group bg-white/[0.03] backdrop-blur rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                  >
                    <div className={`h-48 bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/20" />
                      <Newspaper className="w-16 h-16 text-white/30 relative z-10" />
                      <div className="absolute top-4 left-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 ${colors.bg} ${colors.text} rounded-full text-xs font-medium border ${colors.border}`}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {item.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.readTime}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                        <Link to={`/news/${item.id}`}>{item.title}</Link>
                      </h3>
                      <p className="text-slate-400 mb-4 line-clamp-2">{item.excerpt}</p>
                      <Link 
                        to={`/news/${item.id}`}
                        className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:text-indigo-300 transition-colors group/link"
                      >
                        Read full story 
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-10">
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

        {/* News Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => {
            const colors = getCategoryColor(item.category);
            const gradient = getGradient(item.category);
            return (
              <article 
                key={item.id}
                className="group bg-white/[0.03] backdrop-blur rounded-2xl overflow-hidden border border-white/10 hover:border-indigo-500/30 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
                  <div className="absolute inset-0 bg-black/30" />
                  <Newspaper className="w-12 h-12 text-white/20 relative z-10" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 ${colors.bg} ${colors.text} rounded-lg text-xs font-medium border ${colors.border}`}>
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">{item.date}</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    <Link to={`/news/${item.id}`}>{item.title}</Link>
                  </h3>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{item.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <Link 
                      to={`/news/${item.id}`}
                      className="inline-flex items-center gap-1 text-sm text-indigo-400 font-medium hover:text-indigo-300 transition-colors group/link"
                    >
                      Read more 
                      <ChevronRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.readTime}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 text-lg">No news articles found.</p>
            <p className="text-slate-600 text-sm mt-2">Try adjusting your search or filter criteria.</p>
          </div>
        )}

        {/* Newsletter Signup */}
        <div className="mt-16 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur rounded-3xl p-8 md:p-12 border border-indigo-500/20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Stay in the Loop</h2>
            <p className="text-slate-400 mb-8">
              Subscribe to our newsletter for the latest TaxSky news, product updates, and tax tips delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Press Contact */}
        <div className="mt-12 bg-white/[0.03] backdrop-blur rounded-2xl p-8 md:p-10 text-center border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-3">Media Inquiries</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            For press inquiries, interviews, or media resources, please contact our communications team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:press@taxsky.ai"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
            >
              <Mail className="w-5 h-5" />
              Contact Press Team
            </a>
            <Link
              to="/media"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/20 transition-colors border border-white/10"
            >
              <Download className="w-5 h-5" />
              Download Press Kit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsPage;