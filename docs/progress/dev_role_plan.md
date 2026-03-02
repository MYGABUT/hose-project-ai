# Implementation Plan: Hidden Developer Role

## 1. Goal Description
The user wants a single "developer" role that has absolute access to all data and features across the system. 
This role must be **hidden**, meaning it should not appear as an option when creating or editing users in the User Management UI, and ideally, standard super admins shouldn't see or manage this developer user.

## 2. Proposed Changes

### 2.1 Backend Changes
#### [MODIFY] `backend-hose-ai/app/models/user.py`
- We don't actually need to change the Model structure itself since `role` is just a string.

#### [NEW] `backend-hose-ai/scripts/seed_developer.py`
- Create a Python script using SQLAlchemy to directly insert the `developer` user into the database, because the UI won't allow creating one.

#### [MODIFY] `backend-hose-ai/app/api/v1/endpoints/users.py`
- Filter out any user with `role == 'developer'` from the `GET /api/v1/users` list so they don't appear in the frontend User Management table.

### 2.2 Frontend Changes
#### [MODIFY] `src/contexts/AuthContext.jsx`
- Add `DEVELOPER: 'developer'` to `ROLES`.
- Add `[ROLES.DEVELOPER]` to `ROLE_CONFIG` with `permissions: ['*']` and all access flags set to `true`.
- Update `hasAccess` logic to guarantee `*` overrides everything.

#### [MODIFY] `src/components/features/UserManagement/AddEditUserModal.jsx`
- When mapping over `ROLE_CONFIG` to populate the Job Role `<select>`, filter out the `developer` role so it cannot be selected.

## 3. Verification Plan
1. Run the seeder script to inject the `developer` user.
2. Login as the `developer` user and verify full access to all modules and configurations.
3. Login as a `super_admin`, open User Management, and verify:
   - The `developer` user is nowhere to be found in the table.
   - The "developer" role is not available in the "Tambah Pengguna Baru" dropdown.
