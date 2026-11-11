-- Application metadata only. Safe to run with BEGIN READ ONLY.
-- No user rows, Auth identities, allowlist contents, secrets or application RPC calls.
SELECT jsonb_build_object(
 'schemas', (SELECT jsonb_agg(jsonb_build_object(
   'name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
   'acl',(SELECT jsonb_agg(jsonb_build_object(
     'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'privilege',a.privilege_type,'grantable',a.is_grantable))
     FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)))
   FROM pg_namespace n WHERE n.nspname IN ('public','serien_internal','serien_access')),
 'tables', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'options',c.reloptions,
   'acl',(SELECT jsonb_agg(jsonb_build_object(
     'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'privilege',a.privilege_type,'grantable',a.is_grantable))
     FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)))
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','serien_internal','serien_access') AND c.relkind IN ('r','p','v','m','f','S')),
 'columns', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'table',c.relname,'position',a.attnum,'name',a.attname,
   'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
   'identity',a.attidentity,'generated',a.attgenerated,
   'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text))
   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
   WHERE n.nspname IN ('public','serien_internal','serien_access') AND c.relkind IN ('r','p','v','m','f')
     AND a.attnum>0 AND NOT a.attisdropped),
 'constraints', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'table',c.relname,'name',k.conname,'type',k.contype,
   'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated,
   'deferrable',k.condeferrable,'deferred',k.condeferred))
   FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','serien_internal','serien_access')),
 'indexes', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'table',c.relname,'name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
   'valid',i.indisvalid,'ready',i.indisready))
   FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class ic ON ic.oid=i.indexrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','serien_internal','serien_access')),
 'functions', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'result',pg_get_function_result(p.oid),'language',l.lanname,'source',p.prosrc,
   'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,
   'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'config',p.proconfig,
   'acl',(SELECT jsonb_agg(jsonb_build_object(
     'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'privilege',a.privilege_type,'grantable',a.is_grantable))
     FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
   WHERE n.nspname IN ('public','serien_internal','serien_access')
     AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')),
 'triggers', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'table',c.relname,'name',t.tgname,'definition',pg_get_triggerdef(t.oid),
   'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'deferred',t.tginitdeferred))
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('public','serien_internal','serien_access') AND NOT t.tgisinternal),
 'policies', (SELECT jsonb_agg(jsonb_build_object(
   'schema',schemaname,'table',tablename,'name',policyname,'permissive',permissive,
   'roles',roles,'command',cmd,'using',qual,'check',with_check))
   FROM pg_policies WHERE schemaname IN ('public','serien_internal','serien_access')),
 'default_privileges', (SELECT jsonb_agg(jsonb_build_object(
   'creator',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'type',d.defaclobjtype,
   'acl',(SELECT jsonb_agg(jsonb_build_object(
     'grantor',pg_get_userbyid(a.grantor),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
     'privilege',a.privilege_type,'grantable',a.is_grantable)) FROM aclexplode(d.defaclacl) a)))
   FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace
   WHERE n.nspname IN ('public','serien_internal','serien_access')),
 'effective_privileges', (SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'table',c.relname,'role',r.rolname,
   'select',has_table_privilege(r.oid,c.oid,'SELECT'),'insert',has_table_privilege(r.oid,c.oid,'INSERT'),
   'update',has_table_privilege(r.oid,c.oid,'UPDATE'),'delete',has_table_privilege(r.oid,c.oid,'DELETE'),
   'truncate',has_table_privilege(r.oid,c.oid,'TRUNCATE'),
   'column_access',has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN pg_roles r
   WHERE n.nspname IN ('public','serien_internal','serien_access') AND c.relkind IN ('r','p')
     AND r.rolname IN ('anon','authenticated','service_role')),
 'custom_roles', (SELECT jsonb_agg(jsonb_build_object(
   'name',rolname,'login',rolcanlogin,'inherit',rolinherit,'bypass_rls',rolbypassrls,'superuser',rolsuper))
   FROM pg_roles WHERE rolname LIKE 'serien%'),
 'custom_schemas', (SELECT jsonb_agg(nspname) FROM pg_namespace WHERE nspname LIKE 'serien%')
);
