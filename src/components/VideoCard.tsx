/* eslint-disable @typescript-eslint/no-explicit-any */

import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { savePlayItemsHandoff } from '@/lib/play-handoff';
import { SearchResult } from '@/lib/types';
import { processImageUrlWithCache } from '@/lib/utils';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
}

export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const countMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;

  // 重试加载图片
  const handleImageRetry = () => {
    if (retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      setImageError(false);
    }
  };

  // 当海报URL改变时重置错误状态
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
  }, [actualPoster]);

  // 生成存储键
  const storageKey = useMemo(() => {
    if (from === 'douban' && douban_id) {
      return `douban+${douban_id}`;
    }
    if (source && id) {
      return `${source}+${id}`;
    }
    return null;
  }, [from, douban_id, source, id]);

  // 解析存储键获取 source 和 id
  const { parsedSource, parsedId } = useMemo(() => {
    if (!storageKey) return { parsedSource: null, parsedId: null };
    const [source, id] = storageKey.split('+');
    return { parsedSource: source, parsedId: id };
  }, [storageKey]);

  // 获取收藏状态
  const fetchFavoriteStatus = useCallback(async () => {
    if (!parsedSource || !parsedId) return;
    try {
      const status = await isFavorited(parsedSource, parsedId);
      setFavorited(status);
    } catch {
      setFavorited(false);
    }
  }, [parsedSource, parsedId]);

  // 订阅收藏状态更新
  useEffect(() => {
    if (!parsedSource || !parsedId) return;
    fetchFavoriteStatus();
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      fetchFavoriteStatus();
    });
    return unsubscribe;
  }, [parsedSource, parsedId, fetchFavoriteStatus]);

  // 处理收藏/取消收藏
  const handleFavoriteToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!parsedSource || !parsedId || isLoading) return;
      setIsLoading(true);
      try {
        if (favorited) {
          await deleteFavorite(parsedSource, parsedId);
          setFavorited(false);
        } else {
          await saveFavorite(parsedSource, parsedId, {
            title: actualTitle,
            cover: actualPoster,
            total_episodes: episodes || 0,
            source_name: source_name || '',
            year: year || '',
            save_time: Date.now(),
            search_title: query,
          });
          setFavorited(true);
        }
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [
      parsedSource,
      parsedId,
      favorited,
      isLoading,
      actualTitle,
      actualPoster,
      episodes,
      source_name,
      query,
      year,
    ]
  );

  // 处理播放记录删除
  const handleDeletePlayRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!parsedSource || !parsedId || isLoading) return;
      setIsLoading(true);
      try {
        await deletePlayRecord(parsedSource, parsedId);
        onDelete?.();
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [parsedSource, parsedId, isLoading, onDelete]
  );

  // 处理点击事件
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (from === 'douban' && douban_id) {
        // Douban cards go directly to play page, which will search for sources
        router.push(
          `/play?title=${encodeURIComponent(
            actualTitle
          )}&year=${encodeURIComponent(year || '')}`
        );
      } else if (from === 'search' && isAggregate && items) {
        const params = new URLSearchParams();
        if (query) params.set('q', query);

        const itemsKey = savePlayItemsHandoff(items);
        if (itemsKey) {
          params.set('itemsKey', itemsKey);
        } else {
          params.set('items', JSON.stringify(items));
        }

        router.push(`/play?${params.toString()}`);
      } else if (source && id) {
        router.push(
          `/play?source=${source}&id=${id}&title=${encodeURIComponent(
            actualTitle
          )}`
        );
      }
    },
    [
      from,
      douban_id,
      actualTitle,
      year,
      isAggregate,
      items,
      query,
      source,
      id,
      router,
    ]
  );

  return (
    <div
      className='group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:z-10 w-full max-w-full min-w-0'
      onClick={handleClick}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-lg flex-shrink-0'>
        {/* 海报图片 - 使用新的图片缓存系统 */}
        <Image
          key={`${actualPoster}-${retryCount}`}
          src={processImageUrlWithCache(actualPoster, douban_id)}
          alt={actualTitle}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-110 rounded-lg'
          sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
          priority={false}
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />

        {/* 图片加载失败时的占位符 */}
        {imageError && (
          <div className='absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-4xl mb-2'>🎬</div>
              <div className='text-xs text-gray-500 dark:text-gray-400 px-2 mb-2'>
                {actualTitle}
              </div>
              {retryCount < 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageRetry();
                  }}
                  className='text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors'
                >
                  重试
                </button>
              )}
            </div>
          </div>
        )}

        {/* 悬停遮罩 - Netflix style - 移动端不显示 */}
        <div className='absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 hidden md:block' />

        {/* 播放按钮 - 移动端始终显示，桌面端悬停显示 */}
        <div className='absolute inset-0 flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 ease-out'>
          <div className='bg-white/50 md:bg-white/90 backdrop-blur-sm rounded-full p-4 md:p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300'>
            <PlayCircleIcon className='w-12 h-12 md:w-8 md:h-8 text-gray-800' />
          </div>
        </div>

        {/* 操作按钮 - 桌面端显示，移动端隐藏 */}
        <div className='absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out hidden md:flex'>
          {/* 收藏按钮 */}
          <button
            onClick={handleFavoriteToggle}
            disabled={isLoading}
            className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
          >
            {isLoading ? (
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
            ) : favorited ? (
              <Heart className='w-4 h-4 fill-red-500 text-red-500' />
            ) : (
              <Heart className='w-4 h-4' />
            )}
          </button>

          {/* 删除播放记录按钮 */}
          {from === 'playrecord' && (
            <button
              onClick={handleDeletePlayRecord}
              disabled={isLoading}
              className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              ) : (
                <Link className='w-4 h-4' />
              )}
            </button>
          )}

          {/* 删除收藏按钮 */}
          {from === 'favorite' && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              ) : (
                <CheckCircle className='w-4 h-4' />
              )}
            </button>
          )}
        </div>

        {/* 评分/集数/年份徽章 */}
        <div className='absolute bottom-2 left-2 flex flex-col gap-1'>
          {/* 评分 */}
          {rate && (
            <div className='bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium'>
              ⭐ {rate}
            </div>
          )}

          {/* 集数 */}
          {episodes && episodes > 1 && (
            <div className='bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium'>
              📺 {episodes}集
            </div>
          )}

          {/* 当前观看集数 */}
          {currentEpisode && currentEpisode > 0 && (
            <div className='bg-brand-500/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium'>
              看到第 {currentEpisode} 集
            </div>
          )}

          {/* 年份 */}
          {year && (
            <div className='bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium'>
              📅 {year}
            </div>
          )}
        </div>

        {/* 播放进度条 */}
        {progress > 0 && (
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-black/30'>
            <div
              className='h-full bg-brand-500 transition-all duration-500 ease-out'
              style={{ width: `${(progress / 100) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* 标题 */}
      <div className='mt-2 px-1'>
        <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors duration-300'>
          {actualTitle}
        </h3>
      </div>
    </div>
  );
}
