/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight, PlayCircle, Search, X } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Suspense, useEffect, useState } from 'react';

// 客户端收藏 API
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';
import { processImageUrlWithCache } from '@/lib/utils';

import CapsuleSwitch from '@/components/CapsuleSwitch';
import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import { useSite } from '@/components/SiteProvider';
import VideoCard from '@/components/VideoCard';

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('PWA Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
              应用加载出错
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mb-4'>
              请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className='bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors'
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function HomeClient() {
  const [activeTab, setActiveTab] = useState<'home' | 'favorites'>('home');
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { announcement } = useSite();

  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const heroItem = hotMovies[0] ?? hotTvShows[0] ?? hotVarietyShows[0];
  const heroPoster = heroItem
    ? processImageUrlWithCache(heroItem.poster, heroItem.id)
    : '';

  // Add debugging for PWA
  useEffect(() => {
    console.log('HomeClient: Component mounted');
    console.log(
      'PWA Mode:',
      window.matchMedia('(display-mode: standalone)').matches
    );
    console.log('User Agent:', navigator.userAgent);

    // Check if running in PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA: Running in standalone mode');
    }

    // Add error boundary for PWA issues
    const handleError = (error: ErrorEvent) => {
      console.error('HomeClient: Error caught:', error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('HomeClient: Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Ensure proper initialization for PWA
    const timer = setTimeout(() => {
      console.log('PWA: Initialization complete');

      // Check if content loaded properly
      if (hotMovies.length === 0 && hotTvShows.length === 0 && !loading) {
        console.warn('PWA: No content loaded, this might indicate an issue');
      }
    }, 3000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      clearTimeout(timer);
    };
  }, [hotMovies.length, hotTvShows.length, loading]);

  // 检查公告弹窗状态
  useEffect(() => {
    if (typeof window !== 'undefined' && announcement) {
      const hasSeenAnnouncement = localStorage.getItem('hasSeenAnnouncement');
      if (hasSeenAnnouncement !== announcement) {
        setShowAnnouncement(true);
      } else {
        setShowAnnouncement(Boolean(!hasSeenAnnouncement && announcement));
      }
    }
  }, [announcement]);

  // 收藏夹数据
  type FavoriteItem = {
    id: string;
    source: string;
    title: string;
    poster: string;
    episodes: number;
    source_name: string;
    currentEpisode?: number;
    search_title?: string;
  };

  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const fetchDoubanData = async () => {
      try {
        setLoading(true);

        // 并行获取热门电影、热门剧集和热门综艺，限制为12个
        const [moviesData, tvShowsData, varietyShowsData] = await Promise.all([
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          }),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' }),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' }),
        ]);

        if (moviesData.code === 200) {
          setHotMovies(moviesData.list.slice(0, 12));
        }

        if (tvShowsData.code === 200) {
          setHotTvShows(tvShowsData.list.slice(0, 12));
        }

        if (varietyShowsData.code === 200) {
          setHotVarietyShows(varietyShowsData.list.slice(0, 12));
        }
      } catch (error) {
        console.error('获取豆瓣数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoubanData();
  }, []);

  // 处理收藏数据更新的函数
  const updateFavoriteItems = async (allFavorites: Record<string, any>) => {
    const allPlayRecords = await getAllPlayRecords();

    // 根据保存时间排序（从近到远）
    const sorted = Object.entries(allFavorites)
      .sort(([, a], [, b]) => b.save_time - a.save_time)
      .map(([key, fav]) => {
        const plusIndex = key.indexOf('+');
        const source = key.slice(0, plusIndex);
        const id = key.slice(plusIndex + 1);

        // 查找对应的播放记录，获取当前集数
        const playRecord = allPlayRecords[key];
        const currentEpisode = playRecord?.index;

        return {
          id,
          source,
          title: fav.title,
          year: fav.year,
          poster: fav.cover,
          episodes: fav.total_episodes,
          source_name: fav.source_name,
          currentEpisode,
          search_title: fav?.search_title,
        } as FavoriteItem;
      });
    setFavoriteItems(sorted);
  };

  // 当切换到收藏夹时加载收藏数据
  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const allFavorites = await getAllFavorites();
      await updateFavoriteItems(allFavorites);
    };

    loadFavorites();

    // 监听收藏更新事件
    const unsubscribe = subscribeToDataUpdates(
      'favoritesUpdated',
      (newFavorites: Record<string, any>) => {
        updateFavoriteItems(newFavorites);
      }
    );

    return unsubscribe;
  }, [activeTab]);

  const handleCloseAnnouncement = (announcement: string) => {
    setShowAnnouncement(false);
    localStorage.setItem('hasSeenAnnouncement', announcement); // 记录已查看弹窗
  };

  return (
    <PageLayout>
      <div className='px-4 py-5 sm:px-8 sm:py-8 overflow-visible'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-7 flex justify-center'>
          <CapsuleSwitch
            options={[
              { label: '首页', value: 'home' },
              { label: '收藏夹', value: 'favorites' },
            ]}
            active={activeTab}
            onChange={(value) => setActiveTab(value as 'home' | 'favorites')}
          />
        </div>

        <div className='max-w-full mx-auto'>
          {activeTab === 'favorites' ? (
            // 收藏夹视图
            <section className='mb-8'>
              <div className='mb-6 flex items-center justify-between'>
                <h2 className='text-2xl font-semibold text-slate-950 dark:text-white'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='rounded-lg px-3 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                    onClick={async () => {
                      await clearAllFavorites();
                      setFavoriteItems([]);
                    }}
                  >
                    清空
                  </button>
                )}
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4'>
                {favoriteItems.map((item) => (
                  <div key={item.id + item.source} className='w-full'>
                    <VideoCard
                      query={item.search_title}
                      {...item}
                      from='favorite'
                    />
                  </div>
                ))}
                {favoriteItems.length === 0 && (
                  <div className='col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/45 py-14 text-center text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400'>
                    <p className='text-lg font-medium text-slate-800 dark:text-slate-100'>
                      暂无收藏内容
                    </p>
                    <p className='text-sm mt-2'>开始探索精彩内容吧</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            // 首页视图
            <>
              <section className='relative mb-9 overflow-hidden rounded-2xl border border-white/70 bg-slate-950 text-white shadow-large dark:border-white/10'>
                <div
                  className='absolute inset-0 bg-cover bg-center opacity-45'
                  style={
                    heroPoster
                      ? { backgroundImage: `url("${heroPoster}")` }
                      : undefined
                  }
                />
                <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.78)_42%,rgba(2,6,23,0.26)_100%)]' />
                <div className='relative flex min-h-[300px] flex-col justify-end gap-6 p-6 sm:min-h-[380px] sm:p-10 lg:flex-row lg:items-end lg:justify-between'>
                  <div className='max-w-2xl'>
                    <p className='mb-3 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase text-brand-100 backdrop-blur'>
                      TintinTV
                    </p>
                    <h1 className='text-4xl font-semibold leading-tight sm:text-6xl'>
                      今晚看点，直接开播
                    </h1>
                    <p className='mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base'>
                      更少干扰，更快进入内容。热门电影、剧集和综艺都放在首页第一屏。
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-3'>
                    <Link
                      href={
                        heroItem
                          ? `/play?title=${encodeURIComponent(
                              heroItem.title
                            )}&year=${encodeURIComponent(heroItem.year || '')}`
                          : '/douban?type=movie'
                      }
                      className='inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5'
                    >
                      <PlayCircle className='h-5 w-5' />
                      立即观看
                    </Link>
                    <Link
                      href='/search'
                      className='inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15'
                    >
                      <Search className='h-5 w-5' />
                      搜索片名
                    </Link>
                  </div>
                </div>
              </section>

              {/* 继续观看 */}
              <ContinueWatching />

              {/* 热门电影 */}
              <section className='mb-6'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                    热门电影
                  </h2>
                  <Link
                    href='/douban?type=movie'
                    className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示现代骨架屏
                      Array.from({ length: 12 }).map((_, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotMovies.map((movie, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <VideoCard
                            from='douban'
                            title={movie.title}
                            poster={movie.poster}
                            douban_id={movie.id}
                            rate={movie.rate}
                            year={movie.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门剧集 */}
              <section className='mb-6'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                    热门剧集
                  </h2>
                  <Link
                    href='/douban?type=tv'
                    className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示现代骨架屏
                      Array.from({ length: 12 }).map((_, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotTvShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <VideoCard
                            from='douban'
                            title={show.title}
                            poster={show.poster}
                            douban_id={show.id}
                            rate={show.rate}
                            year={show.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>

              {/* 热门综艺 */}
              <section className='mb-6'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                    热门综艺
                  </h2>
                  <Link
                    href='/douban?type=show'
                    className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                  >
                    查看更多
                    <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
                  </Link>
                </div>
                <ScrollableRow>
                  {loading
                    ? // 加载状态显示现代骨架屏
                      Array.from({ length: 12 }).map((_, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotVarietyShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                        >
                          <VideoCard
                            from='douban'
                            title={show.title}
                            poster={show.poster}
                            douban_id={show.id}
                            rate={show.rate}
                            year={show.year}
                          />
                        </div>
                      ))}
                </ScrollableRow>
              </section>
            </>
          )}
        </div>
      </div>
      {announcement && showAnnouncement && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/70 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-6 shadow-large backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/95 sm:p-7'>
            <div className='flex justify-between items-start mb-6'>
              <h3 className='text-2xl font-semibold text-slate-950 dark:text-white'>
                提示
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white'
                aria-label='关闭'
              >
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='mb-8'>
              <div className='relative mb-6 overflow-hidden rounded-xl border border-brand-200/80 bg-brand-50/90 p-4 dark:border-brand-400/20 dark:bg-brand-400/10'>
                <div className='absolute inset-y-0 left-0 w-1 bg-brand-500'></div>
                <p className='ml-4 leading-relaxed text-slate-600 dark:text-slate-300'>
                  {announcement}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCloseAnnouncement(announcement)}
              className='w-full btn-primary'
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ErrorBoundary>
        <HomeClient />
      </ErrorBoundary>
    </Suspense>
  );
}
