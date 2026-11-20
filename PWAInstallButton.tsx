import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        <span>Install Mobile App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/14 whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-4 w-4" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0f1f16] p-6 shadow-2xl">
              <h3 className="font-display text-xl font-bold text-white">
                Install Tiny World on iOS
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-white/75">
                1. Tap the <strong>Share</strong> icon in the Safari toolbar.
                <br />
                2. Scroll down and select <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 min-h-[44px] w-full rounded-xl bg-lime-400 py-2.5 text-sm font-semibold text-[#0b1911] hover:bg-lime-300"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-amber-400/30 bg-[#1c160c]/90 px-3 py-1.5 text-xs font-medium text-amber-200 shadow-lg backdrop-blur-sm">
      <WifiOff className="h-3.5 w-3.5" />
      <span>Offline Mode · Playing from local cache</span>
    </div>
  );
};
