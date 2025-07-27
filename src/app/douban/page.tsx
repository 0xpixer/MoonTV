/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const type = searchParams.get('type') || 'movie';

  // 选择器状态 - 完全独立，不依赖URL参数
  const [primarySelection, setPrimarySelection] = useState<string>(() => {
    return type === 'movie' ? '热门' : '';
  });
  const [secondarySelection, setSecondarySelection] = useState<string>(() => {
    if (type === 'movie') return '全部';
    if (type === 'tv') return 'tv';
    if (type === 'show') return 'show';
    return '全部';
  });

  // 新增的选择器状态
  const [genreSelection, setGenreSelection] = useState<string>('全部');
  const [regionSelection, setRegionSelection] = useState<string>('全部');
  const [eraSelection, setEraSelection] = useState<string>('全部');
  const [sortSelection, setSortSelection] = useState<string>('默认');

  // 原始数据状态（用于过滤）
  const [rawDoubanData, setRawDoubanData] = useState<DoubanItem[]>([]);

  // 初始化时标记选择器为准备好状态
  useEffect(() => {
    // 短暂延迟确保初始状态设置完成
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  // type变化时立即重置selectorsReady（最高优先级）
  useEffect(() => {
    setSelectorsReady(false);
    setLoading(true); // 立即显示loading状态
  }, [type]);

  // 当type变化时重置选择器状态
  useEffect(() => {
    // 批量更新选择器状态
    if (type === 'movie') {
      setPrimarySelection('热门');
      setSecondarySelection('全部');
      setGenreSelection('全部');
      setRegionSelection('全部');
      setEraSelection('全部');
      setSortSelection('默认');
    } else if (type === 'tv') {
      setPrimarySelection('');
      setSecondarySelection('tv');
      setGenreSelection('全部');
      setRegionSelection('全部');
      setEraSelection('全部');
      setSortSelection('默认');
    } else if (type === 'show') {
      setPrimarySelection('');
      setSecondarySelection('show');
      setGenreSelection('全部');
      setRegionSelection('全部');
      setEraSelection('全部');
      setSortSelection('默认');
    } else {
      setPrimarySelection('');
      setSecondarySelection('全部');
      setGenreSelection('全部');
      setRegionSelection('全部');
      setEraSelection('全部');
      setSortSelection('默认');
    }

    // 使用短暂延迟确保状态更新完成后标记选择器准备好
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [type]);

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 生成API请求参数的辅助函数
  const getRequestParams = useCallback(
    (pageStart: number) => {
      // 当type为tv或show时，kind统一为'tv'，category使用type本身
      if (type === 'tv' || type === 'show') {
        return {
          kind: 'tv' as const,
          category: type,
          type: secondarySelection,
          pageLimit: 25,
          pageStart,
        };
      }

      // 电影类型保持原逻辑，但可以扩展支持新的参数
      return {
        kind: type as 'tv' | 'movie',
        category: primarySelection,
        type: secondarySelection,
        // 新增参数（如果API支持的话）
        genre: genreSelection !== '全部' ? genreSelection : undefined,
        region: regionSelection !== '全部' ? regionSelection : undefined,
        era: eraSelection !== '全部' ? eraSelection : undefined,
        sort: sortSelection !== '默认' ? sortSelection : undefined,
        pageLimit: 25,
        pageStart,
      };
    },
    [type, primarySelection, secondarySelection, genreSelection, regionSelection, eraSelection, sortSelection]
  );

  // 防抖的数据加载函数
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDoubanCategories(getRequestParams(0));

      if (data.code === 200) {
        setRawDoubanData(data.list);
        setDoubanData(data.list);
        setHasMore(data.list.length === 25);
        setLoading(false);
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error(err);
    }
  }, [type, primarySelection, secondarySelection, getRequestParams]);

  // 客户端过滤函数
  const filterData = useCallback((data: DoubanItem[]) => {
    let filteredData = [...data];

    // 类型过滤
    if (genreSelection !== '全部') {
      // 这里需要根据实际数据结构来实现类型过滤
      // 由于豆瓣API返回的数据中没有明确的类型信息，我们可以基于标题进行简单过滤
      filteredData = filteredData.filter(item => {
        // 简单的关键词匹配（实际应用中可能需要更复杂的逻辑）
        const title = item.title.toLowerCase();
        const genreKeywords: Record<string, string[]> = {
          '动作': ['动作', '枪战', '打斗', '战争', '冒险'],
          '喜剧': ['喜剧', '搞笑', '幽默', '欢乐'],
          '爱情': ['爱情', '浪漫', '恋爱'],
          '科幻': ['科幻', '未来', '太空', '机器人'],
          '恐怖': ['恐怖', '惊悚', '鬼', '灵异'],
          '悬疑': ['悬疑', '推理', '侦探', '犯罪'],
          '剧情': ['剧情', '故事'],
          '动画': ['动画', '卡通', '动漫'],
          '纪录片': ['纪录片', '记录'],
        };
        
        const keywords = genreKeywords[genreSelection];
        return keywords ? keywords.some(keyword => title.includes(keyword)) : true;
      });
    }

    // 地区过滤
    if (regionSelection !== '全部') {
      filteredData = filteredData.filter(item => {
        const title = item.title.toLowerCase();
        const regionKeywords: Record<string, string[]> = {
          '中国大陆': ['中国大陆', '中国', '国产'],
          '中国香港': ['香港', '港片'],
          '中国台湾': ['台湾', '台片'],
          '美国': ['美国', '好莱坞'],
          '英国': ['英国', '英剧'],
          '法国': ['法国', '法片'],
          '德国': ['德国', '德片'],
          '日本': ['日本', '日片'],
          '韩国': ['韩国', '韩片'],
          '印度': ['印度', '印片'],
        };
        
        const keywords = regionKeywords[regionSelection];
        return keywords ? keywords.some(keyword => title.includes(keyword)) : true;
      });
    }

    // 年代过滤
    if (eraSelection !== '全部') {
      filteredData = filteredData.filter(item => {
        const year = parseInt(item.year);
        if (isNaN(year)) return true;
        
        const eraRanges: Record<string, [number, number]> = {
          '2020': [2020, 2029],
          '2010': [2010, 2019],
          '2000': [2000, 2009],
          '1990': [1990, 1999],
          '1980': [1980, 1989],
          '1970': [1970, 1979],
          '1960': [1960, 1969],
          'earlier': [0, 1959],
        };
        
        const range = eraRanges[eraSelection];
        return range ? year >= range[0] && year <= range[1] : true;
      });
    }

    // 排序
    if (sortSelection !== '默认') {
      filteredData.sort((a, b) => {
        switch (sortSelection) {
          case 'rating': {
            const rateA = parseFloat(a.rate) || 0;
            const rateB = parseFloat(b.rate) || 0;
            return rateB - rateA;
          }
          case 'time': {
            const yearA = parseInt(a.year) || 0;
            const yearB = parseInt(b.year) || 0;
            return yearB - yearA;
          }
          case 'votes': {
            // 由于没有投票数信息，这里按评分排序作为替代
            const rateA2 = parseFloat(a.rate) || 0;
            const rateB2 = parseFloat(b.rate) || 0;
            return rateB2 - rateA2;
          }
          default:
            return 0;
        }
      });
    }

    return filteredData;
  }, [genreSelection, regionSelection, eraSelection, sortSelection]);

  // 应用过滤器的效果
  useEffect(() => {
    if (rawDoubanData.length > 0) {
      const filtered = filterData(rawDoubanData);
      setDoubanData(filtered);
    }
  }, [rawDoubanData, filterData]);

  // 只在选择器准备好后才加载数据
  useEffect(() => {
    // 只有在选择器准备好时才开始加载
    if (!selectorsReady) {
      return;
    }

    // 重置页面状态
    setDoubanData([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsLoadingMore(false);

    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // 使用防抖机制加载数据，避免连续状态更新触发多次请求
    debounceTimeoutRef.current = setTimeout(() => {
      loadInitialData();
    }, 100); // 100ms 防抖延迟

    // 清理函数
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    selectorsReady,
    type,
    primarySelection,
    secondarySelection,
    genreSelection,
    regionSelection,
    eraSelection,
    sortSelection,
    loadInitialData,
  ]);

  // 单独处理 currentPage 变化（加载更多）
  useEffect(() => {
    if (currentPage > 0) {
      const fetchMoreData = async () => {
        try {
          setIsLoadingMore(true);

          const data = await getDoubanCategories(
            getRequestParams(currentPage * 25)
          );

          if (data.code === 200) {
            setRawDoubanData((prev) => [...prev, ...data.list]);
            // 对新加载的数据应用当前过滤器
            const filteredNewData = filterData(data.list);
            setDoubanData((prev) => [...prev, ...filteredNewData]);
            setHasMore(data.list.length === 25);
          } else {
            throw new Error(data.message || '获取数据失败');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreData();
    }
  }, [currentPage, type, primarySelection, secondarySelection, getRequestParams, filterData]);

  // 设置滚动监听
  useEffect(() => {
    // 如果没有更多数据或正在加载，则不设置监听
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    // 确保 loadingRef 存在
    if (!loadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  // 处理选择器变化
  const handlePrimaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== primarySelection) {
        setLoading(true);
        setPrimarySelection(value);
      }
    },
    [primarySelection]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== secondarySelection) {
        setLoading(true);
        setSecondarySelection(value);
      }
    },
    [secondarySelection]
  );

  // 新增的选择器处理函数
  const handleGenreChange = useCallback(
    (value: string) => {
      if (value !== genreSelection) {
        setLoading(true);
        setGenreSelection(value);
      }
    },
    [genreSelection]
  );

  const handleRegionChange = useCallback(
    (value: string) => {
      if (value !== regionSelection) {
        setLoading(true);
        setRegionSelection(value);
      }
    },
    [regionSelection]
  );

  const handleEraChange = useCallback(
    (value: string) => {
      if (value !== eraSelection) {
        setLoading(true);
        setEraSelection(value);
      }
    },
    [eraSelection]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (value !== sortSelection) {
        setLoading(true);
        setSortSelection(value);
      }
    },
    [sortSelection]
  );

  const getPageTitle = () => {
    // 根据 type 生成标题
    return type === 'movie' ? '电影' : type === 'tv' ? '电视剧' : '综艺';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='px-4 sm:px-10 py-4 sm:py-8 overflow-visible'>
        {/* 页面标题和选择器 */}
        <div className='mb-6 sm:mb-8 space-y-4 sm:space-y-6'>
          {/* 页面标题 */}
          <div>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 dark:text-gray-200'>
              {getPageTitle()}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400'>
              来自豆瓣的精选内容
            </p>
          </div>

          {/* 选择器组件 */}
          <div className='bg-white/60 dark:bg-gray-800/40 rounded-2xl p-4 sm:p-6 border border-gray-200/30 dark:border-gray-700/30 backdrop-blur-sm'>
            <DoubanSelector
              type={type as 'movie' | 'tv' | 'show'}
              primarySelection={primarySelection}
              secondarySelection={secondarySelection}
              onPrimaryChange={handlePrimaryChange}
              onSecondaryChange={handleSecondaryChange}
              genreSelection={genreSelection}
              regionSelection={regionSelection}
              eraSelection={eraSelection}
              sortSelection={sortSelection}
              onGenreChange={handleGenreChange}
              onRegionChange={handleRegionChange}
              onEraChange={handleEraChange}
              onSortChange={handleSortChange}
            />
          </div>
        </div>

        {/* 内容展示区域 */}
        <div className='max-w-[95%] mx-auto mt-8 overflow-visible'>
          {/* 内容网格 */}
          <div className='grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:px-2 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20'>
            {loading || !selectorsReady
              ? // 显示骨架屏
                skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
              : // 显示实际数据
                doubanData.map((item, index) => (
                  <div key={`${item.title}-${index}`} className='w-full'>
                    <VideoCard
                      from='douban'
                      title={item.title}
                      poster={item.poster}
                      douban_id={item.id}
                      rate={item.rate}
                      year={item.year}
                      type={type === 'movie' ? 'movie' : ''} // 电影类型严格控制，tv 不控
                    />
                  </div>
                ))}
          </div>

          {/* 加载更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={(el) => {
                if (el && el.offsetParent !== null) {
                  (
                    loadingRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = el;
                }
              }}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-green-500'></div>
                  <span className='text-gray-600'>加载中...</span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && doubanData.length > 0 && (
            <div className='text-center text-gray-500 py-8'>已加载全部内容</div>
          )}

          {/* 空状态 */}
          {!loading && doubanData.length === 0 && (
            <div className='text-center text-gray-500 py-8'>暂无相关内容</div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
