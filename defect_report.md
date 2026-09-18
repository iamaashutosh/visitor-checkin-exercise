# Defect Report

## Defect 1 - Deactivated visitors returned by search API

-   **Summary:** Deactivated visitors are returned by the visitor search
    API and shown as repeat-visit suggestions.
-   **Type:** Functional / API
-   **Description:** The visitor search API returns visitor records that
    have been deactivated. The registration form uses this endpoint to
    populate repeat-visit suggestions when entering a visitor's name.
    The requirements state that deactivated visitors must not be
    selectable for repeat visits. Therefore, deactivated visitors should
    be excluded from the search API response.
-   **API Endpoint:** `GET /api/visitors/search?q=<visitor_name>`
-   **Controller Action:** `api/visitors#search`
-   **Steps to Reproduce:**
    1.  Register a visitor using `POST /api/visitors`.
    2.  Note the visitor's `id`.
    3.  Deactivate the visitor using
        `PATCH /api/visitors/:id/deactivate`.
    4.  Confirm that the visitor is deactivated.
    5.  Send `GET /api/visitors/search?q=<deactivated_visitor_name>`.
    6.  Inspect the JSON response.
    7.  Alternatively, enter the deactivated visitor's name in the Full
        Name field of the registration form.
-   **Expected Result:** The search API should exclude deactivated
    visitors from its response because they must not be selectable for
    repeat visits.
-   **Actual Result:** The search API returns the deactivated visitor,
    and the React frontend displays the visitor as a repeat-visit
    suggestion.

------------------------------------------------------------------------

## Defect 2 -Deactivated visitors returned in active visitor list

-   **Summary:** Deactivated visitors remain in the active visitor list
    when they have not been checked out.
-   **Type:** Functional / Data / API
-   **Description:** The `GET /api/visitors` endpoint returns a visitor
    who has been deactivated but whose `checked_out_at` value remains
    `NULL`. The requirements explicitly state that deactivated visitors
    must not appear in the active visitor list. Although the visitor has
    not been checked out, deactivation should prevent the visitor from
    appearing in the active list.
-   **API Endpoint:** `GET /api/visitors?page=1`
-   **Controller Action:** `api/visitors#index`
-   **Steps to Reproduce:**
    1.  Register a visitor using `POST /api/visitors`.
    2.  Note the visitor's `id`.
    3.  Deactivate the visitor using
        `PATCH /api/visitors/:id/deactivate`.
    4.  Do not check out the visitor.
    5.  Verify that `checked_out_at` remains `NULL`.
    6.  Send `GET /api/visitors?page=1`.
    7.  Inspect the JSON response.
    8.  Check whether the deactivated visitor is included.
-   **Expected Result:** The API should not return the deactivated
    visitor in the active visitor list, regardless of whether
    `checked_out_at` is `NULL`.
-   **Actual Result:** The deactivated visitor is returned by
    `GET /api/visitors?page=1` and consequently remains visible in the
    active visitor list.

------------------------------------------------------------------------

## Defect -3 Registration API accepts null for required fields

-   **Summary:** The visitor registration API accepts `null` values for
    required visitor fields.
-   **Type:** Data / Functional / API
-   **Description:** The visitor registration API accepts requests
    containing `null` values for fields that are required by the
    registration workflow. The frontend identifies Full Name and Host as
    required fields. However, frontend validation does not prevent
    invalid requests from being sent directly to the API. The backend
    should independently validate required fields so incomplete visitor
    records cannot be created through direct API requests.
-   **API Endpoint:** `POST /api/visitors`
-   **Controller Action:** `api/visitors#create`
-   **Steps to Reproduce:**
    1.  Open Postman or another API client.

    2.  Send a `POST` request to `http://localhost:3000/api/visitors`.

    3.  Submit a request without entering any vlaues for any field

    4.  Inspect the HTTP response.

    5.  Check whether a visitor record was created.
-   **Expected Result:** The backend should reject the invalid request
    with an appropriate `4xx` validation response and should not create
    a visitor record.
-   **Actual Result:** The API accepts the request containing `null`
    values and creates a visitor record.

------------------------------------------------------------------------

## Defect 4 - Invalid host ID causes unhandled database exception

-   **Summary:** The visiter registration API causes 500 internal server  
-   **Type:** Functional / API
-   **Description:** The visitor creation API does not gracefully handle an invalid host_id. When an invalid host_id is submitted, the database raises an ActiveRecord::InvalidForeignKey exception, which is returned as an HTTP 500 Internal Server Error.
-   **API Endpoint:** `POST /api/visitors`
-   **Controller Action:** `api/visitors#create`
-   **Steps to Reproduce:**
    1. Identify a host_id that does not exist, e.g. 45.
    2. Send POST /api/visitors/.
    3. Submit valid visitor data with host_id = 45.
    4. Observe the response. 
- **Expected Result:** The API rejects the invalid host reference with a controlled client-error response and JSON error message.
- **Actual Result:** The API returns HTTP 500 Internal Server Error with an ActiveRecord::InvalidForeignKey exception:

------------------------------------------------------------------------

## Defect 5 — N+1 Query on Active Visitor List

-   **Summary:** The active visitor list endpoint performs an additional SQL query for each visitor record when loading the associated host, resulting in an N+1 query problem..
-   **Type:** Performance / Database
-   **Description:** The index action retrieves visitors without eager loading the host association. During serialization, visitor.host&.name causes Active Record to lazy-load the host for each visitor. With 20 visitors, this results in up to 21 SQL queries instead of loading the associations efficiently.
-   **API Endpoint:** `GET /api/visitors?page=1`
-   **Controller Action:** `api/visitors#index`
-   **Steps to Reproduce:**
    1.  Send `GET /api/visitors?page=1`.
    2.  Inspect the Rails server log.
    3.  Count the number of `SELECT` statements executed.
-   **Expected Result:** Visitors and their associated hosts should be loaded using eager loading such as includes(:host) to avoid one query per visitor.
-   **Actual Result:** The API performs one visitor query plus additional host queries for each visitor, resulting in an N+1 query pattern.
-   **Root Cause:** The visitor query does not eager-load host, while serialize accesses visitor.host&.name.

------------------------------------------------------------------------

## Investigated but not classified as backend defects

### Timezone display issue

The database stores timestamps in UTC and the API returns the correct
UTC instant. The observed issue is that the React frontend displays the
UTC clock time instead of converting it to the receptionist's local
timezone. This is therefore classified as a frontend issue rather than a
backend defect.

### Administrator/receptionist authorization

The requirements distinguish receptionist and administrator
capabilities, but do not specify an authentication or authorization
mechanism. The deactivation API can be invoked directly, but it is
unclear whether administrative access is intentionally expected to be
controlled outside the application. This should be raised as an open
question rather than reported as a confirmed defect.
