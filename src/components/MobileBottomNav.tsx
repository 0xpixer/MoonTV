'use client';

import { Clover, Film, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    { icon: Search, label: '搜索', href: '/search' },
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

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='md:hidden fixed left-0 right-0 z-[600] glass-card dark:glass-card-dark border-t border-white/20 dark:border-gray-700/30 overflow-hidden'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className='flex items-center'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className='flex-shrink-0 w-1/5'>
              <Link
                href={item.href}
                className='flex flex-col items-center justify-center w-full h-16 gap-1 text-xs transition-all duration-300 ease-out group'
              >
                <div className={`relative p-2 rounded-xl transition-all duration-300 ease-out ${
                  active 
                    ? 'bg-gradient-to-r from-brand-500/20 to-accent-500/20 border border-brand-500/30' 
                    : 'hover:bg-white/10 border border-transparent'
                }`}>
                  <item.icon
                    className={`h-6 w-6 transition-all duration-300 ease-out ${
                      active
                        ? 'text-brand-600 dark:text-brand-400'
                        : 'text-gray-500 dark:text-gray-400 group-hover:text-brand-500 dark:group-hover:text-brand-400'
                    }`}
                  />
                  {active && (
                    <div className='absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-accent-500/20 rounded-xl blur opacity-0 animate-pulse'></div>
                  )}
                </div>
                <span
                  className={`font-medium transition-all duration-300 ease-out ${
                    active
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-300 group-hover:text-brand-500 dark:group-hover:text-brand-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
