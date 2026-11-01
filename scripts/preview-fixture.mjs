import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../server.mjs';
const dataDir=await mkdtemp(path.join(tmpdir(),'yorimichi-flowbite-ui-'));
const server=await createApp({dataDir});
server.listen(4318,'127.0.0.1',()=>console.log('Isolated Flowbite UI test → http://127.0.0.1:4318'));
async function stop(){server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
