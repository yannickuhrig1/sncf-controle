import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  });

  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, isLoading: false }));
        return;
      }

      const permission = Notification.permission;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await (registration as any).pushManager?.getSubscription();
        
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
        });
      } catch (error) {
        console.error('Error checking push subscription:', error);
        setState(prev => ({ ...prev, isSupported: true, isLoading: false, permission }));
      }
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Les notifications push ne sont pas supportées sur ce navigateur');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, permission }));
        toast.error('Permission refusée pour les notifications');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer,
      });

      // Save subscription to Supabase
      const subJson = subscription.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && subJson.endpoint && subJson.keys) {
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        }, { onConflict: 'user_id,endpoint' });
      }

      // Also keep localStorage for backward compat
      localStorage.setItem('push_subscription', JSON.stringify(subJson));

      setState({
        isSupported: true,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      });

      toast.success('Notifications activées !', {
        description: 'Vous recevrez des alertes pour les mises à jour importantes',
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Erreur lors de l\'activation des notifications');
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager?.getSubscription();

      if (subscription) {
        const subJson = subscription.toJSON();
        await subscription.unsubscribe();
        
        // Remove from Supabase
        if (subJson.endpoint) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('push_subscriptions')
              .delete()
              .eq('user_id', user.id)
              .eq('endpoint', subJson.endpoint);
          }
        }
      }

      localStorage.removeItem('push_subscription');

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      toast.success('Notifications désactivées');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Erreur lors de la désactivation des notifications');
      return false;
    }
  }, []);

  const sendLocalNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!state.isSupported || state.permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
