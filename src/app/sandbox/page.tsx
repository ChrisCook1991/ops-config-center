'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Gift,
  Home,
  BarChart3,
  Globe,
  User,
  X,
  Copy,
  ScanLine,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { Renderer, JSONUIProvider } from '@json-render/react';
import { BannerPayload } from '../../constants/schemas';
import { BannerEntry } from '../admin/page';
import { bannerRegistry } from '../../lib/banner-registry';

interface ActiveBanner extends BannerEntry {
  dismissed: boolean;
}

type View = 'home' | 'notifications' | 'article';

// ─── Static notification data ────────────────────────────────────────────
const SYSTEM_MESSAGES = [
  {
    id: '1',
    emoji: '🎁',
    title: '邀好友开卡，领 $20 推荐奖！',
    preview: 'imToken Card 推荐计划开启！',
    date: '03-11 17:37',
    content: `imToken Card 推荐计划开启！

邀好友开卡，享双重福利：
✅ 推荐奖：每成功推荐 1 人，直接领 $20。
✅ 返现涨：推荐 1 人消费返现升至 5%，后续每加 1 人再加 5%，最高叠加至 20%！

同时，你的好友开卡可享：
✅ 必得盲盒：保底 $8，最高 $800
✅ 持卡消费：享 2% 返现

🕰️ 活动倒计时：将于 2026.03.16 结束，抓紧最后机会！

快速通道
1️⃣ 奖励登记表单：https://forms.gle/yCJNqKBG7Fia4JDv8
2️⃣ 推荐好友开卡：https://web.token.im/my-rewards?utm_source=app&utm_medium=push
3️⃣ 申卡教程：https://support.token.im/hc/zh-cn/articles/41273097925529

注：申请或使用加密卡时，请确保遵守当地法律法规。

如有任何问题，可随时在「我 - 帮助与反馈」与我们联系。`,
  },
  {
    id: '2',
    emoji: '🔓',
    title: '一键解锁 Arbitrum 账户的 N 种玩法',
    preview: '还在为换币、跨链、质押需要反复跳转 DApp，担心点错链接...',
    date: '03-05 14:47',
    content: `还在为换币、跨链、质押需要反复跳转 DApp，担心点错链接？

imToken 推出 Arbitrum 一站式功能，让你在同一个界面完成所有操作：

🔁 快速换币：支持 ARB、ETH、USDC 等主流代币一键兑换
🌉 跨链转账：Arbitrum ↔ Ethereum / Base 跨链仅需 2 步
🏦 质押收益：一键质押，年化最高 8%
🔒 安全托管：私钥本地加密，资产完全自主掌控

立即体验 →`,
  },
  {
    id: '3',
    emoji: '🏮',
    title: '喜迎元宵！开卡三重礼',
    preview: '喜迎元宵，imToken「消费生金」活动开启！',
    date: '03-03 10:35',
    content: `喜迎元宵，imToken「消费生金」活动开启！

元宵限定三重礼：
🎁 礼一：开卡即送 $8 盲盒
🎁 礼二：首笔消费满 $50 返 $10
🎁 礼三：持卡消费享 2% 返现，上不封顶

活动时间：2026.02.12 — 2026.02.28

🔗 立即开卡：https://web.token.im/card`,
  },
];

const TRANSACTION_NOTICES = [
  { id: 't1', title: '转账成功', preview: '向 0x1a2b...3c4d 转账 0.5 ETH', date: '03-11 09:12' },
  { id: 't2', title: '收款到账', preview: '收到来自 TGVg...CpfB 的 10 USDT', date: '03-10 18:44' },
];

// ─── Article type (covers both static messages and banner-generated ones) ─
interface Article {
  emoji: string;
  title: string;
  date: string;
  content: string;
}

