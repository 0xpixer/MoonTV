'use client';

import { Clover, Film, Home, Menu, Search, Tv } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { useSite } from './SiteProvider';

interface SidebarContextType {
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
});

export const useSidebar = () => useContext(SidebarContext);

// 现代 Logo 组件
const Logo = () => {
  const { siteName } = useSite();
  return (
    <Link
      href='/'
      className='flex items-center justify-center h-16 select-none hover:opacity-80 transition-all duration-300 group'
    >
      <div className='flex items-center gap-3'>
        {/* Logo Image */}
        <div className='relative w-10 h-10'>
          <Image
            src='/logo.png'
            alt={siteName}
            fill
            className='object-contain transition-transform duration-300 group-hover:scale-110'
          />
        </div>
        {/* Site Name */}
        <div className='relative'>
          <span className='text-xl font-bold gradient-text tracking-tight'>
            {siteName}
          </span>
          <div className='absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
        </div>
      </div>
    </Link>
  );
};

interface SidebarProps {
  onToggle?: (collapsed: boolean) => void;
  activePath?: string;
}

// 在浏览器环境下通过全局变量缓存折叠状态，避免组件重新挂载时出现初始值闪烁
declare global {
  interface Window {
    __sidebarCollapsed?: boolean;
  }
}

