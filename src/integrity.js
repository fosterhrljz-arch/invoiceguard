export async function sha256(data){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function csv(rows){const quote=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';return '\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n');}
