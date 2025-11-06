import { httpJson } from './httpClient';
import { Transaction, TransactionCreatePayload, TransactionUpdatePayload, ApiResult, ApiError, TransactionType } from '../types/Transaction';
import { getInventoryById, updateInventory } from './itemService';

export interface GetTransactionsParams { skip?: number; limit?: number; signal?: AbortSignal }
export interface SearchTransactionsParams {
  owner_id?: number | null;
  q?: string | null;
  transaction_type?: TransactionType | null;
  date_from?: string | null;
  date_to?: string | null;
  inventory_id?: number | null;
  skip?: number;
  limit?: number;
  signal?: AbortSignal;
}

function buildListQuery(params: GetTransactionsParams): string {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return '/transactions' + (qs ? `?${qs}` : '');
}

function buildSearchQuery(params: SearchTransactionsParams): string {
  const q = new URLSearchParams();
  if (params.owner_id != null) q.set('owner_id', String(params.owner_id));
  if (params.q) q.set('q', params.q);
  if (params.transaction_type) q.set('transaction_type', params.transaction_type);
  if (params.date_from) q.set('date_from', params.date_from);
  if (params.date_to) q.set('date_to', params.date_to);
  if (params.inventory_id != null) q.set('inventory_id', String(params.inventory_id));
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return '/transactions/search' + (qs ? `?${qs}` : '');
}

function normalizeTransaction(raw: any): Transaction {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    owner_id: raw.owner_id,
    transaction_type: raw.transaction_type,
    amount_per_unit: typeof raw.amount_per_unit === 'string' ? raw.amount_per_unit : String(raw.amount_per_unit ?? '0.00'),
    quantity: raw.quantity ?? 1,
    total_amount: typeof raw.total_amount === 'string' ? raw.total_amount : String(raw.total_amount ?? '0.00'),
    date: raw.date,
    inventory_id: raw.inventory_id ?? null,
    purchase_price: raw.purchase_price ? (typeof raw.purchase_price === 'string' ? raw.purchase_price : String(raw.purchase_price)) : null,
    ownerFullName: raw.owner_full_name || raw.ownerFullName || undefined,
    inventoryName: raw.inventory_name || undefined,
  } as Transaction;
}

/**
 * Helper to update inventory quantity based on transaction type
 * - expense (purchase from supplier): ADD to inventory
 * - earning (customer purchase): SUBTRACT from inventory
 * - capital: NO change to inventory
 */
