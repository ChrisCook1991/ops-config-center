'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Zap,
  Clock,
  MousePointer,
  Eye,
  Code2,
  Settings2,
  Layers,
  Smartphone,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  DEFAULT_BANNER_PAYLOAD,
  DEFAULT_TCA_TRIGGER,
  BannerPayload,
  TcaTrigger,
  TriggerType,
  PLATFORM_OPTIONS,
  NETWORK_OPTIONS,
  VERSION_OPTIONS,
} from '../../constants/schemas';
import { validateBannerPayload, ValidationResult } from '../../utils/validator';

// A single banner config entry
export interface BannerEntry {
  id: string;
  payload: BannerPayload;
  trigger: TcaTrigger;
}

type ComponentType = 'banner' | 'popup';

const MAX_BANNERS = 3;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AdminCmsHomePage() {
  const [componentType, setComponentType] = useState<ComponentType>('banner');
  const [componentDropdownOpen, setComponentDropdownOpen] = useState(false);

  // The list of committed banners (what sandbox sees)
  const [committedBanners, setCommittedBanners] = useState<BannerEntry[]>([]);

  // Which banner index we are currently editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // Are we creating a new banner?
  const [isCreating, setIsCreating] = useState(false);

  // Draft state for the banner being edited/created
  const [draftPayload, setDraftPayload] = useState<BannerPayload>(DEFAULT_BANNER_PAYLOAD);
  const [draftTrigger, setDraftTrigger] = useState<TcaTrigger>(DEFAULT_TCA_TRIGGER);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [isDirty, setIsDirty] = useState(false);

  const [showJson, setShowJson] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published'>('idle');
  const [createdAt, setCreatedAt] = useState('');
  // Carousel interval: draft = what slider shows; committed = what sandbox actually uses
  const [committedInterval, setCommittedInterval] = useState(2);
  const [draftInterval, setDraftInterval] = useState(2);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const syncToSandbox = useCallback((banners: BannerEntry[]) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'SYNC_CMS_BANNERS', banners, carouselInterval: committedInterval },
        '*'
      );
    }
  }, [committedInterval]);

  // Keep a stable ref so the mount-only effect doesn't depend on syncToSandbox
  const syncRef = useRef(syncToSandbox);
  useEffect(() => { syncRef.current = syncToSandbox; }, [syncToSandbox]);

  // Mount-only: set timestamp and do the initial empty sync (no syncToSandbox dep)
  useEffect(() => {
    setCreatedAt(new Date().toISOString());
    const timer = setTimeout(() => syncRef.current([]), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever committed banners or committed interval changes, sync to sandbox
  useEffect(() => {
    syncToSandbox(committedBanners);
  }, [committedBanners, committedInterval, syncToSandbox]);

  // Start creating a new banner
  const handleStartCreate = () => {
    setDraftPayload({ ...DEFAULT_BANNER_PAYLOAD, title: '' });
    setDraftTrigger({ ...DEFAULT_TCA_TRIGGER });
    setValidation(validateBannerPayload({ ...DEFAULT_BANNER_PAYLOAD, title: '' }));
    setEditingIndex(null);
    setIsCreating(true);
    setIsDirty(false);
  };

  // Start editing an existing banner
  const handleEditBanner = (index: number) => {
    const entry = committedBanners[index];
    setDraftPayload({ ...entry.payload });
    setDraftTrigger({ ...entry.trigger });
    setValidation(validateBannerPayload(entry.payload));
    setEditingIndex(index);
    setIsCreating(false);
    setIsDirty(false);
  };

  // Cancel create/edit
  const handleCancel = () => {
    setIsCreating(false);
    setEditingIndex(null);
    setIsDirty(false);
  };

  // Confirm create/edit
  const handleConfirm = () => {
    if (!validation.isValid || !isDirty) return;

    const entry: BannerEntry = {
      id: editingIndex !== null ? committedBanners[editingIndex].id : generateId(),
      payload: { ...draftPayload },
      trigger: { ...draftTrigger },
    };

    let updated: BannerEntry[];
    if (editingIndex !== null) {
      // Update existing
      updated = committedBanners.map((b, i) => (i === editingIndex ? entry : b));
    } else {
      // Add new — auto-evict oldest if over limit
      updated = [...committedBanners, entry];
      if (updated.length > MAX_BANNERS) {
        updated = updated.slice(updated.length - MAX_BANNERS);
      }
    }

    setCommittedBanners(updated);
    setIsCreating(false);
    setEditingIndex(null);
    setIsDirty(false);
  };

  // Delete a banner
  const handleDeleteBanner = (index: number) => {
    const updated = committedBanners.filter((_, i) => i !== index);
    setCommittedBanners(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setIsCreating(false);
    }
  };

  const handleFieldChange = (
    fieldKey: string,
    value: string | number | boolean,
    ruleFieldKey?: string
  ) => {
    const updated = { ...draftPayload };
    if (ruleFieldKey) {
      updated.rules = { ...updated.rules, [ruleFieldKey]: value };
    } else {
      (updated as Record<string, unknown>)[fieldKey] = value;
    }
    setDraftPayload(updated as BannerPayload);
    setValidation(validateBannerPayload(updated as BannerPayload));
    setIsDirty(true);
  };

  const handleTargetingToggle = (field: 'platforms' | 'networks' | 'versions', value: string) => {
    const currentList = (draftPayload.rules.targeting?.[field] ?? []) as string[];
    const updated = currentList.includes(value)
      ? currentList.filter((v) => v !== value)
      : [...currentList, value];
    const updatedPayload = {
      ...draftPayload,
      rules: {
        ...draftPayload.rules,
        targeting: {
          ...draftPayload.rules.targeting,
          [field]: updated,
        },
      },
    };
    setDraftPayload(updatedPayload);
    setValidation(validateBannerPayload(updatedPayload));
    setIsDirty(true);
  };

  const handlePublish = () => {
    if (publishStatus !== 'idle') return;
    setPublishStatus('publishing');
    setTimeout(() => {
      setPublishStatus('published');
      setTimeout(() => setPublishStatus('idle'), 2000);
    }, 1500);
  };

  const isEditingOrCreating = isCreating || editingIndex !== null;

  // Full JSON for the preview panel
  const fullPayload = {
    component: 'PromotionalBanner',
    version: '1.0.0',
    banners: committedBanners.map((b) => ({
      id: b.id,
      payload: b.payload,
      trigger: b.trigger,
    })),
    metadata: {
      createdAt: createdAt || '(loading...)',
      createdBy: 'operator@example.com',
      environment: 'staging',
    },
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased">
      {/* Admin Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-100 px-6 py-3.5 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900">运营配置中心</h1>
              <p className="text-xs text-gray-400">Schema-driven CMS PoC</p>
            </div>
          </div>

          {/* Component Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => setComponentDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-gray-300 transition-all shadow-sm"
            >
              <Settings2 className="w-4 h-4 text-blue-500" />
              {componentType === 'banner' ? 'Promotional Banner 横幅' : 'Popup 弹窗'}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {componentDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setComponentDropdownOpen(false)} />
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-100 shadow-lg shadow-gray-200/50 z-20 overflow-hidden">
                  <button
                    onClick={() => { setComponentType('banner'); setComponentDropdownOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-blue-50/50 transition-colors ${componentType === 'banner' ? 'text-blue-600 font-semibold bg-blue-50/30' : 'text-gray-700'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${componentType === 'banner' ? 'bg-blue-500' : 'bg-gray-200'}`} />
                    Promotional Banner 横幅
                  </button>
                  <div className="relative">
                    <div className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left text-gray-300 cursor-not-allowed select-none">
                      <div className="w-2 h-2 rounded-full bg-gray-200" />
                      Popup 弹窗
                      <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">即将上线</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            运营人员：<span className="text-gray-600 font-medium">James</span>
          </span>
          <button
            onClick={handlePublish}
            disabled={publishStatus !== 'idle' || committedBanners.length === 0}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${
              publishStatus === 'published'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                : publishStatus === 'publishing'
                  ? 'bg-blue-400 text-white animate-pulse'
                  : committedBanners.length > 0
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {publishStatus === 'published' ? (
              <><CheckCircle className="w-4 h-4" />已发布</>
            ) : publishStatus === 'publishing' ? '发布中...' : '发布线上'}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-grow flex p-6 gap-6 max-w-[1800px] mx-auto w-full">
        {/* LEFT: Config Panel */}
        <div className="w-[480px] shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)] pr-1 scrollbar-thin">

          {/* Banner List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <h2 className="font-semibold text-sm text-gray-900">横幅配置列表</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {committedBanners.length}/{MAX_BANNERS}
                </span>
              </div>
              <button
                onClick={handleStartCreate}
                disabled={isEditingOrCreating}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isEditingOrCreating
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                新增横幅
              </button>
            </div>

            {committedBanners.length === 0 && !isCreating ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                <div className="mb-2 text-2xl">📋</div>
                暂无横幅配置，点击「新增横幅」开始
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {committedBanners.map((entry, i) => (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                      editingIndex === i ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'
                    }`}
                    onClick={() => !isCreating && handleEditBanner(i)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{entry.payload.title || '(无标题)'}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          entry.trigger.type === 'immediate' ? 'bg-emerald-100 text-emerald-600' :
                          entry.trigger.type === 'scheduled' ? 'bg-blue-100 text-blue-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {entry.trigger.type === 'immediate' ? '立即' : entry.trigger.type === 'scheduled' ? '定时' : '事件'}
                        </span>
                        {entry.trigger.type === 'scheduled' && entry.trigger.scheduledTime && (
                          <span className="text-[10px] text-gray-400 truncate">
                            {new Date(entry.trigger.scheduledTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          entry.payload.rules.priority > 0 ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          P{entry.payload.rules.priority}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteBanner(i); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {committedBanners.length >= MAX_BANNERS && !isEditingOrCreating && (
              <div className="px-5 py-2.5 bg-amber-50/50 border-t border-amber-100/50 text-xs text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                已达上限。新增时将自动移除最早的横幅。
              </div>
            )}
          </div>

          {/* Edit / Create Form */}
          {isEditingOrCreating && (
            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden ring-1 ring-blue-100">
              {/* Form Header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-500" />
                  <h2 className="font-semibold text-sm text-gray-900">
                    {isCreating ? '新增横幅配置' : `编辑横幅 #${(editingIndex ?? 0) + 1}`}
                  </h2>
                </div>
                {/* Schema Validation Badge */}
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  validation.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  {validation.isValid
                    ? <><CheckCircle className="w-3.5 h-3.5" />Schema 有效</>
                    : <><AlertTriangle className="w-3.5 h-3.5" />Schema 无效</>
                  }
                </div>
              </div>

              {/* Validation Errors */}
              {!validation.isValid && (
                <div className="px-5 py-2 bg-red-50/50 border-b border-red-100/50">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-500 font-mono">{err}</div>
                  ))}
                </div>
              )}

              <div className="p-5 space-y-5">
                {/* Content Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />组件内容 (Action Payload)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                        横幅标题 <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={draftPayload.title}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        placeholder="Enter banner title..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                        跳转链接 (深链接) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={draftPayload.ctaLink}
                        onChange={(e) => handleFieldChange('ctaLink', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
                        placeholder="e.g., /staking"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5 font-medium">图片资源 URL</label>
                      <input
                        type="text"
                        value={draftPayload.imageUrl}
                        onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono"
                        placeholder="https://... (留空使用默认图标)"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50" />

                {/* Rules Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />组件约束与条件 (Rules)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-2 font-medium">
                        优先级 <span className="text-xs text-gray-400 font-normal">(0 = 不显示)</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min="0" max="1000" step="10"
                          value={draftPayload.rules.priority}
                          onChange={(e) => handleFieldChange('rules', parseInt(e.target.value, 10), 'priority')}
                          className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className={`font-bold text-lg w-12 text-center ${draftPayload.rules.priority === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                          {draftPayload.rules.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50/50 rounded-xl px-3.5 py-3">
                      <div>
                        <div className="text-sm text-gray-700 font-medium">允许手动关闭</div>
                        <div className="text-xs text-gray-400">显示关闭按钮 (×)</div>
                      </div>
                      <button
                        onClick={() => handleFieldChange('rules', !draftPayload.rules.manualClose, 'manualClose')}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${draftPayload.rules.manualClose ? 'bg-blue-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${draftPayload.rules.manualClose ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50" />

                {/* Targeting Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />推送范围 (Targeting)
                    <span className="ml-auto text-[10px] font-normal text-gray-400 normal-case">空 = 全部</span>
                  </h3>
                  <div className="space-y-3.5">
                    {/* Platform */}
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-2">推送平台</div>
                      <div className="flex gap-2">
                        {PLATFORM_OPTIONS.map((p) => {
                          const active = (draftPayload.rules.targeting?.platforms ?? []).includes(p);
                          return (
                            <button
                              key={p}
                              onClick={() => handleTargetingToggle('platforms', p)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                active
                                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Network */}
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-2">推送网络</div>
                      <div className="flex flex-wrap gap-2">
                        {NETWORK_OPTIONS.map((n) => {
                          const active = (draftPayload.rules.targeting?.networks ?? []).includes(n);
                          const colorMap: Record<string, string> = {
                            Ethereum: 'bg-indigo-500 border-indigo-500',
                            Tron: 'bg-red-500 border-red-500',
                            Arbitrum: 'bg-sky-500 border-sky-500',
                            Base: 'bg-blue-600 border-blue-600',
                            Polygon: 'bg-purple-500 border-purple-500',
                          };
                          return (
                            <button
                              key={n}
                              onClick={() => handleTargetingToggle('networks', n)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                active
                                  ? `${colorMap[n]} text-white shadow-sm`
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Version */}
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-2">推送版本</div>
                      <div className="flex flex-wrap gap-2">
                        {VERSION_OPTIONS.map((v) => {
                          const active = (draftPayload.rules.targeting?.versions ?? []).includes(v);
                          return (
                            <button
                              key={v}
                              onClick={() => {
                                const cur = draftPayload.rules.targeting?.versions ?? [];
                                const next = cur.includes(v) ? [] : [v];
                                const upd = { ...draftPayload, rules: { ...draftPayload.rules, targeting: { ...draftPayload.rules.targeting, versions: next } } };
                                setDraftPayload(upd);
                                setValidation(validateBannerPayload(upd));
                                setIsDirty(true);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border transition-all ${
                                active
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              v{v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50" />

                {/* TCA Trigger Section */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />触发器设置 (TCA Trigger)
                  </h3>
                  <div className="space-y-2">
                    {([
                      { type: 'immediate' as TriggerType, label: '立即上线', desc: '确认后立即在客户端生效', icon: Zap, color: 'text-emerald-500' },
                      { type: 'scheduled' as TriggerType, label: '定时触发', desc: '在指定时间自动展示', icon: Clock, color: 'text-blue-500' },
                      { type: 'event' as TriggerType, label: '事件触发', desc: '用户完成特定操作后展示', icon: MousePointer, color: 'text-purple-500' },
                    ]).map((opt) => (
                      <div key={opt.type}>
                        <button
                          onClick={() => { setDraftTrigger({ ...draftTrigger, type: opt.type }); setIsDirty(true); }}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                            draftTrigger.type === opt.type
                              ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                          }`}
                        >
                          <opt.icon className={`w-4 h-4 ${draftTrigger.type === opt.type ? opt.color : 'text-gray-400'}`} />
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${draftTrigger.type === opt.type ? 'text-gray-900' : 'text-gray-600'}`}>{opt.label}</div>
                            <div className="text-xs text-gray-400">{opt.desc}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${draftTrigger.type === opt.type ? 'border-blue-500' : 'border-gray-200'}`}>
                            {draftTrigger.type === opt.type && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                        </button>
                        {draftTrigger.type === 'scheduled' && opt.type === 'scheduled' && (
                          <div className="mt-2 ml-11">
                            <label className="block text-xs text-gray-500 mb-1">上线时间</label>
                            <input
                              type="datetime-local"
                              value={draftTrigger.scheduledTime || ''}
                              onChange={(e) => { setDraftTrigger({ ...draftTrigger, scheduledTime: e.target.value }); setIsDirty(true); }}
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none w-full"
                            />
                            <p className="mt-1 text-[11px] text-gray-400">沙盒预览将在到达该时间后自动展示横幅</p>
                          </div>
                        )}
                        {draftTrigger.type === 'event' && opt.type === 'event' && (
                          <div className="mt-2 ml-11">
                            <input
                              type="text"
                              value={draftTrigger.eventName || ''}
                              onChange={(e) => { setDraftTrigger({ ...draftTrigger, eventName: e.target.value }); setIsDirty(true); }}
                              placeholder="e.g., onboarding_complete"
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none w-full"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30 flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!isDirty || !validation.isValid}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isDirty && validation.isValid
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:shadow-md active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  确定
                </button>
              </div>
            </div>
          )}

          {/* Carousel Settings Card */}
          <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${
            draftInterval !== committedInterval ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
          }`}>
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm text-gray-900">轮播设置</h2>
              {draftInterval !== committedInterval && (
                <span className="ml-1 text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                  未保存
                </span>
              )}
              <span className="text-xs text-gray-400 ml-auto">仅在多横幅时生效</span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">轮播间隔时间</label>
                <div className="flex items-center gap-1.5">
                  {draftInterval !== committedInterval && (
                    <span className="text-xs text-gray-400 line-through">{committedInterval}s</span>
                  )}
                  <span className={`font-bold text-lg w-12 text-center ${
                    draftInterval !== committedInterval ? 'text-amber-500' : 'text-blue-600'
                  }`}>
                    {draftInterval}s
                  </span>
                </div>
              </div>
              <input
                type="range" min="1" max="10" step="1"
                value={draftInterval}
                onChange={(e) => setDraftInterval(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 5, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => setDraftInterval(s)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                      draftInterval === s
                        ? committedInterval === s
                          ? 'bg-blue-500 text-white'
                          : 'bg-amber-400 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
              {/* Confirm / Cancel */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setDraftInterval(committedInterval)}
                  disabled={draftInterval === committedInterval}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                    draftInterval === committedInterval
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />取消
                </button>
                <button
                  onClick={() => setCommittedInterval(draftInterval)}
                  disabled={draftInterval === committedInterval}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    draftInterval !== committedInterval
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm hover:shadow-md'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />确认
                </button>
              </div>
            </div>
          </div>

          {/* JSON Preview Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowJson(!showJson)}
              className="w-full px-5 py-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-500" />
                <h2 className="font-semibold text-sm text-gray-900">生成的数据协议 (Raw JSON)</h2>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showJson ? 'rotate-180' : ''}`} />
            </button>
            {showJson && (
              <div className="p-4">
                <pre className="p-4 rounded-xl bg-[#0f172a] text-cyan-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-80 overflow-y-auto scrollbar-thin">
                  {JSON.stringify(fullPayload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Sandbox Preview */}
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-5">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-sm text-gray-500">钱包全真模拟预览 (WYSIWYG Sandbox)</h2>
          </div>

          <div className="relative">
            <div className="w-[375px] h-[812px] bg-white border-[12px] border-[#1a1a1a] rounded-[52px] shadow-2xl shadow-gray-400/30 overflow-hidden relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120px] h-[32px] bg-[#1a1a1a] rounded-b-[18px] z-20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#2a2a2a] border border-[#3a3a3a]" />
              </div>
              <div className="absolute bottom-[6px] left-1/2 transform -translate-x-1/2 w-[134px] h-[5px] bg-black rounded-full z-20" />
              <iframe
                ref={iframeRef}
                src="/sandbox"
                title="Wallet App Sandbox"
                className="w-full h-full border-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            实时同步已连接 (postMessage)
          </div>
          {committedBanners.length > 0 && (
            <div className="mt-2 text-xs text-gray-400">
              共 {committedBanners.length} 个横幅配置 · 沙盒展示活跃横幅
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
