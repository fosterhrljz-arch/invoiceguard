import { openDB } from 'idb';
import {sha256} from './integrity.js';
let connection;
function db(){return connection??=openDB('invoiceguard-local-v1',1,{upgrade(d){d.createObjectStore('workspace');d.createObjectStore('files');}});}
export async function loadWorkspace(){const conn=await db(),state=await conn.get('workspace','current');let changed=false;
 // Older demo records used descriptive identifiers in their hash field.
 // Migrate only those explicitly marked samples to real source-file hashes.
 for(const d of state?.documents||[])if(d.sample&&/^sample-/.test(d.hash||'')){const file=await conn.get('files',d.id);d.hash=file?await sha256(await file.arrayBuffer()):'';changed=true;}
 if(changed)await conn.put('workspace',state,'current');return state;}
export async function saveWorkspace(value){await (await db()).put('workspace',value,'current');}
export async function saveFile(id,file){await (await db()).put('files',file,id);}
// Metadata and original commit together; a quota failure cannot leave a row
// claiming an original was saved when only one of the two writes succeeded.
export async function saveDocument(value,id,file){const tx=(await db()).transaction(['workspace','files'],'readwrite');await tx.objectStore('files').put(file,id);await tx.objectStore('workspace').put(value,'current');await tx.done;}
export async function getFile(id){return (await db()).get('files',id);}
export async function replaceWorkspace(data,files){ const tx=(await db()).transaction(['workspace','files'],'readwrite'); await tx.objectStore('files').clear(); for(const [id,file] of files)await tx.objectStore('files').put(file,id); await tx.objectStore('workspace').put(data,'current'); await tx.done; }
