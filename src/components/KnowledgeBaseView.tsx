import React, { useState, useEffect } from 'react';
import { KnowledgeArticle, User, SAPModule } from '../types/index.ts';
import { api } from '../services/api.ts';
import {
  BookOpen,
  Search,
  PlusCircle,
  Tag,
  Lock,
  Globe,
  FileText,
  ChevronRight,
  ExternalLink,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface KnowledgeBaseViewProps {
  currentUser: User | null;
  onNavigate: (view: string, param?: string) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ currentUser, onNavigate }) => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Article Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('SAP FI Troubleshooting');
  const [sapModule, setSapModule] = useState<SAPModule>('SAP FI');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [troubleshootingSteps, setTroubleshootingSteps] = useState('');
  const [tagsStr, setTagsStr] = useState('ERROR, SAP_NOTE');
  const [isInternalOnly, setIsInternalOnly] = useState(false);

  useEffect(() => {
    loadArticles();
  }, [currentUser, selectedModule]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (search) params.search = search;
      const res = await api.getKBArticles(params);
      setArticles(res.articles);
      if (res.articles.length > 0 && !selectedArticle) {
        setSelectedArticle(res.articles[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles();
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      await api.createKBArticle({
        title,
        category,
        sapModule,
        summary,
        content,
        troubleshootingSteps,
        tags,
        isInternalOnly
      });
      setShowAddModal(false);
      setTitle('');
      setContent('');
      await loadArticles();
    } catch (err) {
      console.error(err);
    }
  };

  const isClient = currentUser?.role === 'CLIENT_ADMIN' || currentUser?.role === 'CLIENT_EMPLOYEE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E5EAF0] shadow-2xs">
        <div>
          <h1 className="text-base font-bold text-[#172033] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            SAP Knowledge Base &amp; Resolution Library
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Curated SAP troubleshooting procedures, error diagnostics, configuration notes, and step-by-step guides.
          </p>
        </div>

        {!isClient && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Publish Article
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E5EAF0] shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search KB articles by title, error code, or keyword..."
            className="w-full pl-8 pr-4 py-1.5 bg-[#F5F7FA] border border-[#E5EAF0] rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </form>

        <select
          value={selectedModule}
          onChange={e => setSelectedModule(e.target.value)}
          className="bg-[#F5F7FA] border border-[#E5EAF0] rounded px-3 py-1.5 text-slate-700 focus:outline-none"
        >
          <option value="ALL">All Modules</option>
          <option value="SAP FI">SAP FI</option>
          <option value="SAP CO">SAP CO</option>
          <option value="SAP MM">SAP MM</option>
          <option value="SAP SD">SAP SD</option>
          <option value="SAP BASIS">SAP BASIS</option>
          <option value="SAP ABAP">SAP ABAP</option>
          <option value="SAP Fiori">SAP Fiori</option>
          <option value="SAP S/4HANA">SAP S/4HANA</option>
        </select>
      </div>

      {/* 2-Pane KB layout: Left article index, Right article viewer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left List */}
        <div className="bg-white rounded-lg border border-[#E5EAF0] shadow-2xs divide-y divide-slate-100 overflow-hidden">
          <div className="p-3 bg-slate-50 font-bold text-slate-700 text-xs flex items-center justify-between">
            <span>Articles ({articles.length})</span>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100">
            {articles.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No articles found</div>
            ) : (
              articles.map(art => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`p-3.5 cursor-pointer text-xs transition-colors ${
                    selectedArticle?.id === art.id
                      ? 'bg-blue-50/70 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-blue-700 text-[10px] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      {art.sapModule}
                    </span>
                    {Boolean(art.isInternalOnly) && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Internal
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 leading-snug line-clamp-2">{art.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{art.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Article Detail */}
        <div className="md:col-span-2 bg-white rounded-lg border border-[#E5EAF0] shadow-2xs p-6 space-y-5">
          {selectedArticle ? (
            <>
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {selectedArticle.sapModule}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{selectedArticle.category}</span>
                  {Boolean(selectedArticle.isInternalOnly) && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" /> SoftClinch Internal Only
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedArticle.title}</h2>
                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-3">
                  <span>Author: <strong className="text-slate-600">{selectedArticle.authorName}</strong></span>
                  <span>•</span>
                  <span>Updated: {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>Linked Incidents: {selectedArticle.linkedTicketCount}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                {selectedArticle.summary}
              </div>

              {/* Detailed Description */}
              <div className="space-y-2 text-xs text-slate-800 leading-relaxed">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Root Cause &amp; Technical Diagnosis</h3>
                <p className="whitespace-pre-line bg-[#F5F7FA] p-3.5 rounded border border-slate-200">
                  {selectedArticle.content}
                </p>
              </div>

              {/* Troubleshooting steps */}
              {selectedArticle.troubleshootingSteps && (
                <div className="space-y-2 text-xs text-slate-800 leading-relaxed">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Standard Operating Procedure (SOP) / Troubleshooting Steps
                  </h3>
                  <div className="p-3.5 bg-emerald-50/40 rounded border border-emerald-200 font-mono text-[11px] whitespace-pre-line text-emerald-950">
                    {selectedArticle.troubleshootingSteps}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <div className="flex flex-wrap gap-1.5">
                  {selectedArticle.tags?.map((t: string) => (
                    <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 text-xs">Select an article from the left list to view details.</div>
          )}
        </div>
      </div>

      {/* Modal: Publish Article */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              Publish SAP Resolution Guide
            </h3>

            <form onSubmit={handleCreateArticle} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SAP Module *</label>
                  <select
                    value={sapModule}
                    onChange={e => setSapModule(e.target.value as any)}
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  >
                    <option value="SAP FI">SAP FI</option>
                    <option value="SAP CO">SAP CO</option>
                    <option value="SAP MM">SAP MM</option>
                    <option value="SAP SD">SAP SD</option>
                    <option value="SAP BASIS">SAP BASIS</option>
                    <option value="SAP ABAP">SAP ABAP</option>
                    <option value="SAP Fiori">SAP Fiori</option>
                    <option value="SAP S/4HANA">SAP S/4HANA</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="e.g. Troubleshooting, Config"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Article Title *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Resolving ABAP Dump TSV_TNEW_PAGE_ALLOC_FAILED"
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Summary *</label>
                <input
                  required
                  type="text"
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Short executive summary of issue..."
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Technical Diagnosis *</label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Explain why this error happens and relevant SAP tables/notes..."
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Step-by-Step Resolution Steps *</label>
                <textarea
                  required
                  rows={4}
                  value={troubleshootingSteps}
                  onChange={e => setTroubleshootingSteps(e.target.value)}
                  placeholder="1. Execute T-code...\n2. Check parameter...\n3. Test correction in QAS..."
                  className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Search Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={e => setTagsStr(e.target.value)}
                    placeholder="e.g. ST22, MEMORY, HANA"
                    className="w-full p-2 bg-[#F5F7FA] border border-[#E5EAF0] rounded"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-amber-800">
                    <input
                      type="checkbox"
                      checked={isInternalOnly}
                      onChange={e => setIsInternalOnly(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <Lock className="w-3.5 h-3.5" />
                    Internal Consultant Guide Only
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2563EB] text-white rounded text-xs font-semibold hover:bg-blue-700"
                >
                  Publish to Local KB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
