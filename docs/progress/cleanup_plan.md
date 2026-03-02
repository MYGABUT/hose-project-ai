# Comprehensive Cleanup Plan

Based on a thorough analysis of the project structure and file usage, I have identified the following files as redundant or unnecessary.

## 🗑️ Category 1: Definitely Safe to Delete (Junk/Logs/Backups)

These files are clearly temporary, backups, or logs that should not be in the repository.

| File Path | Reason |
| :--- | :--- |
| `backend-hose-ai/sql_app.db` | SQLite database file (project uses Postgres per `.env`). |
| `backend-hose-ai/db_error.log` | Runtime error log file. |
| `backend-hose-ai/startup.log` | Server startup log file. |
| `backend-hose-ai/backend_files.txt` | Temporary file list created during analysis. |
| `src/frontend_files.txt` | Temporary file list created during analysis. |
| `src/pages/Manager/ManagerDashboard.jsx.bak` | Backup file of an old dashboard version. |
| `backend-hose-ai/app/api/v1/endpoints/stock_opname.py.disabled` | Disabled/unused code file. |

## 🛠️ Category 2: One-Off Migration & Test Scripts

These scripts were used to apply schema changes to the running database. **I have verified that all features/columns added by these scripts are permanently defined in the `app/models/` files.** Deleting them is safe and will not remove the features from the application.

**Location:** `backend-hose-ai/scripts/`

| File | Reason | Status |
| :--- | :--- | :--- |
| `add_performance_indexes.py` | One-off index creation script. | **Safe** |
| `check_schema.py` | Schema verification script. | **Safe** |
| `check_syntax.py` | Syntax checker. | **Safe** |
| `fix_missing_columns.py` | Database repair script. | **Safe** |
| `migrate_invoice_inbox.py` | Feature defined in `models/invoice_inbox.py`. | **Safe** |
| `migrate_multi_entity.py` | Features in `models/company.py`, `storage_location.py`, `inventory_batch.py`. | **Safe** |
| `migrate_production_security.py` | Features in `models/job_order.py`. | **Safe** |
| `migrate_refresh_tokens.py` | Feature defined in `models/refresh_token.py`. | **Safe** |
| `migrate_security_columns.py` | Features in `models/user.py`. | **Safe** |
| `migrate_user_company.py` | Feature in `models/user.py`. | **Safe** |
| `reset_admin.py` | Redundant with `create_test_user`. | **Safe** |
| `simulate_consumption.py` | Simulation script. | **Safe** |
| `test_consignment_transfer.py` | Standalone test script. | **Safe** |
| `test_multi_entity_access.py` | Standalone test script. | **Safe** |

## 📦 Category 3: Utility Scripts (Optional to Keep)

These scripts might still be useful for setting up new environments or resetting the system. **I recommend KEEPING these unless you want a strictly minimal production build.**

| File | Reason |
| :--- | :--- |
| `backend-hose-ai/cleanup_system.py` | Utility to clean logs/reset data (User explicitly kept this). |
| `backend-hose-ai/scripts/reset_transactions.py` | Dependency of `cleanup_system.py`. |
| `backend-hose-ai/scripts/seed_users.py` | Useful for seeding initial user data. |
| `backend-hose-ai/scripts/seed_wms.py` | Useful for seeding initial WMS data. |

## Action Plan

I propose to:
1.  **DELETE** all files in **Category 1**.
2.  **DELETE** all files in **Category 2**.
3.  **KEEP** files in **Category 3**.

Please confirm if this plan is acceptable or if you'd like to adjust which categories to delete.
