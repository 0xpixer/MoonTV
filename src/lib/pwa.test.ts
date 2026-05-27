import { getInstallPrompt, installPWA, setupPWAEventListeners } from './pwa';

describe('PWA utilities', () => {
  it('stores the browser install prompt until install is requested', async () => {
    const prompt = jest.fn().mockResolvedValue({ outcome: 'accepted' });
    const event = Object.assign(new Event('beforeinstallprompt'), { prompt });

    setupPWAEventListeners();
    window.dispatchEvent(event);

    await expect(getInstallPrompt()).resolves.toBe(event);
    await expect(installPWA()).resolves.toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    await expect(getInstallPrompt()).resolves.toBeNull();
  });
});
