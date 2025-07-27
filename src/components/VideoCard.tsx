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

  // 获取收藏状态
  const fetchFavoriteStatus = async () => {
    if (!storageKey) return;
    try {
      const status = await isFavorited(storageKey);
      setFavorited(status);
    } catch (error) {
      console.error('Failed to fetch favorite status:', error);
    }
  };

  // 订阅收藏状态更新
  useEffect(() => {
    if (!storageKey) return;
    fetchFavoriteStatus();
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      fetchFavoriteStatus();
    });
    return unsubscribe;
  }, [storageKey]);

  // 处理收藏/取消收藏
  const handleFavoriteToggle = useCallback(async () => {
    if (!storageKey || isLoading) return;
    setIsLoading(true);
    try {
      if (favorited) {
        await deleteFavorite(storageKey);
        setFavorited(false);
      } else {
        await saveFavorite(storageKey, {
          title: actualTitle,
          cover: actualPoster,
          total_episodes: episodes || 0,
          source_name: source_name || '',
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
  }, [storageKey, favorited, isLoading, actualTitle, actualPoster, episodes, source_name, query]);

  // 处理播放记录删除
  const handleDeletePlayRecord = useCallback(async () => {
    if (!storageKey || isLoading) return;
    setIsLoading(true);
    try {
      await deletePlayRecord(storageKey);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete play record:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, isLoading, onDelete]);

  // 处理点击事件
  const handleClick = useCallback(() => {
    if (from === 'douban' && douban_id) {
      router.push(`/search?q=${encodeURIComponent(actualTitle)}&douban_id=${douban_id}`);
    } else if (from === 'search' && isAggregate && items) {
      router.push(`/play?q=${encodeURIComponent(query)}&items=${encodeURIComponent(JSON.stringify(items))}`);
    } else if (source && id) {
      router.push(`/play?source=${source}&id=${id}&title=${encodeURIComponent(actualTitle)}`);
    }
  }, [from, douban_id, actualTitle, isAggregate, items, query, source, id, router]);

  return (
    <div className='group relative rounded-2xl glass-card dark:glass-card-dark shadow-soft video-card-hover overflow-hidden'>
      {/* 海报容器 */}
      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl'>
        {/* 海报图片 */}
        <Image
          src={processImageUrl(actualPoster)}
          alt={actualTitle}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-110'
          sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
        />
        
        {/* 占位符 */}
        <ImagePlaceholder />

        {/* 悬停遮罩 */}
        <div className='absolute inset-0 bg-black/80 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100' />

        {/* 播放按钮 */}
        <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
          <div className='bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-4 shadow-large'>
            <PlayCircleIcon className='w-8 h-8 text-white' />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className='absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
          {/* 收藏按钮 */}
          {from !== 'favorite' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFavoriteToggle();
              }}
              disabled={isLoading}
              className='bg-white/20 backdrop-blur-sm border border-white/30 text-white p-2 rounded-full shadow-large hover:scale-110 transition-all duration-300'
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          )}

          {/* 已观看按钮 */}
          {from === 'playrecord' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePlayRecord();
              }}
              disabled={isLoading}
              className='bg-white/20 backdrop-blur-sm border border-white/30 text-white p-2 rounded-full shadow-large hover:scale-110 transition-all duration-300'
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
              className='bg-accent-500 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-large transition-all duration-300 ease-out group-hover:scale-110'
            >
              <Link className='w-3 h-3' />
            </a>
          )}

          {/* 评分徽章 */}
          {rate && (
            <div className='bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-large transition-all duration-300 ease-out group-hover:scale-110'>
              {rate}
            </div>
          )}
        </div>

        {/* 集数徽章 */}
        {episodes && episodes > 1 && (
          <div className='absolute top-3 left-3 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-large'>
            {episodes}集
          </div>
        )}

        {/* 年份徽章 */}
        {year && (
          <div className='absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full'>
            {year}
          </div>
        )}

        {/* 进度条 */}
        {progress > 0 && (
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-black/30'>
            <div
              className='h-full bg-brand-500 transition-all duration-500 ease-out rounded-full'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 内容信息 */}
      <div className='p-4'>
        {/* 标题 */}
        <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors duration-300'>
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
