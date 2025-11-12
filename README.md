<br />

# React Basic App (Users / Transactions / Analytics)

TypeScript React application (CRA) showcasing:

* API service layer with retry, timeout, error normalization.
* Data tables (Users, Transactions) with sorting, filtering, search (Transactions), refresh, caching.
* Monthly Expense Analytics page with per‑day aggregation and optional column chart.
* Lightweight domain normalization for inconsistent backend fields.
* Unit tests (example: `userService.test.ts`).

## Quick Start

```bash
npm install
npm start
```

Runs at http://localhost:3000.

## 🚀 Deployment

**For production deployment and running the app as an always-on service, see [DEPLOYMENT.md](./DEPLOYMENT.md)**

Quick deploy with PM2:
```bash
npm run build
npm install -g pm2 serve
pm2 start serve --name "react-basic-app" -- -s build -l 3000
pm2 save && pm2-startup install
```

## Environment (.env)

```
<!-- REACT_APP_API_BASE_URL=http://localhost:8000 -->
REACT_APP_API_BASE_URL=http://127.0.0.1:8000/
```

Restart `npm start` after changes.

## Expected Backend Endpoints

| Endpoint | Example | Notes |
|----------|---------|-------|
| `GET /users` | `/users` | Returns array of users. Cached in memory (60s TTL). |
| `GET /transactions` | `/transactions?user_id=1&search=foo` | Supports `user_id`, `search`. Normalizes legacy field names. |
| `POST /transactions` | `/transactions` | Creates a transaction (body JSON). |
| `PUT /transactions/{id}` | `/transactions/123` | Updates transaction fields. |
| `DELETE /transactions/{id}` | `/transactions/123` | Deletes a transaction. |
| `POST /users` | `/users` | Creates a user. |
| `PUT /users/{id}` | `/users/5` | Updates a user. |
| `DELETE /users/{id}` | `/users/5` | Deletes a user. |

Transaction fields tolerated: `title` (or legacy `name`), `createdAt|created_at|created|date`, `ownerName|owner_name|userName|user_name|user.full_name|user.username` (legacy), optional `transaction_type|item_type` -> `type`.

## Project Structure (key parts)

```
src/
	components/
		UserList.tsx      # Users table with manual refresh & sorting
		TransactionList.tsx      # Transactions table with user filter + debounced search
		GraphPage.tsx      # Monthly graph visualization (column chart)
		ItemList.tsx       # Inventory items CRUD
		CategoryList.tsx   # Category CRUD (dynamic metadata)
		WeightList.tsx     # Weight CRUD (dynamic metadata)
	services/
		httpClient.ts     # Fetch wrapper (timeout, retries, base URL)
		userService.ts    # Users API + in-memory caching
		transactionService.ts    # Transactions API + query building + normalization
	types/              # Shared TypeScript models
```

## Optional: Ant Design

UI components come from `antd`. Theme customization can be added later via `craco` or CSS variables if needed.

## Services & Error Handling

`httpClient.ts` features:

1. Base URL from `REACT_APP_API_BASE_URL` (trailing slash trimmed).
2. JSON parsing with graceful fallback if response body is empty / non‑JSON.
3. AbortController timeout (default 10s).
4. Limited retry (GET only) on network / 5xx / 429 with exponential backoff.
5. Normalized `ApiError` shape (`status`, optional `payload`).

`userService` caches users for 60 seconds. Call `getUsers(true)` to force refresh or `clearUsersCache()` to invalidate programmatically.

`transactionService` builds query strings and normalizes heterogeneous backend responses into consistent `Transaction` objects. It also exposes `createTransaction`, `updateTransaction`, and `deleteTransaction` for mutations.

`userService` now includes `createUser`, `updateUser`, and `deleteUser`. Mutations automatically invalidate the in-memory users cache.

## Usage Examples

Programmatic:

```ts
import { getUsers, createUser } from './services/userService';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from './services/transactionService';

async function load() {
	const usersResult = await getUsers();
	const transactionsResult = await getTransactions({ userId: 1, search: 'test' });

	// Create a new user
	await createUser({ full_name: 'Bob Smith', email: 'bob@example.com' });

	// Create a transaction
	const { data: created } = await createTransaction({ title: 'Office Supplies', amount_per_unit: 15, quantity: 3, transaction_type: 'expense', description: 'Paper & pens' });

	// Update a transaction
	if (created) await updateTransaction(created.id, { amount_per_unit: 17, quantity: 3 });

	// Delete a transaction
	if (created) await deleteTransaction(created.id);
	console.log(usersResult.data, transactionsResult.data);
}
```

In JSX:

```tsx
<UserList />
<TransactionList refreshIntervalMs={30000} />
<GraphPage />
```

## Testing

Run tests:

```bash
npm test
```

Example: `userService.test.ts` mocks `fetch` and verifies success + error handling & cache bypass.

## Available Scripts (CRA)

| Script | Purpose |
|--------|---------|
| `npm start` | Dev server with fast refresh |
| `npm test` | Jest watch mode |
| `npm run build` | Production build (minified, hashed) |
| `npm run eject` | Copy build config (irreversible) |

## Extending Quickly

Add a new endpoint:

```ts
// projectService.ts
import { httpJson } from './httpClient';
export async function getProjects() { return httpJson<any[]>('/projects', { method: 'GET' }); }
```

Then consume similarly to existing services.

## Future Ideas

* Persist filters in URL (query params) for shareable links.
* Add mutation endpoints (create/update/delete) with optimistic UI.
* Introduce React Query / SWR if caching & synchronization complexity grows.
* Form validation and item creation modal.
* Dark mode theme tokens for Ant Design.

---
Generated from a baseline CRA project and evolved with a lightweight, typed service & analytics layer.

## Tab Layout

Top-level tabs:

1. Monthly Expense Analytics – Aggregated metrics & optional chart.
2. Monthly Graph – Visual daily totals chart.
3. Admin – Contains nested tabs for data entry & management.

Admin nested tabs:

* Inventory (ItemList)
* Transactions (TransactionList)
* Users (UserList)
* Categories (CategoryList)
* Weights (WeightList)

Each nested tab supports CRUD (where relevant) and manual refresh. Categories & weights are loaded from the API (`/categories`, `/weights`) with seed fallbacks.

## Inventory Metadata (Categories & Weights)

The initial static arrays `CATEGORY_OPTIONS` and `WEIGHT_OPTIONS` (in `src/data/inventorySeeds.ts`) now act only as a fallback. The app dynamically loads:

* `GET /categories` via `categoryService.getCategories()`
* `GET /weights` via `weightService.getWeights()`

`ItemList` replaces static filter & form option sources with the fetched names. If either request fails, the component silently retains the seed arrays so the UI is still usable offline.

To extend:

```ts
// Add new category
await createCategory({ name: 'Juice', description: 'Fruit juices' });
// Add new weight
await createWeight({ name: '750ml', description: 'Glass bottle size' });
```

Consider removing or minimizing the seeds file once the API becomes authoritative. Keeping it allows zero‑API demos and local testing.

