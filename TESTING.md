# Stash — Manual Testing Plan

**Prerequisites:** App running locally (`npm run start:dev` in `server`, `npm run dev` in `client`). Database seeded. Accounts prepared in advance:
- A **regular user** account (verified)
- An **admin** account
- A **moderator** account (role set to `moderator`)
- Optionally a second regular user account

---

## 1. Authentication

### 1.1 Registration

| # | Steps | Expected |
|---|-------|----------|
| 1 | Navigate to `/register`. Submit with all fields empty. | HTML5 required validation prevents submission. ✓ |
| 2 | Enter a username fewer than 3 characters (e.g. `ab`). Submit. | Error: username too short (or server 400). ✓ |
| 3 | Enter a password fewer than 8 characters. Submit. | Error: password too short. ✓ |
| 4 | Fill all fields with valid data. Submit. | Success state: "Check your inbox" screen shown with submitted email address. No redirect to dashboard yet. ✓ |
| 5 | Register again with the same username, different email. | Error with code `USERNAME_TAKEN`. ✓ |
| 6 | Register again with the same email, different username. | Error with code `EMAIL_TAKEN`. ✓ |
| 7 | Register with the same email before verifying it (simulate by registering twice quickly). | Error `EMAIL_NOT_VERIFIED`; a "Please verify your account" screen is shown with a "Resend verification email" button. ✓ |
| 7a | On the verify screen (from step 7), click "Resend verification email". | POST sent to `/auth/resend-verification`. Button disappears; "Verification email sent" confirmation shown. ✓ |
| 7b | On the verify screen, click "Back to sign in". | Navigates to `/login`. ✓ |
| 8 | Click the verification link in the email. | Page shows "Email verified! You can now sign in." ✓ |
| 9 | Try to use the same verification link again. | Error: "invalid or has already been used." ✓ |
| 10 | Attempt to log in before verifying email. | Error `EMAIL_NOT_VERIFIED` — inline "Please verify your account" screen shown (no redirect). ✓ |

### 1.2 Login

| # | Steps | Expected |
|---|-------|----------|
| 11 | Log in with wrong email/username. | "Invalid credentials." ✓ |
| 12 | Log in with correct email but wrong password. | "Invalid credentials." ✓ |
| 13 | Log in with verified account credentials. | Redirected to `/` (dashboard). |
| 14 | Log in using username instead of email. | Login succeeds. ✓ |
| 15 | Refresh the page while logged in. | Stays logged in (token persisted). ✓ |
| 16 | Log out via Navbar. | Redirected to `/login`. Protected routes inaccessible. |

### 1.2a EMAIL_NOT_VERIFIED — Inline Verify Screen (Login)

| # | Steps | Expected |
|---|-------|----------|
| 16a | Log in with an unverified account (email as identifier). | Login form replaced by "Please verify your account" screen. The submitted email is pre-filled in an editable email input. ✓ |
| 16b | Log in with an unverified account using a **username** as identifier. | Verify screen shown. Email input is empty (username cannot be pre-filled). ✓ |
| 16c | On the verify screen, click "Resend verification email". | POST sent to `/auth/resend-verification` with the email. Button disappears; "Verification email sent" confirmation shown. ✓ |
| 16d | On the verify screen, click "Back to sign in". | Login form is restored; no navigation away from `/login`. ✓ |
| 16e | On the verify screen after a successful resend, confirm page does not navigate away. | URL remains `/login`. ✓ |

### 1.3 Forgot / Reset Password

| # | Steps | Expected |
|---|-------|----------|
| 17 | Navigate to `/forgot-password`. Submit an email that does not exist. | Generic success message (no enumeration). ✓ |
| 18 | Submit a valid email for an unverified account. | Generic success message; no email sent. ✓ |
| 19 | Submit a valid email for a verified account. | Generic success message; reset email arrives. ✓ |
| 20 | Click the reset link from the email. Navigate to `/reset-password?token=…`. | Form with "New password" and "Confirm new password" fields shown. ✓ |
| 21 | Submit the form with mismatched passwords. | Client-side validation error (passwords must match). ✓ |
| 22 | Submit the form with a password shorter than 8 characters. | Validation error. ✓ |
| 23 | Submit with valid matching passwords. | "Password reset successfully. You can now sign in." ✓ |
| 24 | Try to use the same reset link again. | Error: "invalid or has expired." ✓ |
| 25 | Wait for the reset token to expire (1 hour) and then use the link. | Error: "invalid or has expired." TODO |
| 26 | Log in with the new password. | Success. ✓ |

