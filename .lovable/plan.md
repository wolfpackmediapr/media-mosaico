## Plan: Limit Feed Unificado to 5 Items

### Problem
The Combined News Feed widget currently displays 10 items per page. The user wants it limited to 5 items per page.

### Changes

#### 1. `src/hooks/use-combined-news-feed.ts`
Change `ITEMS_PER_PAGE` from `10` to `5`:
```
const ITEMS_PER_PAGE = 5;
```

#### 2. `src/components/dashboard/CombinedNewsFeedWidget.tsx`
Update the `totalPages` calculation to use `5` instead of hardcoded `10`:
```
const totalPages = data ? Math.ceil(data.totalCount / 5) : 1;
```

### Validation
- Build passes successfully
- Feed widget renders only 5 news items per page
- Pagination navigation updates accordingly