const Sidebar = ({ onToggle, activePath = '/' }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // 若同一次 SPA 会话中已经读取过折叠状态，则直接复用，避免闪烁
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.__sidebarCollapsed === 'boolean'
    ) {
      return window.__sidebarCollapsed;
    }
    return false; // 默认展开
  });

  // 首次挂载时读取 localStorage，以便刷新后仍保持上次的折叠状态
  useLayoutEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      const val = JSON.parse(saved);
      setIsCollapsed(val);
      window.__sidebarCollapsed = val;
    }
  }, []);

  // 当折叠状态变化时，同步到 <html> data 属性，供首屏 CSS 使用
  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      if (isCollapsed) {
        document.documentElement.dataset.sidebarCollapsed = 'true';
      } else {
        delete document.documentElement.dataset.sidebarCollapsed;
      }
    }
  }, [isCollapsed]);

  const [active, setActive] = useState(activePath);

  useEffect(() => {
    // 优先使用传入的 activePath
    if (activePath) {
      setActive(activePath);
    } else {
      // 否则使用当前路径
      const getCurrentFullPath = () => {
        const queryString = searchParams.toString();
        return queryString ? `${pathname}?${queryString}` : pathname;
      };
      const fullPath = getCurrentFullPath();
      setActive(fullPath);
    }
  }, [activePath, pathname, searchParams]);

  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    if (typeof window !== 'undefined') {
      window.__sidebarCollapsed = newState;
    }
    onToggle?.(newState);
  }, [isCollapsed, onToggle]);

  const handleSearchClick = useCallback(() => {
    router.push('/search');
  }, [router]);

  const contextValue = {
    isCollapsed,
  };

  const menuItems = [
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
    },
  ];

  return (
    <SidebarContext.Provider value={contextValue}>
      {/* 在移动端隐藏侧边栏 */}
      <div className='hidden md:flex'>
        <aside
          data-sidebar
          className={`fixed top-0 left-0 h-screen glass-card dark:glass-card-dark transition-all duration-500 ease-out z-10 ${
            isCollapsed ? 'w-20' : 'w-72'
          }`}
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          <div className='flex h-full flex-col'>
            {/* 顶部 Logo 区域 */}
            <div className='relative h-16'>
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                  isCollapsed ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                <div className='w-[calc(100%-2rem)] flex justify-center'>
                  {!isCollapsed && <Logo />}
                </div>
              </div>
              {/* Collapsed Logo - Only show image when collapsed */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                  isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              >
                {isCollapsed && (
                  <Link
                    href='/'
                    className='flex items-center justify-center w-12 h-12 select-none hover:opacity-80 transition-all duration-300 group'
                  >
                    <div className='relative w-8 h-8'>
                      <Image
                        src='/logo.png'
                        alt='MoonTV'
                        fill
                        className='object-contain transition-transform duration-300 group-hover:scale-110'
                      />
                    </div>
                  </Link>
                )}
              </div>
              <button
                onClick={handleToggle}
                className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-gray-600 hover:text-gray-800 hover:bg-white/20 transition-all duration-300 ease-out z-10 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-white/10 ${
                  isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-3'
                }`}
              >
                <Menu className='h-5 w-5' />
              </button>
            </div>

            {/* 首页和搜索导航 */}
            <nav className='px-3 mt-6 space-y-2'>
              <Link
                href='/'
                onClick={() => setActive('/')}
                data-active={active === '/'}
                className={`group flex items-center rounded-xl px-4 py-3 text-gray-700 hover:bg-white/20 hover:text-brand-600 data-[active=true]:bg-gradient-to-r data-[active=true]:from-brand-500/20 data-[active=true]:to-accent-500/20 data-[active=true]:text-brand-700 font-medium transition-all duration-300 ease-out min-h-[48px] dark:text-gray-300 dark:hover:text-brand-400 dark:data-[active=true]:text-brand-300 ${
                  isCollapsed ? 'w-full max-w-none mx-0' : 'mx-0'
                } gap-4 justify-start border border-transparent hover:border-white/20 data-[active=true]:border-brand-500/30`}
              >
                <div className='w-5 h-5 flex items-center justify-center'>
                  <Home className='h-5 w-5 text-gray-500 group-hover:text-brand-600 data-[active=true]:text-brand-700 dark:text-gray-400 dark:group-hover:text-brand-400 dark:data-[active=true]:text-brand-300 transition-colors duration-300' />
                </div>
                {!isCollapsed && (
                  <span className='whitespace-nowrap transition-all duration-500 ease-out opacity-100'>
                    首页
                  </span>
                )}
              </Link>
              <Link
                href='/search'
                onClick={(e) => {
                  e.preventDefault();
                  handleSearchClick();
                  setActive('/search');
                }}
                data-active={active === '/search'}
                className={`group flex items-center rounded-xl px-4 py-3 text-gray-700 hover:bg-white/20 hover:text-brand-600 data-[active=true]:bg-gradient-to-r data-[active=true]:from-brand-500/20 data-[active=true]:to-accent-500/20 data-[active=true]:text-brand-700 font-medium transition-all duration-300 ease-out min-h-[48px] dark:text-gray-300 dark:hover:text-brand-400 dark:data-[active=true]:text-brand-300 ${
                  isCollapsed ? 'w-full max-w-none mx-0' : 'mx-0'
                } gap-4 justify-start border border-transparent hover:border-white/20 data-[active=true]:border-brand-500/30`}
              >
                <div className='w-5 h-5 flex items-center justify-center'>
                  <Search className='h-5 w-5 text-gray-500 group-hover:text-brand-600 data-[active=true]:text-brand-700 dark:text-gray-400 dark:group-hover:text-brand-400 dark:data-[active=true]:text-brand-300 transition-colors duration-300' />
                </div>
                {!isCollapsed && (
                  <span className='whitespace-nowrap transition-all duration-500 ease-out opacity-100'>
                    搜索
                  </span>
                )}
              </Link>
            </nav>

            {/* 菜单项 */}
            <div className='flex-1 overflow-y-auto px-3 pt-6'>
              <div className='space-y-2'>
                {menuItems.map((item) => {
                  // 检查当前路径是否匹配这个菜单项
                  const typeMatch = item.href.match(/type=([^&]+)/)?.[1];
                  const tagMatch = item.href.match(/tag=([^&]+)/)?.[1];

                  // 解码URL以进行正确的比较
                  const decodedActive = decodeURIComponent(active);
                  const decodedItemHref = decodeURIComponent(item.href);

                  const isActive =
                    decodedActive === decodedItemHref ||
                    (decodedActive.startsWith('/douban') &&
                      decodedActive.includes(`type=${typeMatch}`) &&
                      tagMatch &&
                      decodedActive.includes(`tag=${tagMatch}`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setActive(item.href)}
                      data-active={isActive}
                      className={`group flex items-center rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-white/20 hover:text-brand-600 data-[active=true]:bg-gradient-to-r data-[active=true]:from-brand-500/20 data-[active=true]:to-accent-500/20 data-[active=true]:text-brand-700 transition-all duration-300 ease-out min-h-[48px] dark:text-gray-300 dark:hover:text-brand-400 dark:data-[active=true]:text-brand-300 ${
                        isCollapsed ? 'w-full max-w-none mx-0' : 'mx-0'
                      } gap-4 justify-start border border-transparent hover:border-white/20 data-[active=true]:border-brand-500/30`}
                    >
                      <div className='w-5 h-5 flex items-center justify-center'>
                        <Icon className='h-5 w-5 text-gray-500 group-hover:text-brand-600 data-[active=true]:text-brand-700 dark:text-gray-400 dark:group-hover:text-brand-400 dark:data-[active=true]:text-brand-300 transition-colors duration-300' />
                      </div>
                      {!isCollapsed && (
                        <span className='whitespace-nowrap transition-all duration-500 ease-out opacity-100'>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
        <div
          className={`transition-all duration-500 ease-out sidebar-offset ${
            isCollapsed ? 'w-20' : 'w-72'
          }`}
        ></div>
      </div>
    </SidebarContext.Provider>
  );
};

export default Sidebar;