---

## 2. Navigation & Routing

| # | Steps | Expected |
|---|-------|----------|
| 27 | While logged out, navigate to `/` (dashboard). | Redirected to `/login`. ✓ |
| 28 | While logged out, navigate to `/snippets/new`. | Redirected to `/login`. ✓ |
| 29 | While logged out, navigate to `/admin`. | Redirected to `/login`. ✓ |
| 30 | While logged in as a regular user, navigate to `/admin`. | Redirected to `/feed` (not admin). ✓ |
| 31 | While logged in as admin, navigate to `/admin`. | Admin dashboard renders correctly. ✓ |
| 31a | While logged in as moderator, navigate to `/admin`. | Admin dashboard renders correctly (moderator view). ✓ |
| 32 | Click "Stash" logo in Navbar. | Navigates to `/` or `/feed`. ✓ |
| 33 | Verify Navbar shows: Dashboard, Feed, New Snippet links when logged in. | All links present. ✓ |
| 34 | Verify Navbar shows "Admin" link only for admin **and moderator** users. Regular users: link absent. Admin: red "Admin" badge. Moderator: link present. | Correct. ✓ |
| 35 | Verify Navbar shows Login/Register when logged out. | Correct. ✓ |

---

## 3. Dashboard (My Snippets)

| # | Steps | Expected |
|---|-------|----------|
| 36 | Log in and go to `/`. With no snippets, verify empty state. | "No snippets found" + "Create your first snippet" link. ✓ |
| 37 | After creating snippets, reload dashboard. | All own snippets shown as cards in a grid. ✓ |
| 38 | Type a search term that matches a snippet title. Click Search. | Only matching snippets shown. ✓ |
| 39 | Type a search term matching a snippet description. Click Search. | Only matching snippets shown. ✓ |
| 40 | Type a search term that matches nothing. Click Search. | Empty state shown. ✓ |
| 41 | Select a language from the language dropdown. | Snippets filtered to that language. ✓ |
| 42 | With filters active, verify "Clear filters" button appears. Click it. | All snippets restored; search input cleared. ✓ |
| 43 | With tagged snippets, click a tag pill. | Snippets filtered to that tag. Click same tag again to deselect. ✓ |
| 44 | Hover a snippet card. | Delete button appears on hover. ✓ |
| 45 | Click Delete on a snippet card. Click "Cancel" in the confirm dialog. | Snippet not deleted. ✓ |
| 46 | Click Delete on a snippet card. Confirm deletion. | Snippet removed from list immediately (optimistic). ✓ |
| 47 | Click a snippet card (not the delete button). | Navigates to `/snippets/:id`. |

---

## 4. Create / Edit Snippet

### 4.1 Create

| # | Steps | Expected |
|---|-------|----------|
| 48 | Navigate to `/snippets/new`. | Empty form shown with default language "typescript". ✓ |
| 49 | Submit with no title. | HTML5 required validation fires. ✓ |
| 50 | Submit with no code content. | HTML5 required validation fires. ✓ |
| 51 | Fill in Title, select language, add content. Submit. | Redirected to `/snippets/:newId`. New snippet shown. ✓ |
| 52 | Add a description. Submit. | Description visible on detail page. ✓ |
| 53 | Add a tag by typing in the tag input and pressing Enter. | Tag pill appears. ✓ |
| 54 | Add a tag by clicking the Add button. | Tag pill appears. ✓ |
| 55 | Type a duplicate tag. Add it. | Duplicate not added (silently ignored). ✓ |
| 56 | Click × on a tag pill. | Tag removed. ✓ |
| 57 | Toggle the Public/Private switch. | Visual state changes. Label updates ("Public" / "Private"). ✓ |
| 58 | Create a snippet with Public = on. | Snippet appears in the public feed. ✓ |
| 59 | Create a snippet with Public = off. | Snippet does not appear in the feed. ✓ |
| 60 | Click Cancel. | Navigates back to `/my-snippets` (or equivalent). ✓ |

