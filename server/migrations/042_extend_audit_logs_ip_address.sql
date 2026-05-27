-- Migration: 042_extend_audit_logs_ip_address
-- Description: Alter the ip_address column of the audit_logs table to allow up to 100 characters.
-- This prevents errors when x-forwarded-for contains a chain of multiple proxy IP addresses.

ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(100);
