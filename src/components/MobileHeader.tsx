'use client';

import Image from 'next/image';
import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='md:hidden sticky top-0 z-[550] w-full border-b border-slate-200/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80'>
      <div className='h-14 flex items-center justify-between px-4'>
        {/* 左侧：返回按钮和设置按钮 */}
        <div className='flex items-center gap-3'>
          {showBackButton && <BackButton />}
        </div>

        {/* 右侧按钮 */}
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* 中间：Logo（绝对居中） */}
      <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Link
          href='/'
          className='flex items-center gap-2 hover:opacity-80 transition-all duration-300 group'
        >
          {/* Logo Image */}
          <div className='relative w-8 h-8'>
            <Image
              src='/logo.png'
              alt={siteName}
              fill
              className='object-contain transition-transform duration-300 group-hover:scale-110'
            />
          </div>
          {/* Site Name */}
          <div className='relative'>
            <span className='text-lg font-semibold gradient-text'>
              {siteName}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default MobileHeader;
