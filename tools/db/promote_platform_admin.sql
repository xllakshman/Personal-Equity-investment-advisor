-- Promote an existing auth user to platform_admin. Edit the email, then:
-- CONFIRM_APPLY=1 psql ... -f tools/db/promote_platform_admin.sql
-- Default target is the operator email from the mock admin list.

update users
   set role = 'platform_admin'
 where email = 'lakshmaneluri@gmail.com';
