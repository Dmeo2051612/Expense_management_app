# Finora — Backend Testing Report

## 1. Test Environment

- Frontend: HTML, CSS, JavaScript
- API Gateway: Flask
- Backend: ASP.NET Core 8
- Database: MySQL 8
- Authentication: JWT Bearer
- Idempotency: `Idempotency-Key` header
- Concurrency control: EF Core concurrency token (`Version`)

Tests were performed locally using demo accounts and test data.

## 2. Test Results

| No. | Test Case | Expected Result | Observed Result |
|---:|---|---|---|
| 1 | Transfer between valid accounts | Transfer succeeds and both balances are updated | Passed — HTTP 200 and transaction ID returned |
| 2 | Repeat the same request with the same idempotency key and payload | Return the original transaction without transferring money again | Passed — the original transaction ID was returned; balances remained unchanged |
| 3 | Reuse an idempotency key with a different amount | HTTP 409 Conflict; no additional transfer | Passed — HTTP 409 and balances remained unchanged |
| 4 | Transfer more than the available balance | Reject the transfer; balances remain unchanged | Passed — request rejected and balances remained unchanged |
| 5 | Send two concurrent transfers whose combined amount exceeds the source balance | At most one transfer succeeds | Passed — database showed one new transaction and one balance update |
| 6 | Use User 1's JWT to transfer from User 2's account | Reject the request; do not modify either account | Passed — HTTP 409; User 2's balance and version remained unchanged |
| 7 | Call the transfer endpoint without a JWT | HTTP 401 Unauthorized | Passed — HTTP 401 |
| 8 | Use the same source and destination account | HTTP 400 Bad Request | Passed — HTTP 400 |
| 9 | Transfer an amount of zero | HTTP 400 Bad Request | Passed — HTTP 400 |
| 10 | Transfer a negative amount | HTTP 400 Bad Request | Passed — HTTP 400 |

## 3. Database Verification

The database was checked after successful and rejected requests.

- Successful transfers updated the source and destination balances.
- The `Version` field increased when account balances were updated.
- Replaying an already-processed request did not create a duplicate transaction.
- Rejected requests did not change the verified account balances.
- The unique index on `(user_id, idempotency_key)` was present in MySQL.

## 4. Limitations

- Tests were performed locally with demo data, not in a production environment.
- The tests do not replace a comprehensive automated test suite.
- Further testing is required for failure recovery, database connection loss, and concurrent requests under a wider range of conditions.
- Authentication, authorization, and transaction behavior should be re-tested after significant code or configuration changes.

## 5. Security Notes

- Do not commit `.env`, real credentials, JWTs, signing keys, or files containing secrets.
- Use verified password hashing for real user accounts.
- Keep detailed exception responses disabled in production.
- Back up the database before testing changes to transaction logic.
