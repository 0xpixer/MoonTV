/* eslint-disable react-hooks/exhaustive-deps */

'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SelectorOption {
  label: string;
  value: string;
}

interface DoubanSelectorProps {
  type: 'movie' | 'tv' | 'show';
  primarySelection?: string;
  secondarySelection?: string;
  onPrimaryChange: (value: string) => void;
  onSecondaryChange: (value: string) => void;
  // New props for additional selectors
  genreSelection?: string;
  regionSelection?: string;
  eraSelection?: string;
  sortSelection?: string;
  onGenreChange?: (value: string) => void;
  onRegionChange?: (value: string) => void;
  onEraChange?: (value: string) => void;
  onSortChange?: (value: string) => void;
}

const DoubanSelector: React.FC<DoubanSelectorProps> = ({
  type,
  primarySelection,
  secondarySelection,
  onPrimaryChange,
  onSecondaryChange,
  // New props with defaults
  genreSelection = '全部',
  regionSelection = '全部',
  eraSelection = '全部',
  sortSelection = '默认',
  onGenreChange = () => {},
  onRegionChange = () => {},
  onEraChange = () => {},
  onSortChange = () => {},
}) => {
  // 为不同的选择器创建独立的refs和状态
  const primaryContainerRef = useRef<HTMLDivElement>(null);
  const primaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [primaryIndicatorStyle, setPrimaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const secondaryContainerRef = useRef<HTMLDivElement>(null);
  const secondaryButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [secondaryIndicatorStyle, setSecondaryIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // New refs and states for additional selectors
  const genreContainerRef = useRef<HTMLDivElement>(null);
  const genreButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [genreIndicatorStyle, setGenreIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const regionContainerRef = useRef<HTMLDivElement>(null);
  const regionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [regionIndicatorStyle, setRegionIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const eraContainerRef = useRef<HTMLDivElement>(null);
  const eraButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [eraIndicatorStyle, setEraIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const sortContainerRef = useRef<HTMLDivElement>(null);
  const sortButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sortIndicatorStyle, setSortIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // 电影的一级选择器选项
  const moviePrimaryOptions: SelectorOption[] = [
    { label: '热门电影', value: '热门' },
    { label: '最新电影', value: '最新' },
    { label: '豆瓣高分', value: '豆瓣高分' },
    { label: '冷门佳片', value: '冷门佳片' },
  ];

  // 电影的二级选择器选项
  const movieSecondaryOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '华语', value: '华语' },
    { label: '欧美', value: '欧美' },
    { label: '韩国', value: '韩国' },
    { label: '日本', value: '日本' },
  ];

  // 新增的电影类型选择器选项
  const movieGenreOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '动作', value: '动作' },
    { label: '喜剧', value: '喜剧' },
    { label: '爱情', value: '爱情' },
    { label: '科幻', value: '科幻' },
    { label: '恐怖', value: '恐怖' },
    { label: '悬疑', value: '悬疑' },
    { label: '剧情', value: '剧情' },
    { label: '动画', value: '动画' },
    { label: '纪录片', value: '纪录片' },
  ];

  // 新增的电影地区选择器选项
  const movieRegionOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '中国大陆', value: '中国大陆' },
    { label: '中国香港', value: '中国香港' },
    { label: '中国台湾', value: '中国台湾' },
    { label: '美国', value: '美国' },
    { label: '英国', value: '英国' },
    { label: '法国', value: '法国' },
    { label: '德国', value: '德国' },
    { label: '日本', value: '日本' },
    { label: '韩国', value: '韩国' },
    { label: '印度', value: '印度' },
  ];

  // 新增的电影年代选择器选项
  const movieEraOptions: SelectorOption[] = [
    { label: '全部', value: '全部' },
    { label: '2020年代', value: '2020' },
    { label: '2010年代', value: '2010' },
    { label: '2000年代', value: '2000' },
    { label: '1990年代', value: '1990' },
    { label: '1980年代', value: '1980' },
    { label: '1970年代', value: '1970' },
    { label: '1960年代', value: '1960' },
    { label: '更早', value: 'earlier' },
  ];

  // 新增的电影排序选择器选项
  const movieSortOptions: SelectorOption[] = [
    { label: '默认', value: '默认' },
    { label: '评分最高', value: 'rating' },
    { label: '最新上映', value: 'time' },
    { label: '最多评价', value: 'votes' },
  ];

  // 电视剧选择器选项
  const tvOptions: SelectorOption[] = [
    { label: '全部', value: 'tv' },
    { label: '国产', value: 'tv_domestic' },
    { label: '欧美', value: 'tv_american' },
    { label: '日本', value: 'tv_japanese' },
    { label: '韩国', value: 'tv_korean' },
    { label: '动漫', value: 'tv_animation' },
    { label: '纪录片', value: 'tv_documentary' },
  ];

  // 综艺选择器选项
  const showOptions: SelectorOption[] = [
    { label: '全部', value: 'show' },
    { label: '国内', value: 'show_domestic' },
    { label: '国外', value: 'show_foreign' },
  ];

  // 更新指示器位置的通用函数
  const updateIndicatorPosition = (
    activeIndex: number,
    containerRef: React.RefObject<HTMLDivElement>,
    buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>,
    setIndicatorStyle: React.Dispatch<
      React.SetStateAction<{ left: number; width: number }>
    >
  ) => {
    if (
      activeIndex >= 0 &&
      buttonRefs.current[activeIndex] &&
      containerRef.current
    ) {
      const timeoutId = setTimeout(() => {
        const button = buttonRefs.current[activeIndex];
        const container = containerRef.current;
        if (button && container) {
          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (buttonRect.width > 0) {
            setIndicatorStyle({
              left: buttonRect.left - containerRect.left,
              width: buttonRect.width,
            });
          }
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  };

  // 组件挂载时立即计算初始位置
  useEffect(() => {
    // 主选择器初始位置
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) =>
          opt.value === (primarySelection || moviePrimaryOptions[0].value)
      );
      updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
    }

    // 副选择器初始位置
    let secondaryActiveIndex = -1;
    if (type === 'movie') {
      secondaryActiveIndex = movieSecondaryOptions.findIndex(
        (opt) =>
          opt.value === (secondarySelection || movieSecondaryOptions[0].value)
      );
    } else if (type === 'tv') {
      secondaryActiveIndex = tvOptions.findIndex(
        (opt) => opt.value === (secondarySelection || tvOptions[0].value)
      );
    } else if (type === 'show') {
      secondaryActiveIndex = showOptions.findIndex(
        (opt) => opt.value === (secondarySelection || showOptions[0].value)
      );
    }

    if (secondaryActiveIndex >= 0) {
      updateIndicatorPosition(
        secondaryActiveIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
    }

    // 新增选择器的初始位置计算
    if (type === 'movie') {
      // 类型选择器
      const genreActiveIndex = movieGenreOptions.findIndex(
        (opt) => opt.value === genreSelection
      );
      updateIndicatorPosition(
        genreActiveIndex,
        genreContainerRef,
        genreButtonRefs,
        setGenreIndicatorStyle
      );

      // 地区选择器
      const regionActiveIndex = movieRegionOptions.findIndex(
        (opt) => opt.value === regionSelection
      );
      updateIndicatorPosition(
        regionActiveIndex,
        regionContainerRef,
        regionButtonRefs,
        setRegionIndicatorStyle
      );

      // 年代选择器
      const eraActiveIndex = movieEraOptions.findIndex(
        (opt) => opt.value === eraSelection
      );
      updateIndicatorPosition(
        eraActiveIndex,
        eraContainerRef,
        eraButtonRefs,
        setEraIndicatorStyle
      );

      // 排序选择器
      const sortActiveIndex = movieSortOptions.findIndex(
        (opt) => opt.value === sortSelection
      );
      updateIndicatorPosition(
        sortActiveIndex,
        sortContainerRef,
        sortButtonRefs,
        setSortIndicatorStyle
      );
    }
  }, [type]); // 只在type变化时重新计算

  // 监听主选择器变化
  useEffect(() => {
    if (type === 'movie') {
      const activeIndex = moviePrimaryOptions.findIndex(
        (opt) => opt.value === primarySelection
      );
      const cleanup = updateIndicatorPosition(
        activeIndex,
        primaryContainerRef,
        primaryButtonRefs,
        setPrimaryIndicatorStyle
      );
      return cleanup;
    }
  }, [primarySelection]);

  // 监听副选择器变化
  useEffect(() => {
    let activeIndex = -1;
    let options: SelectorOption[] = [];

    if (type === 'movie') {
      activeIndex = movieSecondaryOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = movieSecondaryOptions;
    } else if (type === 'tv') {
      activeIndex = tvOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = tvOptions;
    } else if (type === 'show') {
      activeIndex = showOptions.findIndex(
        (opt) => opt.value === secondarySelection
      );
      options = showOptions;
    }

    if (options.length > 0) {
      const cleanup = updateIndicatorPosition(
        activeIndex,
        secondaryContainerRef,
        secondaryButtonRefs,
        setSecondaryIndicatorStyle
      );
      return cleanup;
    }
  }, [secondarySelection]);

  // 监听新增选择器变化
  useEffect(() => {
    if (type === 'movie') {
      const genreActiveIndex = movieGenreOptions.findIndex(
        (opt) => opt.value === genreSelection
      );
      const cleanup = updateIndicatorPosition(
        genreActiveIndex,
        genreContainerRef,
        genreButtonRefs,
        setGenreIndicatorStyle
      );
      return cleanup;
    }
  }, [genreSelection]);

  useEffect(() => {
    if (type === 'movie') {
      const regionActiveIndex = movieRegionOptions.findIndex(
        (opt) => opt.value === regionSelection
      );
      const cleanup = updateIndicatorPosition(
        regionActiveIndex,
        regionContainerRef,
        regionButtonRefs,
        setRegionIndicatorStyle
      );
      return cleanup;
    }
  }, [regionSelection]);

  useEffect(() => {
    if (type === 'movie') {
      const eraActiveIndex = movieEraOptions.findIndex(
        (opt) => opt.value === eraSelection
      );
      const cleanup = updateIndicatorPosition(
        eraActiveIndex,
        eraContainerRef,
        eraButtonRefs,
        setEraIndicatorStyle
      );
      return cleanup;
    }
  }, [eraSelection]);

  useEffect(() => {
    if (type === 'movie') {
      const sortActiveIndex = movieSortOptions.findIndex(
        (opt) => opt.value === sortSelection
      );
      const cleanup = updateIndicatorPosition(
        sortActiveIndex,
        sortContainerRef,
        sortButtonRefs,
        setSortIndicatorStyle
      );
      return cleanup;
    }
  }, [sortSelection]);

  // 渲染胶囊式选择器
  const renderCapsuleSelector = (
    options: SelectorOption[],
    activeValue: string | undefined,
    onChange: (value: string) => void,
    selectorType: 'primary' | 'secondary' | 'genre' | 'region' | 'era' | 'sort' = 'secondary'
  ) => {
    let containerRef: React.RefObject<HTMLDivElement>;
    let buttonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
    let indicatorStyle: { left: number; width: number };

    switch (selectorType) {
      case 'primary':
        containerRef = primaryContainerRef;
        buttonRefs = primaryButtonRefs;
        indicatorStyle = primaryIndicatorStyle;
        break;
      case 'genre':
        containerRef = genreContainerRef;
        buttonRefs = genreButtonRefs;
        indicatorStyle = genreIndicatorStyle;
        break;
      case 'region':
        containerRef = regionContainerRef;
        buttonRefs = regionButtonRefs;
        indicatorStyle = regionIndicatorStyle;
        break;
      case 'era':
        containerRef = eraContainerRef;
        buttonRefs = eraButtonRefs;
        indicatorStyle = eraIndicatorStyle;
        break;
      case 'sort':
        containerRef = sortContainerRef;
        buttonRefs = sortButtonRefs;
        indicatorStyle = sortIndicatorStyle;
        break;
      default:
        containerRef = secondaryContainerRef;
        buttonRefs = secondaryButtonRefs;
        indicatorStyle = secondaryIndicatorStyle;
    }

    return (
      <div
        ref={containerRef}
        className='relative inline-flex bg-gray-200/60 rounded-full p-0.5 sm:p-1 dark:bg-gray-700/60 backdrop-blur-sm'
      >
        {/* 滑动的白色背景指示器 */}
        {indicatorStyle.width > 0 && (
          <div
            className='absolute top-0.5 bottom-0.5 sm:top-1 sm:bottom-1 bg-white dark:bg-gray-500 rounded-full shadow-sm transition-all duration-300 ease-out'
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        )}

        {options.map((option, index) => {
          const isActive = activeValue === option.value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              onClick={() => onChange(option.value)}
              className={`relative z-10 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'text-gray-900 dark:text-gray-100 cursor-default'
                  : 'text-gray-700 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className='space-y-4 sm:space-y-6'>
      {/* 电影类型 - 显示多级选择器 */}
      {type === 'movie' && (
        <div className='space-y-3 sm:space-y-4'>
          {/* 一级选择器 - 分类 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              分类
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                moviePrimaryOptions,
                primarySelection || moviePrimaryOptions[0].value,
                onPrimaryChange,
                'primary'
              )}
            </div>
          </div>

          {/* 二级选择器 - 地区 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              地区
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieSecondaryOptions,
                secondarySelection || movieSecondaryOptions[0].value,
                onSecondaryChange,
                'secondary'
              )}
            </div>
          </div>

          {/* 三级选择器 - 类型 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              类型
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieGenreOptions,
                genreSelection,
                onGenreChange,
                'genre'
              )}
            </div>
          </div>

          {/* 四级选择器 - 地区细分 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              地区细分
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieRegionOptions,
                regionSelection,
                onRegionChange,
                'region'
              )}
            </div>
          </div>

          {/* 五级选择器 - 年代 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              年代
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieEraOptions,
                eraSelection,
                onEraChange,
                'era'
              )}
            </div>
          </div>

          {/* 六级选择器 - 排序 */}
          <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
            <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
              排序
            </span>
            <div className='overflow-x-auto'>
              {renderCapsuleSelector(
                movieSortOptions,
                sortSelection,
                onSortChange,
                'sort'
              )}
            </div>
          </div>
        </div>
      )}

      {/* 电视剧类型 - 只显示一级选择器 */}
      {type === 'tv' && (
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
            类型
          </span>
          <div className='overflow-x-auto'>
            {renderCapsuleSelector(
              tvOptions,
              secondarySelection || tvOptions[0].value,
              onSecondaryChange,
              'secondary'
            )}
          </div>
        </div>
      )}

      {/* 综艺类型 - 只显示一级选择器 */}
      {type === 'show' && (
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <span className='text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[48px]'>
            类型
          </span>
          <div className='overflow-x-auto'>
            {renderCapsuleSelector(
              showOptions,
              secondarySelection || showOptions[0].value,
              onSecondaryChange,
              'secondary'
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoubanSelector;
