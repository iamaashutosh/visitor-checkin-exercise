# Backend Notes

## Why these defects were selected

Defects 1 and 2 violate the core visitor-management rule that deactivated visitors must not be available for repeat registration or remain in the active visitor list. They expose incorrect data through public API endpoints and can cause receptionists to select records that administrators intentionally deactivated.

Defect 4 turns invalid client input into an HTTP 500 response. This is an API reliability problem: a bad host reference should be reported as a client validation error, not as an unhandled database exception.

Defect 5 affects the active visitor endpoint's database performance. The endpoint serializes each visitor's host name, so the original query generated one host query per returned visitor. This becomes increasingly expensive as the active list grows.

## Root cause and fix

- **Defect 1:** `search` queried by name only. It now adds `active: true`, so deactivated visitors are excluded without changing the response fields or route.
- **Defect 2:** `index` filtered only on `checked_out_at: nil`. It now requires both `active: true` and `checked_out_at: nil`.
- **Defect 4:** `create` allowed `ActiveRecord::InvalidForeignKey` to escape when a supplied host ID did not exist. The action now converts that exception into the existing JSON validation-error format with HTTP 422. Optional/null host behavior was otherwise left unchanged.
- **Defect 5:** `index` did not eager-load `host`, while `serialize` accessed `visitor.host`. It now uses `includes(:host)`, preserving the existing serialized `host_name` field while eliminating per-visitor host queries.

## Request regression coverage

`api/test/controllers/api/visitors_regression_test.rb` contains one HTTP integration test for each selected defect. The tests use the existing Rails Minitest integration-test convention (the repository does not use RSpec), fixtures, realistic records, and public API requests rather than private implementation calls.

Against the original `main` implementation, the four tests produced:

- Defect 1: failure because the deactivated visitor ID was returned by search.
- Defect 2: failure because the deactivated, not-checked-out visitor ID was returned by the active list.
- Defect 4: error from `ActiveRecord::InvalidForeignKey` instead of a client response.
- Defect 5: failure because the request generated 21 SQL notifications, not the expected two-query eager-loaded request.

After the fixes, the same four tests pass with 13 assertions and no failures or errors.

## Performance measurement

### What was measured

The number of SQL queries made when calling GET /api/visitors?page=1. This includes the queries used to load the visitors and their hosts. Schema-related queries were not included in the count.

### Setup and conditions

- Rails test environment using the existing SQLite test database.
- The test created 20 active visitors associated with the same host.
- The endpoint page size was 20.
- The same test setup was used before and after the fix.
- SQL query count was used as the main performance measure because the defect was caused by unnecessary database queries.

### Results

| Implementation | SQL notifications for one request | Result |
| --- | ---: | --- |
| Original `main` | 21 | 1 visitor-list query plus 20 lazy host loads; regression failed |
| Fixed | 2 | 1 visitor-list query plus 1 eager host query; regression passed |

The count fell from one query per returned visitor plus the list query to two total queries. This directly measures the N+1 behavior rather than inferring improvement from the use of `includes`.

## Deliberately unfixed defects

- **Defect 3 (null required fields):** Deliberately not fixed because the requested scope is Defects 1, 2, 4, and 5, and the existing backend currently permits null host/full-name values. If fixed, requests containing null values would no longer be accepted. The exact response structure and status code should be verified against the application's existing validation-error behavior. This would require dedicated regression coverage and a compatibility decision.
- **Timezone display issue:** This is a frontend formatting issue; the backend returns the correct UTC instant.
- **Authorization question:** No authentication/authorization mechanism is specified, so it was not treated as a confirmed backend defect.

## API compatibility

No routes, response field names, successful response structures, or existing status codes were changed. Defects 1 and 2 only remove records that should not be exposed. Defect 5 changes database loading only. Defect 4 changes the invalid-host failure from an unhandled 500/error to a controlled 422 JSON error while retaining the controller's existing `{ errors: ... }` response shape.

## Verification commands

From `api/`:

```text
ruby bin/rails test test/controllers/api/visitors_regression_test.rb --verbose
ruby bin/rails test test/controllers/api/visitors_controller_test.rb test/controllers/api/hosts_controller_test.rb test/controllers/api/visitors_regression_test.rb
ruby bin/rails test
```

All final runs passed: 4 regression tests with 13 assertions, and the complete Rails suite with 13 tests and 36 assertions.