function generateArticleFromBanner(title: string, ctaLink: string): Article {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Pick emoji based on common keywords
  const lower = title.toLowerCase();
  const emoji =
    lower.includes('奖') || lower.includes('prize') || lower.includes('reward') ? '🎁' :
    lower.includes('staking') || lower.includes('质押') || lower.includes('earn') ? '💰' :
    lower.includes('quiz') || lower.includes('onboard') ? '📝' :
    lower.includes('card') || lower.includes('开卡') ? '💳' :
    lower.includes('nft') ? '🖼️' :
    lower.includes('swap') || lower.includes('换币') ? '🔄' :
    lower.includes('airdrop') || lower.includes('空投') ? '🪂' :
    '📢';

  const content = `${title}

亲爱的用户，

我们很高兴地向您介绍此次专属活动。作为我们尊贵的社区成员，您将享有以下特权：

✅ 活动详情：${title}
✅ 参与方式：点击下方链接，按照指引完成操作即可
✅ 奖励发放：活动结束后 5 个工作日内到账

活动规则
• 每位用户限参与一次
• 奖励将直接发放至您的账户
• 如有疑问，请联系客服

快速通道
🔗 立即参与：${ctaLink && !ctaLink.startsWith('notifications') ? ctaLink : 'https://token.im/activity'}

注：本活动最终解释权归 imToken 所有。如有任何问题，可随时在「我 - 帮助与反馈」与我们联系。`;

  return { emoji, title, date: dateStr, content };
}

