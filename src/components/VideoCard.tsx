/* eslint-disable @typescript-eslint/no-explicit-any */

import { CheckCircle, Heart, Link, PlayCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  generateStorageKey,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { SearchResult } from '@/lib/types';
import { processImageUrl } from '@/lib/utils';

import { ImagePlaceholder } from '@/components/ImagePlaceholder';

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
  type?: string;
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
  type = '',
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
  const fetchFavoriteStatus = async () => {
    if (!parsedSource || !parsedId) return;
    try {
      const status = await isFavorited(parsedSource, parsedId);
      setFavorited(status);
    } catch (error) {
      console.error('Failed to fetch favorite status:', error);
    }
  };

  // 订阅收藏状态更新
  useEffect(() => {
    if (!parsedSource || !parsedId) return;
    fetchFavoriteStatus();
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      fetchFavoriteStatus();
    });
    return unsubscribe;
  }, [parsedSource, parsedId]);

  // 处理收藏/取消收藏
  const handleFavoriteToggle = useCallback(async (e: React.MouseEvent) => {
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
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parsedSource, parsedId, favorited, isLoading, actualTitle, actualPoster, episodes, source_name, query]);

  // 处理播放记录删除
  const handleDeletePlayRecord = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!parsedSource || !parsedId || isLoading) return;
    setIsLoading(true);
    try {
      await deletePlayRecord(parsedSource, parsedId);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete play record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [parsedSource, parsedId, isLoading, onDelete]);

  // 处理点击事件
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (from === 'douban' && douban_id) {
      // Douban cards go directly to play page, which will search for sources
      router.push(`/play?title=${encodeURIComponent(actualTitle)}&year=${encodeURIComponent(year || '')}`);
    } else if (from === 'search' && isAggregate && items) {
      router.push(`/play?q=${encodeURIComponent(query)}&items=${encodeURIComponent(JSON.stringify(items))}`);
    } else if (source && id) {
      router.push(`/play?source=${source}&id=${id}&title=${encodeURIComponent(actualTitle)}`);
    }
  }, [from, douban_id, actualTitle, year, isAggregate, items, query, source, id, router]);

  return (
    <div 
      className='group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:z-10'
      onClick={handleClick}
      style={{ 
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden'>
        {/* 海报图片 */}
        <Image
          src={processImageUrl(actualPoster)}
          alt={actualTitle}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-110'
          sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
          priority={false}
        />
        
        {/* 占位符 */}
        <ImagePlaceholder aspectRatio="aspect-[2/3]" />

        {/* 悬停遮罩 - Netflix style */}
        <div className='absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100' />

        {/* 播放按钮 - Netflix style */}
        <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out'>
          <div className='bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300'>
            <PlayCircleIcon className='w-6 h-6 text-black' />
          </div>
        </div>

        {/* 操作按钮 - Netflix style */}
        <div className='absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out'>
          {/* 收藏按钮 */}
          {from !== 'favorite' && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
              style={{ touchAction: 'manipulation' }}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}

          {/* 已观看按钮 */}
          {from === 'playrecord' && (
            <button
              onClick={handleDeletePlayRecord}
              disabled={isLoading}
              className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
              style={{ touchAction: 'manipulation' }}
            >
              <CheckCircle className='w-4 h-4' />
            </button>
          )}

          {/* 豆瓣链接按钮 */}
          {from === 'douban' && douban_id && (
            <a
              href={`https://movie.douban.com/subject/${douban_id}/`}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className='bg-black/70 backdrop-blur-sm text-white p-2 rounded-full shadow-lg hover:bg-black/90 transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center'
              style={{ touchAction: 'manipulation' }}
            >
              <Link className='w-3 h-3' />
            </a>
          )}

          {/* 评分徽章 */}
          {rate && (
            <div className='bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded shadow-lg'>
              {rate}
            </div>
          )}
        </div>

        {/* 集数徽章 */}
        {episodes && episodes > 1 && (
          <div className='absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded shadow-lg'>
            {episodes}集
          </div>
        )}

        {/* 年份徽章 */}
        {year && (
          <div className='absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded shadow-lg'>
            {year}
          </div>
        )}

        {/* 进度条 - Netflix style */}
        {progress > 0 && (
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-black/30'>
            <div
              className='h-full bg-brand-500 transition-all duration-500 ease-out'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 内容信息 - Netflix style */}
      <div className='p-2'>
        {/* 标题 */}
        <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors duration-300'>
          {actualTitle}
        </h3>

        {/* 来源信息 */}
        {source_name && (
          <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
            {source_name}
          </p>
        )}

        {/* 当前集数信息 */}
        {currentEpisode && episodes && currentEpisode > 0 && (
          <p className='text-xs text-brand-500 dark:text-brand-400 mt-1'>
            看到第 {currentEpisode} 集
          </p>
        )}
      </div>
    </div>
  );
}
