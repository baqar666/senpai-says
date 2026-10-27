import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PURCHASES_ERROR_CODE, PurchasesPackage } from 'react-native-purchases';

import { GirlId } from '../data/girls';

// Senpai Pass: a one-time Google Play purchase, checked by RevenueCat (which validates every
// receipt with Google, so a modified APK can't unlock it). See README "Purchases and ads".
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const ENTITLEMENT = 'pass';
const CACHE_KEY = 'senpai-says/pass';
// On web in development there is no store; a fake Pass lets the screens be tested.
const DEV_MOCK = __DEV__ && Platform.OS === 'web';

// Free users can set these characters' tones without the Pass (one per group, as a taste).
export const FREE_TONE_CHARACTERS: readonly GirlId[] = ['hana', 'kaito'];
// Free "Stop me scrolling": one app at the 1-hour limit.
export const FREE_GUARD_LIMIT = 60;

export type BuyResult ='bought' | 'cancelled' | 'pending' | 'unavailable' | 'error';
export type RestoreResult = 'restored' | 'none' | 'error';

// What a locked feature asks for: watch an ad (if allowed) or get the Pass, then run `action`.
export type UnlockRequest = { title: string; allowAd: boolean; action: () => void };

type Pass = {
  ready: boolean;
  pro: boolean;
  available: boolean; // the store and the product could be reached
  price: string | null; // localized, e.g. "Rs 499.00"
  buy: () => Promise<BuyResult>;
  restore: () => Promise<RestoreResult>;
  paywall: { open: boolean; reason?: string };
  openPaywall: (reason?: string) => void;
  closePaywall: () => void;
  unlockRequest: UnlockRequest | null;
  // Runs `action` straight away for Pass owners, otherwise asks how to unlock it.
  gate: (request: UnlockRequest) => void;
  closeUnlock: () => void;
};

const Ctx = createContext<Pass | null>(null);
const hasPass = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;

export function PassProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [pro, setProState] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [paywall, setPaywall] = useState<{ open: boolean; reason?: string }>({ open: false });
  const [unlockRequest, setUnlockRequest] = useState<UnlockRequest | null>(null);

  const setPro = useCallback((value: boolean) => {
    setProState(value);
    AsyncStorage.setItem(CACHE_KEY, value ? '1' : '0').catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const onInfo = (info: CustomerInfo) => alive && setPro(hasPass(info));
    (async () => {
      // Last known state first, so the app is right instantly and offline.
      const cached = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (alive) setProState(cached === '1');
      if (Platform.OS !== 'android' || !API_KEY) {
        if (alive) setReady(true);
        return;
      }
      try {
        Purchases.configure({ apiKey: API_KEY });
        Purchases.addCustomerInfoUpdateListener(onInfo); // purchases elsewhere, pending payments, refunds
        onInfo(await Purchases.getCustomerInfo());
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (alive) setPkg(current?.lifetime ?? current?.availablePackages[0] ?? null);
      } catch {
        // Offline or store unavailable: keep the cached state; buying shows a message.
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
      if (Platform.OS === 'android' && API_KEY) Purchases.removeCustomerInfoUpdateListener(onInfo);
    };
  }, [setPro]);

  const buy = useCallback(async (): Promise<BuyResult> => {
    if (DEV_MOCK) {
      setPro(true);
      return 'bought';
    }
    if (!pkg) return 'unavailable';
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (hasPass(customerInfo)) {
        setPro(true);
        return 'bought';
      }
      return 'pending';
    } catch (e) {
      const err = e as { userCancelled?: boolean | null; code?: PURCHASES_ERROR_CODE };
      if (err.userCancelled) return 'cancelled';
      // Cash/carrier payments: Google finishes them later and the listener unlocks the Pass then.
      if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
      if (err.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        const info = await Purchases.restorePurchases().catch(() => null);
        if (info && hasPass(info)) {
          setPro(true);
          return 'bought';
        }
      }
      return 'error';
    }
  }, [pkg, setPro]);

  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (DEV_MOCK) return pro ? 'restored' : 'none';
    if (Platform.OS !== 'android' || !API_KEY) return 'error';
    try {
      const info = await Purchases.restorePurchases();
      setPro(hasPass(info));
      return hasPass(info) ? 'restored' : 'none';
    } catch {
      return 'error';
    }
  }, [pro, setPro]);

  const value = useMemo<Pass>(
    () => ({
      ready,
      pro,
      available: DEV_MOCK || !!pkg,
      price: DEV_MOCK ? '$2.99' : (pkg?.product.priceString ?? null),
      buy,
      restore,
      paywall,
      openPaywall: (reason) => setPaywall({ open: true, reason }),
      closePaywall: () => setPaywall({ open: false }),
      unlockRequest,
      gate: (request) => (pro ? request.action() : setUnlockRequest(request)),
      closeUnlock: () => setUnlockRequest(null),
    }),
    [ready, pro, pkg, buy, restore, paywall, unlockRequest]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePass() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePass must be used inside PassProvider');
  return v;
}