### 4.2 Edit

| # | Steps | Expected |
|---|-------|----------|
| 61 | Navigate to `/snippets/:id/edit`. | Form pre-populated with snippet's existing data. ✓ |
| 62 | Modify the title. Click "Save changes". | Redirected to detail page. Updated title shown. ✓ |
| 63 | Toggle Public/Private. Save. | Visibility changes reflected in feed accordingly. ✓ |
| 64 | Try to navigate to `/snippets/:otherId/edit` (owned by another user). | API returns 403; error shown on page. ✓ |
| 65 | Navigate to `/snippets/nonexistent-uuid/edit`. | API returns 404; error shown. ✓ |

---

## 5. Snippet Detail Page (My Snippets)

| # | Steps | Expected |
|---|-------|----------|
| 66 | Open a snippet detail page. | Title, description, language badge, date, tags, and code block all displayed. ✓ |
| 67 | Click Copy. | Button changes to "Copied!" for ~2 seconds; content is in clipboard. ✓ |
| 68 | Click Edit. | Navigates to edit page for that snippet. ✓ |
| 69 | Click Delete, confirm. | Navigated back to `/`; snippet gone from dashboard. ✓ |
| 70 | Access another user's snippet via direct URL (`/snippets/:theirId`). | 403 Forbidden → error message shown ("Snippet not found"). ✓ |

---

## 6. Public Feed

| # | Steps | Expected |
|---|-------|----------|
| 71 | Navigate to `/feed` while logged out. | Public snippets displayed (no auth required). ✓ |
| 72 | Each feed card shows: title, language dot, code preview, tags, author username, date. | Correct. ✓ |
| 73 | Search the feed by keyword. | Matching snippets shown. ✓ |
| 74 | Filter the feed by language. | Only snippets in that language shown. ✓ |
| 75 | Clear filters. | All public snippets restored. ✓ |
| 76 | Click a feed card. | Navigates to `/feed/:id`. ✓ |
| 77 | With no public snippets, navigate to `/feed`. | "No public snippets yet." shown. Logged-in users see "Share the first one" button. ✓ |

---

## 7. Public Snippet Detail Page (`/feed/:id`)

| # | Steps | Expected |
|---|-------|----------|
| 78 | Open a public snippet detail page while logged out. | Full snippet displayed: title, author, language, date, tags, syntax-highlighted code. ✓ |
| 79 | Click Copy. | Clipboard contains snippet content; button shows "Copied!" briefly. ✓ |
| 80 | Navigate to `/feed/:id` for a private snippet. | Error: "Snippet not found or is not public." ✓ |
| 81 | Navigate to `/feed/:nonexistentId`. | Error message shown. ✓ |
| 82 | Click "← Back to feed". | Returns to `/feed`. ✓ |

---

## 8. Email Verification Flow

| # | Steps | Expected |
|---|-------|----------|
| 83 | Open the verification link `/verify-email?token=valid-token` in a browser. | "Email verified!" heading shown. ✓ |
| 84 | Open the verification link with an invalid/used token. | "Verification failed" heading shown with error message. ✓ |
| 85 | After verification, click "Sign in" link on the verification success page. | Navigates to `/login`. ✓ |

---

## 9. Admin Dashboard — Stats