async function updateInventoryQuantity(
  inventoryId: number,
  transactionType: TransactionType,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[updateInventoryQuantity] Starting: inventoryId=${inventoryId}, type=${transactionType}, qty=${quantity}`);
    
    // Fetch current inventory
    const { data: inventory, error: fetchError } = await getInventoryById(inventoryId);
    if (fetchError || !inventory) {
      console.error('[updateInventoryQuantity] Failed to fetch inventory:', fetchError?.message);
      return { success: false, error: fetchError?.message || 'Inventory not found' };
    }

    console.log(`[updateInventoryQuantity] Current inventory quantity: ${inventory.quantity}`);

    // Calculate new quantity based on transaction type
    let newQuantity = inventory.quantity;
    if (transactionType === 'expense') {
      // Purchase from supplier - add to inventory
      newQuantity += quantity;
      console.log(`[updateInventoryQuantity] Expense: Adding ${quantity}, new quantity: ${newQuantity}`);
    } else if (transactionType === 'earning') {
      // Customer purchase - subtract from inventory
      newQuantity -= quantity;
      console.log(`[updateInventoryQuantity] Earning: Subtracting ${quantity}, new quantity: ${newQuantity}`);
      // Validate sufficient inventory
      if (newQuantity < 0) {
        console.error(`[updateInventoryQuantity] Insufficient inventory: available=${inventory.quantity}, requested=${quantity}`);
        return { success: false, error: `Insufficient inventory. Available: ${inventory.quantity}, Requested: ${quantity}` };
      }
    } else {
      console.log(`[updateInventoryQuantity] Capital transaction - no inventory change`);
    }
    // capital type doesn't affect inventory

    // Update inventory if quantity changed - prefill all data and update quantity
    if (newQuantity !== inventory.quantity) {
      console.log(`[updateInventoryQuantity] Updating inventory with all fields, new quantity: ${newQuantity}`);
      const { error: updateError } = await updateInventory(inventoryId, {
        name: inventory.name,
        quantity: newQuantity,
        category_id: inventory.category_id,
        weight_id: inventory.weight_id,
      });
      if (updateError) {
        console.error('[updateInventoryQuantity] Update failed:', updateError.message);
        return { success: false, error: updateError.message };
      }
      console.log('[updateInventoryQuantity] Inventory updated successfully');
    } else {
      console.log('[updateInventoryQuantity] No quantity change needed');
    }

    return { success: true };
  } catch (e: any) {
    console.error('[updateInventoryQuantity] Exception:', e);
    return { success: false, error: e.message || 'Failed to update inventory' };
  }
}

export async function getTransactions(params: GetTransactionsParams = {}): Promise<ApiResult<Transaction[]>> {
  try {
    const path = buildListQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeTransaction) : [];
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function searchTransactions(params: SearchTransactionsParams = {}): Promise<ApiResult<Transaction[]>> {
  try {
    const path = buildSearchQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeTransaction) : [];
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function getTransactionById(id: number): Promise<ApiResult<Transaction>> {
  try {
    const raw = await httpJson<any>(`/transactions/${id}`, { method: 'GET' });
    return { data: normalizeTransaction(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function createTransaction(payload: TransactionCreatePayload): Promise<ApiResult<Transaction>> {
  try {
    console.log('[createTransaction] Payload:', JSON.stringify(payload, null, 2));
    
    // Validate inventory BEFORE creating transaction (for earning transactions)
    if (payload.inventory_id != null && payload.quantity != null && payload.quantity > 0) {
      const transactionType = payload.transaction_type || 'expense';
      
      // For earning transactions, check if there's sufficient inventory
      if (transactionType === 'earning') {
        const { data: inventory, error: fetchError } = await getInventoryById(payload.inventory_id);
        if (fetchError || !inventory) {
          const error: ApiError = Object.assign(new Error('Inventory not found'), {
            status: 404,
            message: 'Inventory not found'
          });
          return { error };
        }
        
        if (inventory.quantity < payload.quantity) {
          const error: ApiError = Object.assign(
            new Error(`Insufficient inventory. Available: ${inventory.quantity}, Requested: ${payload.quantity}`),
            {
              status: 400,
              message: `Insufficient inventory. Available: ${inventory.quantity}, Requested: ${payload.quantity}`
            }
          );
          return { error };
        }
      }
    }
    
    // Create the transaction
    const body = { ...payload };
    console.log('[createTransaction] Creating transaction via API');
    const raw = await httpJson<any>('/transactions', { method: 'POST', body: JSON.stringify(body) });
    console.log('[createTransaction] Transaction created successfully');
    
    // Update inventory AFTER transaction is created successfully
    if (payload.inventory_id != null && payload.quantity != null && payload.quantity > 0) {
      console.log('[createTransaction] Inventory update needed - calling updateInventoryQuantity');
      const transactionType = payload.transaction_type || 'expense';
      const inventoryUpdate = await updateInventoryQuantity(
        payload.inventory_id,
        transactionType,
        payload.quantity
      );
      if (!inventoryUpdate.success) {
        console.warn('[createTransaction] Inventory update failed:', inventoryUpdate.error);
        // Don't fail the transaction creation, just warn
      } else {
        console.log('[createTransaction] Inventory updated successfully');
      }
    } else {
      console.log('[createTransaction] No inventory update needed:', JSON.stringify({
        inventory_id: payload.inventory_id,
        has_inventory_id: payload.inventory_id != null,
        quantity: payload.quantity,
        has_quantity: payload.quantity != null,
        quantity_gt_zero: payload.quantity != null && payload.quantity > 0
      }, null, 2));
    }
    
    return { data: normalizeTransaction(raw) };
  } catch (e: any) { 
    console.error('[createTransaction] Exception:', e);
    const error: ApiError = e; 
    return { error }; 
  }
}

export async function updateTransaction(id: number, payload: TransactionUpdatePayload): Promise<ApiResult<Transaction>> {
  try {
    // Fetch the existing transaction to reverse its inventory effect
    const { data: existingTransaction, error: fetchError } = await getTransactionById(id);
    if (fetchError || !existingTransaction) {
      const error: ApiError = Object.assign(new Error('Transaction not found'), {
        status: 404,
        payload: 'Transaction not found',
      });
      return { error };
    }

    // Reverse the old inventory change if it had inventory_id and quantity > 0
    if (existingTransaction.inventory_id != null && existingTransaction.quantity > 0) {
      const reverseType = existingTransaction.transaction_type === 'expense' ? 'earning' : 
                         existingTransaction.transaction_type === 'earning' ? 'expense' : 
                         'capital';
      await updateInventoryQuantity(
        existingTransaction.inventory_id,
        reverseType,
        existingTransaction.quantity
      );
    }

    // Apply new inventory change if provided
    const newInventoryId = payload.inventory_id !== undefined ? payload.inventory_id : existingTransaction.inventory_id;
    const newQuantity = payload.quantity !== undefined ? payload.quantity : existingTransaction.quantity;
    const newType = payload.transaction_type !== undefined && payload.transaction_type !== null 
      ? payload.transaction_type 
      : existingTransaction.transaction_type;

    if (newInventoryId != null && newQuantity != null && newQuantity > 0) {
      const inventoryUpdate = await updateInventoryQuantity(
        newInventoryId,
        newType,
        newQuantity
      );
      if (!inventoryUpdate.success) {
        // Revert the reversal if new update fails
        if (existingTransaction.inventory_id != null && existingTransaction.quantity > 0) {
          await updateInventoryQuantity(
            existingTransaction.inventory_id,
            existingTransaction.transaction_type,
            existingTransaction.quantity
          );
        }
        const error: ApiError = Object.assign(new Error(inventoryUpdate.error || 'Inventory update failed'), {
          status: 400,
          payload: inventoryUpdate.error,
        });
        return { error };
      }
    }

    const raw = await httpJson<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { data: normalizeTransaction(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

// Delete returns a TransactionReadSimple per spec; we just swallow it and return true for convenience
export async function deleteTransaction(id: number): Promise<ApiResult<true>> {
  try {
    // Fetch the existing transaction to reverse its inventory effect
    const { data: existingTransaction, error: fetchError } = await getTransactionById(id);
    if (fetchError || !existingTransaction) {
      const error: ApiError = Object.assign(new Error('Transaction not found'), {
        status: 404,
        payload: 'Transaction not found',
      });
      return { error };
    }

    // Reverse the inventory change if it had inventory_id and quantity > 0
    if (existingTransaction.inventory_id != null && existingTransaction.quantity > 0) {
      const reverseType = existingTransaction.transaction_type === 'expense' ? 'earning' : 
                         existingTransaction.transaction_type === 'earning' ? 'expense' : 
                         'capital';
      const inventoryUpdate = await updateInventoryQuantity(
        existingTransaction.inventory_id,
        reverseType,
        existingTransaction.quantity
      );
      if (!inventoryUpdate.success) {
        const error: ApiError = Object.assign(new Error(inventoryUpdate.error || 'Inventory update failed'), {
          status: 400,
          payload: inventoryUpdate.error,
        });
        return { error };
      }
    }

    await httpJson<any>(`/transactions/${id}`, { method: 'DELETE' });
    return { data: true };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}