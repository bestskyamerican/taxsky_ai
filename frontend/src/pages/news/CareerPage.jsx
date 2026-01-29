// ============================================================
// TAXSKY 2025 - CAREERS PAGE v2.0
// ============================================================
// Updated UI colors to match TaxSky brand guidelines
// Simplified, clean design with dark theme
// ============================================================

import React, { useState } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Heart, 
  Laptop, 
  Users, 
  Zap,
  Coffee,
  Shield,
  ArrowRight,
  Building,
  Mail,
  Sparkles
} from 'lucide-react';

const CareerPage = () => {
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const benefits = [
    { icon: DollarSign, title: 'Competitive Salary', description: 'Top-tier compensation with equity packages', color: 'emerald' },
    { icon: Heart, title: 'Health & Wellness', description: 'Full medical, dental, and vision coverage', color: 'rose' },
    { icon: Laptop, title: 'Remote Friendly', description: 'Work from anywhere in the US', color: 'cyan' },
    { icon: Coffee, title: 'Unlimited PTO', description: 'Take the time you need to recharge', color: 'amber' },
    { icon: Users, title: 'Team Events', description: 'Regular team building and offsites', color: 'purple' },
    { icon: Zap, title: '401(k) Match', description: '4% company match on retirement savings', color: 'indigo' },
  ];

  const jobs = [
    {
      id: 1,
      title: 'Senior Full Stack Engineer',
      department: 'Engineering',
      location: 'Remote (US)',
      type: 'Full-time',
      salary: '$150k - $200k',
      description: 'Build and scale our AI-powered tax platform using React, Node.js, and Python.',
    },
    {
      id: 2,
      title: 'Machine Learning Engineer',
      department: 'Engineering',
      location: 'San Jose, CA',
      type: 'Full-time',
      salary: '$180k - $250k',
      description: 'Develop and improve our AI models for tax data extraction and calculation.',
    },
    {
      id: 3,
      title: 'Product Manager',
      department: 'Product',
      location: 'Remote (US)',
      type: 'Full-time',
      salary: '$140k - $180k',
      description: 'Lead product strategy and roadmap for our consumer tax filing experience.',
    },
    {
      id: 4,
      title: 'Senior Tax Analyst',
      department: 'Tax Operations',
      location: 'San Jose, CA',
      type: 'Full-time',
      salary: '$100k - $140k',
      description: 'Ensure accuracy of our tax calculations and compliance with IRS regulations.',
    },
    {
      id: 5,
      title: 'Customer Success Manager',
      department: 'Customer Success',
      location: 'Remote (US)',
      type: 'Full-time',
      salary: '$80k - $110k',
      description: 'Help our users successfully file their taxes and resolve any issues.',
    },
    {
      id: 6,
      title: 'UX Designer',
      department: 'Design',
      location: 'Remote (US)',
      type: 'Full-time',
      salary: '$120k - $160k',
      description: 'Create intuitive and delightful experiences for our tax filing platform.',
    },
    {
      id: 7,
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'San Jose, CA',
      type: 'Full-time',
      salary: '$140k - $180k',
      description: 'Build and maintain our cloud infrastructure on AWS/GCP.',
    },
    {
      id: 8,
      title: 'Marketing Manager',
      department: 'Marketing',
      location: 'Remote (US)',
      type: 'Full-time',
      salary: '$100k - $140k',
      description: 'Drive user acquisition and brand awareness for TaxSky AI.',
    },
  ];

  const departments = ['all', ...new Set(jobs.map(job => job.department))];
  const locations = ['all', ...new Set(jobs.map(job => job.location))];

  const filteredJobs = jobs.filter(job => {
    const matchesDepartment = departmentFilter === 'all' || job.department === departmentFilter;
    const matchesLocation = locationFilter === 'all' || job.location === locationFilter;
    return matchesDepartment && matchesLocation;
  });

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
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
      <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-500/30">
            <Briefcase className="w-4 h-4" />
            We're Hiring!
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Join the TaxSky Team
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Help us revolutionize how millions of Americans file their taxes. 
            Build something meaningful with a world-class team.
          </p>
          <a 
            href="#openings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            View Open Positions
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Why TaxSky */}
      <div className="relative py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Work at TaxSky?
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              We're building the future of tax filing with AI
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/[0.03] backdrop-blur p-8 rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-colors">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4 border border-indigo-500/30">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Impact Millions</h3>
              <p className="text-slate-400">
                Our AI helps over 1 million Americans file their taxes stress-free every year.
              </p>
            </div>
            <div className="bg-white/[0.03] backdrop-blur p-8 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-colors">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 border border-emerald-500/30">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Great Culture</h3>
              <p className="text-slate-400">
                Collaborative, inclusive, and focused on work-life balance.
              </p>
            </div>
            <div className="bg-white/[0.03] backdrop-blur p-8 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 border border-purple-500/30">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Cutting-Edge Tech</h3>
              <p className="text-slate-400">
                Work with the latest AI/ML technologies and modern frameworks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="relative py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Benefits & Perks
            </h2>
            <p className="text-lg text-slate-400">
              We take care of our team
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              const colorClasses = getColorClasses(benefit.color);
              return (
                <div key={index} className="flex items-start gap-4 p-5 bg-white/[0.03] backdrop-blur rounded-xl border border-white/10">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorClasses}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{benefit.title}</h3>
                    <p className="text-sm text-slate-400">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div id="openings" className="relative py-20 bg-[#0f0f18]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-indigo-500/30">
              <Briefcase className="w-4 h-4" />
              {jobs.length} Open Roles
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Open Positions</h2>
            <p className="text-lg text-slate-400">
              Find your next role at TaxSky AI
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="all">All Locations</option>
              {locations.filter(l => l !== 'all').map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Job Listings */}
          <div className="space-y-4 max-w-4xl mx-auto">
            {filteredJobs.map((job) => (
              <div 
                key={job.id}
                className="group bg-white/[0.03] backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-400 transition-colors">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg">
                        <Building className="w-3.5 h-3.5" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <DollarSign className="w-3.5 h-3.5" />
                        {job.salary}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-3 text-sm">{job.description}</p>
                  </div>
                  <a
                    href={`mailto:careers@taxsky.ai?subject=Application for ${job.title}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all whitespace-nowrap shadow-lg shadow-indigo-500/20"
                  >
                    Apply Now
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400">No positions found matching your filters.</p>
            </div>
          )}

          {/* Contact CTA */}
          <div className="text-center mt-12 p-8 bg-white/[0.03] backdrop-blur rounded-2xl border border-white/10 max-w-2xl mx-auto">
            <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <p className="text-slate-300 mb-4">
              Don't see a position that fits? We're always looking for talented people.
            </p>
            <a
              href="mailto:careers@taxsky.ai"
              className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Send us your resume
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerPage;