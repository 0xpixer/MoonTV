/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight } from 'lucide-react';
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

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              应用加载出错
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors"
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

  // Add debugging for PWA
  useEffect(() => {
    console.log('HomeClient: Component mounted');
    console.log('PWA Mode:', window.matchMedia('(display-mode: standalone)').matches);
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
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
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
      <div className='px-4 sm:px-8 py-4 sm:py-8 overflow-visible'>
        {/* 顶部 Tab 切换 */}
        <div className='mb-8 flex justify-center'>
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
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                  我的收藏
                </h2>
                {favoriteItems.length > 0 && (
                  <button
                    className='text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-300'
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
                  <div className='col-span-full text-center text-gray-500 py-12 dark:text-gray-400'>
                    <div className='text-6xl mb-4'>📺</div>
                    <p className='text-lg'>暂无收藏内容</p>
                    <p className='text-sm mt-2'>开始探索精彩内容吧</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            // 首页视图
            <>
              {/* 继续观看 */}
              <ContinueWatching />

              {/* 热门电影 */}
              <section className='mb-6'>
                <div className='mb-4 flex items-center justify-between'>
                  <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    热门电影
                  </h2>
                  <Link
                    href='/douban?type=movie'
                    className='flex items-center text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-300 group'
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
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotMovies.map((movie, index) => (
                        <div
                          key={index}
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
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
                  <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    热门剧集
                  </h2>
                  <Link
                    href='/douban?type=tv'
                    className='flex items-center text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-300 group'
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
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotTvShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
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
                  <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                    热门综艺
                  </h2>
                  <Link
                    href='/douban?type=show'
                    className='flex items-center text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors duration-300 group'
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
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
                        >
                          <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse'>
                            <div className='absolute inset-0 shimmer'></div>
                          </div>
                          <div className='mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded shimmer'></div>
                        </div>
                      ))
                    : // 显示真实数据
                      hotVarietyShows.map((show, index) => (
                        <div
                          key={index}
                          className='min-w-[120px] w-30 sm:min-w-[160px] sm:w-40 flex-shrink-0'
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
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm dark:bg-black/70 p-4 transition-opacity duration-300 ${
            showAnnouncement ? '' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className='w-full max-w-md rounded-2xl glass-card dark:glass-card-dark p-8 shadow-large transform transition-all duration-300 hover:shadow-glow-lg'>
            <div className='flex justify-between items-start mb-6'>
              <h3 className='text-2xl font-bold tracking-tight text-brand-500 dark:text-brand-400'>
                提示
              </h3>
              <button
                onClick={() => handleCloseAnnouncement(announcement)}
                className='text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-white transition-colors duration-300'
                aria-label='关闭'
              ></button>
            </div>
            <div className='mb-8'>
              <div className='relative overflow-hidden rounded-xl mb-6 bg-brand-50 dark:bg-brand-900/20 p-4 border border-brand-200/50 dark:border-brand-700/30'>
                <div className='absolute inset-y-0 left-0 w-1 bg-brand-500'></div>
                <p className='ml-4 text-gray-600 dark:text-gray-300 leading-relaxed'>
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