| # | Steps | Expected |
|---|-------|----------|
| 86 | Log in as **admin** and navigate to `/admin`. | Admin layout (sidebar) rendered with **4** navigation links: Dashboard, Users, Snippets, Audit Log. Sidebar badge shows red "Admin". ✓ |
| 87 | Verify stat cards: Total Users, Total Snippets, Public Snippets, New This Week, Suspended. | All five cards show numbers. ✓ |
| 88 | Verify top languages bar chart is present. | Chart shown if snippets exist; otherwise empty state. ✓ |
| 89 | Verify Recent Activity list shows last 8 audit log entries. | Entries listed with action badge, target info, and relative timestamp. ✓ |
| 90 | Click "View all" next to Recent Activity. | Navigates to `/admin/audit-logs`. ✓ |
| 91 | Verify "Back to app" link in the sidebar footer. | Navigates back to `/` (main app). ✓ |

---

## 10. Admin Dashboard — Users

| # | Steps | Expected |
|---|-------|----------|
| 92 | Navigate to `/admin/users`. | Paginated table with columns: **ID** (truncated), username, email, role badge, snippet count, suspended status, joined date, View link. ✓ |
| 93 | Search by username partial match. | Table updates to matching users only. ✓ |
| 94 | Search by email partial match. | Matching users shown. ✓ |
| 94a | Search by **user ID** (paste the first 8+ characters of a user's UUID). | Only the matching user is shown. ✓ |
| 94b | Verify the search placeholder reads "Search by ID, email or username…". | Correct placeholder text. ✓ |
| 95 | Filter by role "admin". | Only admin users shown. ✓ |
| 96 | Filter by "Suspended = Yes". | Only suspended users shown. ✓ |
| 97 | Filter by "Suspended = No". | Only active users shown. ✓ |
| 98 | Combine search + role filter. | Results satisfy both conditions. ✓ |
| 99 | With more than 20 users, verify pagination controls appear. | Previous/Next buttons and page numbers rendered. Navigate pages. ✓ |
| 100 | Click a username/row. | Navigates to `/admin/users/:id`. ✓ |
| 100a | Stop the server and reload `/admin/users`. | Error state shown: "Could not reach the server…" message and a "Try again" button (not an empty table). ✓ |
| 100b | With the server running again, click "Try again". | Table reloads successfully. ✓ |

---

## 11. Admin Dashboard — User Detail

| # | Steps | Expected |
|---|-------|----------|
| 101 | Open an admin user detail page. | Profile card: avatar initial, username, email, role badge, snippet count, joined date. ✓ |
| 102 | Open your own admin detail page. | "You" badge shown. Change Role select, Suspend panel, and Delete button all disabled. ✓ |
| 103 | Open another user's detail page. | Controls are enabled. ✓ |
| 104 | Change a user's role from "user" to "moderator". Confirm. | Role badge updates. Audit log entry `USER_ROLE_CHANGED` created. ✓ |
| 105 | Suspend a user with a reason. Click "Suspend". | "Suspended" badge appears. Suspension date and reason shown. Audit log `USER_SUSPENDED` created. ✓ |
| 106 | Attempt to log in as the suspended user. | Login blocked: "Your account has been suspended: [reason]" with `ACCOUNT_SUSPENDED` errorCode. ✓ |
| 107 | Unsuspend the user. Click "Unsuspend". | Suspended badge removed. Audit log `USER_UNSUSPENDED` created. ✓ |
| 108 | Log in as the now-unsuspended user. | Login succeeds. ✓ |
| 109 | Click "Delete user" in the Danger Zone. Cancel the confirmation. | Nothing happens. ✓ |
| 110 | Click "Delete user". Confirm. | User deleted. Navigated back to `/admin/users`. Audit log `USER_DELETED` created. ✓ |
| 111 | Verify the deleted user can no longer log in. | "Invalid credentials." ✓ |
| 112 | Verify audit log entries for the deleted admin are preserved (`adminId = NULL`). | Audit log entries still exist with null admin reference. ✓ |

---

## 12. Admin Dashboard — Snippets

| # | Steps | Expected |
|---|-------|----------|
| 113 | Navigate to `/admin/snippets`. | Paginated table with columns: **ID** (truncated), title, author, language, visibility, created date, Delete button. ✓ |
| 114 | Search by snippet title. | Matching snippets shown. ✓ |
| 114a | Search by snippet description partial match. | Matching snippets shown. ✓ |
| 114b | Search by **snippet ID** (paste the first 8+ characters of a snippet's UUID). | Only the matching snippet is shown. ✓ |
| 114c | Verify the search placeholder reads "Search by ID, title or description…". | Correct placeholder text. ✓ |
| 115 | Filter by language using the **language dropdown** (select from the list). | Language-filtered results. Confirm dropdown contains options such as typescript, javascript, python, etc. ✓ |
| 115a | Confirm the language filter is a `<select>` dropdown, not a text input. | Dropdown renders with language options. ✓ |
| 116 | Filter by visibility "Public" / "Private". | Correctly filtered results. ✓ |
| 117 | Toggle a Public snippet to Private via the visibility button. | Button label changes optimistically. Snippet no longer appears in `/feed`. ✓ |
| 118 | Toggle a Private snippet to Public. | Snippet now appears in `/feed`. Audit log `SNIPPET_VISIBILITY_CHANGED` created with previous/new values. ✓ |
| 119 | Delete a snippet. Confirm. | Snippet removed from table immediately. Audit log `SNIPPET_DELETED` created. ✓ |
| 120 | Verify the deleted snippet is no longer accessible at `/feed/:id` or `/snippets/:id`. | 404 / error message shown. ✓ |
| 121 | Navigate pages of snippets. | Pagination works correctly. ✓ |
| 121a | Stop the server and reload `/admin/snippets`. | Error state shown: "Could not reach the server…" message and a "Try again" button (not an empty table). ✓ |
| 121b | With the server running again, click "Try again". | Table reloads successfully. ✓ |

---

## 13. Admin Dashboard — Audit Log

| # | Steps | Expected |
|---|-------|----------|
| 122 | Navigate to `/admin/audit-logs`. | Read-only table: action badge, target type, target ID, admin username, metadata badges, IP address, timestamp. ✓ |
| 123 | Filter by action (e.g. `USER_SUSPENDED`). | Only entries with that action shown. ✓ |
| 124 | Filter by target type "user". | Only user-targeting entries shown. ✓ |
| 125 | Filter by date range (From / To). | Entries within range shown. Entries outside range hidden. ✓ |
| 126 | Verify entries for the previously deleted user show admin username as "—" (null). | Correct — admin SET NULL on delete. ✓ |
| 127 | Verify metadata column shows key-value badges (e.g. `previousRole: user`, `newRole: admin`). | Badges rendered for all metadata keys. ✓ |
| 128 | Verify metadata column shows "—" for entries with no metadata. | Correct. ✓ |
| 129 | Navigate pages of audit log. | Pagination works. ✓ |

---

## 14. Moderator Role

**Prerequisites:** An account with role `moderator` (set via admin user detail page).

| # | Steps | Expected |
|---|-------|----------|
| 130a | Log in as moderator and navigate to `/admin`. | Admin layout renders. Sidebar badge shows purple "Mod". ✓ |
| 130b | Verify sidebar navigation links for moderator. | Only **Dashboard** and **Snippets** are shown. Users and Audit Log links are absent. ✓ |
| 130c | Verify admin dashboard stat cards for moderator. | Only **Total Snippets** and **Public Snippets** cards are shown. Total Users, New This Week, and Suspended cards are absent. ✓ |
| 130d | Verify the Recent Activity section is absent for moderator. | No "Recent Activity" heading or audit log entries shown. ✓ |
| 130e | Verify the "Manage Users" quick link is absent for moderator. | Link not rendered. ✓ |
| 130f | Verify the "Moderate Snippets" quick link is present for moderator. | Link rendered and navigates to `/admin/snippets`. ✓ |
| 130g | As moderator, navigate to `/admin/snippets`. | Snippets table loads normally. Can toggle visibility and delete snippets. ✓ |
| 130h | As moderator, attempt to navigate to `/admin/users` directly in the address bar. | Redirected away (403 or redirect to feed / dashboard). ✓ |
| 130i | As moderator, attempt to navigate to `/admin/audit-logs` directly in the address bar. | Redirected away (403 or redirect). ✓ |
| 130j | API: `GET /admin/stats` with moderator JWT. | 200 OK — stats returned. ✓ |
| 130k | API: `GET /admin/snippets` with moderator JWT. | 200 OK — snippets returned. ✓ |
| 130l | API: `GET /admin/users` with moderator JWT. | 403 Forbidden. ✓ |
| 130m | API: `GET /admin/audit-logs` with moderator JWT. | 403 Forbidden. ✓ |

---

## 15. Session & Security

| # | Steps | Expected |
|---|-------|----------|
| 131 | Open DevTools → Application → LocalStorage. Note the stored JWT. Manually delete it. Refresh the page. | Redirected to `/login`. ✓ |
| 132 | Make an API request to `GET /snippets` with no Authorization header. | 401 Unauthorized. ✓ |
| 133 | Make a request to `GET /admin/stats` with a valid **regular user** JWT. | 403 Forbidden. ✓ |
| 133a | Make a request to `GET /admin/stats` with a valid **moderator** JWT. | 200 OK. ✓ |
| 134 | Make a request to `DELETE /admin/users/:id` with a valid **non-admin** JWT (including moderator). | 403 Forbidden. ✓ |
| 135 | Log in, wait for the JWT to expire (default NestJS TTL), then attempt a protected action. | Interceptor catches 401; user is logged out and redirected to `/login`. TODO |
| 136 | Attempt to access `GET /snippets/:othersId` with your JWT (authenticated but not owner). | 403 Forbidden. ✓ |
| 137 | Attempt SQL injection in search fields (e.g. `' OR 1=1 --`). | Parameterized query prevents injection; no data leak, likely empty results. ✓ |
| 138 | Attempt XSS in snippet title/content (e.g. `<script>alert(1)</script>`). | Content rendered as text (React escaping); no script executes. ✓ |

---

## 16. Error States

| # | Steps | Expected |
|---|-------|----------|
| 139 | Stop the server. Navigate to `/admin/users`. | Error state shown with descriptive message and "Try again" button instead of an empty table. ✓ |
| 140 | Stop the server. Navigate to `/admin/snippets`. | Same error state as above. ✓ |
| 141 | Stop the server. Navigate to `/admin` (dashboard). | Error message shown ("Could not reach the server…") instead of blank stat cards. ✓ |
| 142 | Server returns a specific error (e.g. 500 "Database unavailable"). | The server's error message is displayed verbatim rather than a generic message. ✓ |
| 143 | With the server back up, click "Try again" on any error state. | Data loads successfully; error state dismissed. ✓ |

---

## 17. Email Flows (Integration)

| # | Steps | Expected |
|---|-------|----------|
| 144 | Register a new account. | Verification email arrives within ~30 seconds from the configured `RESEND_FROM` address. ✓ |
| 145 | Verify the verification email contains the correct link (`APP_URL/verify-email?token=…`). | Link points to the correct environment. ✓ |
| 146 | Request a password reset. | Reset email arrives. Link contains `APP_URL/reset-password?token=…`. ✓ |
| 147 | With `RESEND_API_KEY` unset or invalid, attempt registration. | User account is still created; server logs a warning; no crash. ✓ |

---

## 18. Responsiveness & UI Polish

| # | Steps | Expected |
|---|-------|----------|
| 148 | Open the app on a mobile viewport (375 px). | Navbar collapses gracefully; snippet grid stacks to 1 column. |
| 149 | Open Admin layout on a mobile viewport. | Sidebar accessible; content readable. |
| 150 | Open a snippet detail page with long code lines. | Code block scrolls horizontally; does not break the page layout. |
| 151 | Verify syntax highlighting applies on detail and public snippet pages. | Code is highlighted for the declared language. |
| 152 | Verify the public/private toggle on Create Snippet shows correct indigo/gray visual state. | Toggle moves and changes colour correctly. |
| 153 | Verify all relative timestamps on the audit log ("just now", "5m ago", "2h ago", "3d ago") display correctly by checking entries at different ages. | Time display matches age of entry. |
