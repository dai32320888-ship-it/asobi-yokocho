'use strict';
// Compatibility entry point; v4 uses the actual Worker and SQLite integration.
const {spawnSync}=require('node:child_process');
const {join}=require('node:path');
const result=spawnSync(process.execPath,[join(__dirname,'v4-regression.cjs')],{stdio:'inherit'});
process.exit(result.status??1);
