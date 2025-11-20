import { supabase } from '@/integrations/supabase/client';
import { 
  getDB, 
  saveToLocal, 
  getFromLocal, 
  addPendingOperation, 
  getPendingOperations, 
  clearPendingOperations 
} from './indexedDB';
import { toast } from '@/hooks/use-toast';

let syncInProgress = false;

export function isOnline() {
  return navigator.onLine;
}

export async function syncWithServer() {
  if (syncInProgress || !isOnline()) return;

  syncInProgress = true;
  console.log('Starting sync with server...');

  try {
    // Get pending operations
    const operations = await getPendingOperations();
    
    if (operations.length > 0) {
      console.log(`Syncing ${operations.length} pending operations...`);
      
      for (const op of operations) {
        try {
          if (op.type === 'insert') {
            await (supabase as any).from(op.table).insert(op.data);
          } else if (op.type === 'update') {
            await (supabase as any).from(op.table).update(op.data).eq('id', op.data.id);
          } else if (op.type === 'delete') {
            await (supabase as any).from(op.table).delete().eq('id', op.data.id);
          }
        } catch (error) {
          console.error('Error syncing operation:', error);
          throw error;
        }
      }
      
      await clearPendingOperations();
      toast({
        title: 'Sync Complete',
        description: `${operations.length} operations synced successfully`,
      });
    }

    // Fetch latest data from server
    const [itemsResult, categoriesResult] = await Promise.all([
      supabase.from('items').select('*, categories(*)'),
      supabase.from('categories').select('*'),
    ]);

    if (itemsResult.data) await saveToLocal('items', itemsResult.data);
    if (categoriesResult.data) await saveToLocal('categories', categoriesResult.data);

    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    toast({
      title: 'Sync Failed',
      description: 'Some changes could not be synced. Will retry later.',
      variant: 'destructive',
    });
  } finally {
    syncInProgress = false;
  }
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Connection restored, syncing...');
    toast({
      title: 'Back Online',
      description: 'Syncing your changes...',
    });
    syncWithServer();
  });

  window.addEventListener('offline', () => {
    console.log('Connection lost, working offline...');
    toast({
      title: 'Working Offline',
      description: 'Changes will sync when connection returns',
    });
  });
}

export async function getItemsOfflineFirst() {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from('items').select('*, categories(*)');
      if (data && !error) {
        await saveToLocal('items', data);
        return data;
      }
    } catch (error) {
      console.log('Failed to fetch from server, using local data');
    }
  }
  
  return await getFromLocal('items');
}

export async function getCategoriesOfflineFirst() {
  if (isOnline()) {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (data && !error) {
        await saveToLocal('categories', data);
        return data;
      }
    } catch (error) {
      console.log('Failed to fetch from server, using local data');
    }
  }
  
  return await getFromLocal('categories');
}