export default function WalletSandboxPage() {
  const [banners, setBanners] = useState<ActiveBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselInterval, setCarouselInterval] = useState(2);
  const [currentScreen, setCurrentScreen] = useState<'Wallet' | 'Browser'>('Wallet');
  const [view, setView] = useState<View>('home');
  const [notifTab, setNotifTab] = useState<'transaction' | 'system'>('system');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [dynamicMessages, setDynamicMessages] = useState<Article[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll to enforce scheduled trigger times
  useEffect(() => {
    const interval = setInterval(() => setBanners((prev) => [...prev]), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_CMS_BANNERS') {
        const incoming: BannerEntry[] = event.data.banners ?? [];
        if (typeof event.data.carouselInterval === 'number') {
          setCarouselInterval(event.data.carouselInterval);
        }
        setBanners(incoming.map((entry) => ({ ...entry, dismissed: false })));
        setCurrentIndex(0);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Reset carousel when switching screens
  useEffect(() => { setCurrentIndex(0); }, [currentScreen]);

  const visibleBanners = banners
    .filter((b) => {
      if (b.dismissed) return false;
      if (b.payload.rules.priority <= 0) return false;
      if (b.trigger.type === 'scheduled' && b.trigger.scheduledTime) {
        if (new Date() < new Date(b.trigger.scheduledTime)) return false;
      }
      if (b.trigger.endTime && new Date() > new Date(b.trigger.endTime)) return false;
      // ── ScreenView filter: only show banners targeting the current screen ──
      const sv = b.payload.screenView ?? 'Wallet';
      if (sv !== currentScreen) return false;
      return true;
    })
    .sort((a, b) => b.payload.rules.priority - a.payload.rules.priority);

  const handleDismiss = (id: string) => {
    setBanners((prev) => prev.map((b) => b.id === id ? { ...b, dismissed: true } : b));
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % visibleBanners.length);
    }, carouselInterval * 1000);
    return () => clearInterval(timer);
  }, [visibleBanners.length, carouselInterval]);

  const handlePrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const handleNext = () => setCurrentIndex((i) => Math.min(visibleBanners.length - 1, i + 1));
  const currentBanner = visibleBanners[currentIndex] ?? null;
  const nextScheduled = banners
    .filter((b) => !b.dismissed && b.trigger.type === 'scheduled' && b.trigger.scheduledTime
      && new Date(b.trigger.scheduledTime) > new Date()
      && (b.payload.screenView ?? 'Wallet') === currentScreen)
    .sort((a, b) => new Date(a.trigger.scheduledTime!).getTime() - new Date(b.trigger.scheduledTime!).getTime())[0];

  const handleBannerClick = () => {
    if (!currentBanner) return;
    const article = generateArticleFromBanner(
      currentBanner.payload.title,
      currentBanner.payload.ctaLink
    );
    setDynamicMessages((prev) =>
      prev.some((m) => m.title === article.title) ? prev : [article, ...prev]
    );
    setSelectedArticle(article);
    setView('article');
  };

  const handleMsgClick = (msg: typeof SYSTEM_MESSAGES[0]) => {
    setSelectedArticle({ emoji: msg.emoji, title: msg.title, date: `2026-${msg.date}`, content: msg.content });
    setView('article');
  };

  if (view === 'article' && selectedArticle) {
    const article = selectedArticle;
    return (
      <div className="min-h-screen bg-black text-white font-sans antialiased select-none">
        <div className="flex justify-between items-center px-6 pt-8 pb-2 text-white">
          <div className="font-semibold text-base">8:57</div>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/><rect x="4" y="5" width="3" height="7" rx="0.5" fill="white"/><rect x="8" y="2" width="3" height="10" rx="0.5" fill="white"/><rect x="12" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.3"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 3.5C4.5 0 11.5 0 15 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.5 6C5.5 4 10.5 4 12.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="9.5" r="1.5" fill="white"/></svg>
            <div className="flex items-center gap-0.5">
              <div className="w-6 h-3 border border-white rounded-sm p-0.5"><div className="h-full w-[70%] bg-white rounded-xs"/></div>
              <div className="w-0.5 h-1.5 bg-white rounded-r-sm"/>
            </div>
          </div>
        </div>
        <div className="flex items-center px-5 pb-3">
          <button onClick={() => { setView('notifications'); setNotifTab('system'); }} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 text-center font-semibold text-base text-white">Details</div>
          <div className="w-8" />
        </div>
        <div className="px-5 pb-24 overflow-y-auto">
          <h1 className="text-xl font-bold text-white leading-snug mb-1">
            {article.emoji} {article.title}
          </h1>
          <div className="text-xs text-gray-400 mb-5">{article.date}</div>
          <div className="text-sm text-gray-200 leading-relaxed">
            {article.content.split('\n').map((line: string, i: number) => {
              const urlRegex = /(https?:\/\/[^\s]+)/g;
              const parts = line.split(urlRegex);
              return (
                <p key={i} className={line === '' ? 'mb-3' : 'mb-1'}>
                  {parts.map((part: string, j: number) =>
                    /https?:\/\/[^\s]+/.test(part) ? (
                      <span key={j} className="text-blue-400 underline break-all">{part}</span>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'notifications') {
    return (
      <div className="min-h-screen bg-black text-white font-sans antialiased select-none flex flex-col">
        <div className="flex justify-between items-center px-6 pt-8 pb-2 text-white shrink-0">
          <div className="font-semibold text-base">8:57</div>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="8" width="3" height="4" rx="0.5" fill="white"/><rect x="4" y="5" width="3" height="7" rx="0.5" fill="white"/><rect x="8" y="2" width="3" height="10" rx="0.5" fill="white"/><rect x="12" y="0" width="3" height="12" rx="0.5" fill="white" opacity="0.3"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 3.5C4.5 0 11.5 0 15 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.5 6C5.5 4 10.5 4 12.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="9.5" r="1.5" fill="white"/></svg>
            <div className="flex items-center gap-0.5">
              <div className="w-6 h-3 border border-white rounded-sm p-0.5"><div className="h-full w-[70%] bg-white rounded-xs"/></div>
              <div className="w-0.5 h-1.5 bg-white rounded-r-sm"/>
            </div>
          </div>
        </div>
        <div className="flex items-center px-5 pb-2 shrink-0">
          <button onClick={() => setView('home')} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 text-center font-semibold text-base text-white">Notifications</div>
          <button className="text-sm text-blue-400 font-medium">All Read</button>
        </div>
        <div className="flex px-5 border-b border-gray-800 shrink-0">
          {[
            { key: 'transaction', label: 'Transaction Notice' },
            { key: 'system', label: 'System Messages' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setNotifTab(tab.key as 'transaction' | 'system')}
              className={`pb-3 mr-6 text-sm transition-colors relative ${
                notifTab === tab.key ? 'text-white font-semibold' : 'text-gray-500'
              }`}
            >
              {tab.label}
              {notifTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hidden">
          {notifTab === 'system' ? (
            [...dynamicMessages, ...SYSTEM_MESSAGES.map((msg) => ({ ...msg, preview: msg.preview }))].map((msg, i) => {
              const isDynamic = i < dynamicMessages.length;
              const articleObj: Article = isDynamic
                ? (msg as Article)
                : { emoji: (msg as typeof SYSTEM_MESSAGES[0]).emoji, title: msg.title, date: `2026-${(msg as typeof SYSTEM_MESSAGES[0]).date}`, content: (msg as typeof SYSTEM_MESSAGES[0]).content };
              const preview = isDynamic
                ? (msg as Article).content.split('\n').find((l: string) => l.trim() && !l.startsWith('✅') && !l.startsWith('•') && l !== msg.title) ?? ''
                : (msg as typeof SYSTEM_MESSAGES[0]).preview;
              return (
                <button
                  key={`${isDynamic ? 'dyn' : 'static'}-${i}`}
                  onClick={() => { setSelectedArticle(articleObj); setView('article'); }}
                  className="w-full text-left px-5 py-4 border-b border-gray-800/60 active:bg-gray-900/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-semibold text-sm text-white leading-snug flex-1">
                      {(msg as Article).emoji ? <span>{(msg as Article).emoji} </span> : null}{msg.title}
                    </div>
                    <div className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {isDynamic ? (msg as Article).date.slice(-5) : (msg as typeof SYSTEM_MESSAGES[0]).date}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-400 leading-snug line-clamp-1">{preview}</div>
                </button>
              );
            })
          ) : (
            TRANSACTION_NOTICES.map((msg) => (
              <div key={msg.id} className="px-5 py-4 border-b border-gray-800/60">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-semibold text-sm text-white">{msg.title}</div>
                  <div className="text-xs text-gray-400 shrink-0">{msg.date}</div>
                </div>
                <div className="mt-1 text-xs text-gray-400">{msg.preview}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Shared banner carousel slot (used in both Wallet and Browser) ──────────
  const bannerSlot = (
    <div ref={scrollRef}>
      {visibleBanners.length === 0 ? (
        nextScheduled ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 shrink-0"/>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 font-medium">横幅待上线</div>
              <div className="text-xs text-gray-400 truncate">预计上线：{new Date(nextScheduled.trigger.scheduledTime!).toLocaleString('zh-CN')}</div>
            </div>
          </div>
        ) : null
      ) : (
        <>
          {currentBanner && (
            <div className="relative min-h-[80px] overflow-hidden">
              {currentBanner.payload.layout ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleBannerClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleBannerClick()}
                  className="cursor-pointer transition-all duration-300 active:scale-[0.98] relative outline-none focus-visible:ring-0"
                >
                  {currentBanner.payload.rules.manualClose && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(currentBanner.id); }}
                      className="absolute top-2.5 right-2.5 z-10 w-5 h-5 rounded-full bg-gray-200/80 flex items-center justify-center hover:bg-gray-300/80 transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-500"/>
                    </button>
                  )}
                  <JSONUIProvider
                    registry={bannerRegistry}
                    handlers={{ openBanner: async () => handleBannerClick() }}
                  >
                    <Renderer
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      spec={currentBanner.payload.layout as any}
                      registry={bannerRegistry}
                    />
                  </JSONUIProvider>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleBannerClick}
                  onKeyDown={(e) => e.key === 'Enter' && handleBannerClick()}
                  className="w-full text-left p-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border border-blue-100/50 flex items-center gap-3.5 relative shadow-sm shadow-blue-100/20 transition-all duration-300 active:scale-[0.98] cursor-pointer outline-none focus-visible:ring-0 min-h-[80px]"
                >
                  {currentBanner.payload.rules.manualClose && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(currentBanner.id); }}
                      className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gray-200/80 flex items-center justify-center hover:bg-gray-300/80 transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-500"/>
                    </button>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-blue-100/30 flex items-center justify-center shrink-0">
                    {currentBanner.payload.imageUrl ? (
                      <img src={currentBanner.payload.imageUrl} alt="banner" className="w-8 h-8 rounded object-cover"/>
                    ) : (
                      <Gift className="w-6 h-6 text-blue-500"/>
                    )}
                  </div>
                  <div className="pr-5 flex-1 min-w-0">
                    <div className="font-semibold text-sm text-blue-900 leading-snug">{currentBanner.payload.title}</div>
                    {currentBanner.payload.ctaLink && (
                      <div className="mt-0.5 text-xs text-blue-400 font-medium">Tap to learn more →</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {visibleBanners.length > 1 && (
            <div className="flex items-center justify-between mt-2.5 px-1">
              <button onClick={handlePrev} disabled={currentIndex === 0} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${currentIndex === 0 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100'}`}>
                <ChevronLeft className="w-4 h-4"/>
              </button>
              <div className="flex items-center gap-1.5">
                {visibleBanners.map((_, i) => (
                  <button key={i} onClick={() => setCurrentIndex(i)} className={`transition-all duration-200 rounded-full ${i === currentIndex ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-gray-300'}`}/>
                ))}
              </div>
              <button onClick={handleNext} disabled={currentIndex === visibleBanners.length - 1} className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${currentIndex === visibleBanners.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:bg-gray-100'}`}>
                <ChevronRight className="w-4 h-4"/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ─── Main Shell ─────────────────────────────────────────────────────────────
  const navItems = [
    { name: 'Wallet',  screen: 'Wallet'  as const, icon: Home },
    { name: 'Market',  screen: 'Wallet'  as const, icon: BarChart3 },
    { name: 'Browser', screen: 'Browser' as const, icon: Globe },
    { name: 'Profile', screen: 'Wallet'  as const, icon: User },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1C1C1E] font-sans antialiased select-none">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-6 pt-8 pb-2">
        <div className="font-semibold text-base">5:34</div>
        <div className="flex items-center gap-1.5">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><rect x="0" y="8" width="3" height="4" rx="0.5" fill="#1C1C1E"/><rect x="4" y="5" width="3" height="7" rx="0.5" fill="#1C1C1E"/><rect x="8" y="2" width="3" height="10" rx="0.5" fill="#1C1C1E"/><rect x="12" y="0" width="3" height="12" rx="0.5" fill="#1C1C1E" opacity="0.3"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M1 3.5C4.5 0 11.5 0 15 3.5" stroke="#1C1C1E" strokeWidth="1.5" strokeLinecap="round"/><path d="M3.5 6C5.5 4 10.5 4 12.5 6" stroke="#1C1C1E" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="9.5" r="1.5" fill="#1C1C1E"/></svg>
          <div className="flex items-center gap-0.5">
            <div className="w-6 h-3 border border-[#1C1C1E] rounded-sm p-0.5"><div className="h-full w-[70%] bg-[#1C1C1E] rounded-xs"/></div>
            <div className="w-0.5 h-1.5 bg-[#1C1C1E] rounded-r-sm"/>
          </div>
        </div>
      </div>

      {/* ── Wallet Screen ── */}
      {currentScreen === 'Wallet' && (
        <div className="overflow-y-auto scrollbar-hidden pb-20">
          {/* Header */}
          <div className="px-5 flex justify-between items-center mt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-red-500/20">T</div>
              <div>
                <div className="text-xs text-gray-400">Main wallet</div>
                <div className="font-semibold text-base text-gray-900">tron 测试</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setNotifTab('system'); setView('notifications'); }} className="relative">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <ScanLine className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          {/* Balance Card */}
          <div className="mx-5 mt-5 p-5 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5"/>
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5"/>
            <div className="relative z-10">
              <div className="text-sm text-blue-100 mb-1">Total Balance</div>
              <div className="font-bold text-3xl tracking-tight">$ 8.59</div>
              <div className="mt-3 text-blue-100/80 flex items-center gap-1.5 text-xs">
                <span className="font-mono">TGVgHmQYVB...XSdB7vCVpf</span>
                <Copy className="w-3 h-3 opacity-70"/>
              </div>
              <button className="mt-3 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-medium border border-white/20">Tron</button>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-3 px-5 mt-6 text-center">
            {[
              { name: 'Transfer', icon: ArrowUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { name: 'Receive', icon: ArrowDown, color: 'text-green-600', bg: 'bg-green-50' },
              { name: 'Activity', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
              { name: 'Rent', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((item) => (
              <div key={item.name} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`}/>
                </div>
                <div className="mt-1.5 text-xs text-gray-500 font-medium">{item.name}</div>
              </div>
            ))}
          </div>
          {/* Promotional Banner Carousel */}
          <div className="px-5 mt-6 mb-2">
            {bannerSlot}
          </div>
          {/* Token List */}
          <div className="px-5 mb-6 mt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold text-sm text-gray-900">Tokens</div>
              <div className="text-xs text-blue-500 font-medium">See All</div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-xs font-bold">T</div>
                <div><div className="font-medium text-sm">TRX</div><div className="text-xs text-gray-400">$0.1234</div></div>
              </div>
              <div className="text-right"><div className="font-medium text-sm">69.52</div><div className="text-xs text-gray-400">$8.59</div></div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">$</div>
                <div><div className="font-medium text-sm">USDT</div><div className="text-xs text-gray-400">$1.0001</div></div>
              </div>
              <div className="text-right"><div className="font-medium text-sm">0.00</div><div className="text-xs text-gray-400">$0.00</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Browser Screen ── */}
      {currentScreen === 'Browser' && (
        <div className="overflow-y-auto scrollbar-hidden pb-20">
          {/* Search Bar */}
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center gap-2.5 bg-gray-100 rounded-2xl px-4 py-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span className="text-sm text-gray-400 flex-1">Search or input URL</span>
              <div className="w-5 h-5 border-2 border-gray-400 rounded-sm flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 border border-gray-400 rounded-[2px]"/>
              </div>
            </div>
          </div>

          {/* Banner Slot: admin-configured OR native placeholder */}
          <div className="px-4 mb-4">
            {visibleBanners.length > 0 ? (
              bannerSlot
            ) : (
              /* Native placeholder — shown when no Browser banner is configured */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 border border-teal-100/80 flex items-center gap-3.5">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-teal-100/50 shrink-0 text-xl">
                  💻
                </div>
                <div>
                  <div className="text-xs text-teal-600 font-medium mb-0.5">New DApp Browser Feature</div>
                  <div className="text-sm font-bold text-gray-900 leading-snug">Desktop Websites on Mobile</div>
                </div>
              </div>
            )}
          </div>

          {/* Fav / Recent Tabs */}
          <div className="flex px-4 border-b border-gray-100 mb-4">
            {['Fav', 'Recent'].map((tab, i) => (
              <button key={tab} className={`pb-2.5 mr-6 text-sm font-semibold relative ${i === 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {tab}
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full"/>}
              </button>
            ))}
          </div>

          {/* DApp Icons Grid */}
          <div className="grid grid-cols-4 gap-2 px-4 mb-6">
            {[
              { name: 'Uniswap', label: '🦄', bg: 'bg-pink-50 border border-pink-100' },
              { name: 'Bridgers', label: 'B', bg: 'bg-purple-500 text-white font-bold' },
              { name: 'Venus', label: 'V', bg: 'bg-teal-900 text-white font-bold' },
              { name: 'Lido', label: '💧', bg: 'bg-gradient-to-br from-pink-100 to-blue-100' },
            ].map((dapp) => (
              <div key={dapp.name} className="flex flex-col items-center">
                <div className={`w-14 h-14 rounded-2xl ${dapp.bg} flex items-center justify-center text-xl mb-1.5 shadow-sm`}>
                  {dapp.label}
                </div>
                <span className="text-[11px] text-gray-600 font-medium text-center leading-tight">{dapp.name}</span>
              </div>
            ))}
          </div>

          {/* Chain Filter Tabs */}
          <div className="flex px-4 mb-3 gap-5">
            {['ETH', 'EOS', 'TRON'].map((chain, i) => (
              <button key={chain} className={`text-sm font-bold pb-1.5 relative ${i === 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {chain}
                {i === 0 && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"/>}
              </button>
            ))}
          </div>

          {/* Popular Header */}
          <div className="flex justify-between items-center px-4 mb-2">
            <span className="text-sm font-bold text-gray-900">Popular</span>
            <span className="text-xs text-gray-400 font-medium flex items-center gap-0.5">All <ChevronRight className="w-3 h-3"/></span>
          </div>

          {/* DApp List */}
          {[
            { name: 'Babylon', desc: 'Enable bitcoin holders to stake their BTC on Proof-of-Stake (PoS) systems such a...', bg: 'bg-orange-500', label: '⛓' },
            { name: 'Optimex', desc: 'Optimex offers a full suite of DeFi use cases for Bitcoin', bg: 'bg-orange-400', label: '⬡' },
            { name: 'CowSwap', desc: 'CoW Swap protects traders from the dangers of DeFi', bg: 'bg-blue-900', label: '🐮' },
          ].map((dapp) => (
            <div key={dapp.name} className="flex items-start gap-3.5 px-4 py-3.5 border-b border-gray-50 last:border-none">
              <div className={`w-11 h-11 rounded-2xl ${dapp.bg} flex items-center justify-center text-lg shrink-0 text-white shadow-sm`}>
                {dapp.label}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{dapp.name}</div>
                <div className="text-xs text-gray-400 leading-snug mt-0.5 line-clamp-2">{dapp.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom Nav (interactive) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-2 pb-5 pt-2 flex justify-around text-center">
        {navItems.map((item) => {
          const isActive = item.name === 'Browser' ? currentScreen === 'Browser' : (currentScreen === 'Wallet' && item.name === 'Wallet');
          return (
            <button key={item.name} onClick={() => setCurrentScreen(item.screen)} className="flex flex-col items-center">
              <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}/>
              <div className={`mt-0.5 text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{item.name}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
