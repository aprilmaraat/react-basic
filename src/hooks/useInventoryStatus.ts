import { useState, useEffect, useCallback } from 'react';
import { getInventory } from '../services/itemService';
import { Inventory } from '../types/Item';

interface InventoryStatus {
  outOfStockCount: number;
  lowStockCount: number;
  outOfStockItems: Inventory[];
  loading: boolean;
}

export const useInventoryStatus = (threshold: number = 3, pollInterval: number = 30000) => {
  const [status, setStatus] = useState<InventoryStatus>({
    outOfStockCount: 0,
    lowStockCount: 0,
    outOfStockItems: [],
    loading: true,
  });

  const checkInventoryStatus = useCallback(async () => {
    try {
      const { data, error } = await getInventory({});
      if (error || !data) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const outOfStock: Inventory[] = [];
      let lowStock = 0;

      data.forEach((item) => {
        const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
        if (!isNaN(qty)) {
          if (qty === 0) {
            outOfStock.push(item);
          } else if (qty > 0 && qty <= threshold) {
            lowStock++;
          }
        }
      });

      setStatus({
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock,
        outOfStockItems: outOfStock,
        loading: false,
      });
    } catch (err) {
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [threshold]);

  useEffect(() => {
    checkInventoryStatus();
    
    if (pollInterval > 0) {
      const interval = setInterval(checkInventoryStatus, pollInterval);
      return () => clearInterval(interval);
    }
  }, [checkInventoryStatus, pollInterval]);

  return { ...status, refresh: checkInventoryStatus };
};
