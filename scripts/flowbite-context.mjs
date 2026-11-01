import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const transport=new StdioClientTransport({command:process.execPath,args:[path.join(root,'node_modules/flowbite-mcp/build/index.js'),'--mode','stdio'],stderr:'pipe'});
const client=new Client({name:'yorimichi-design-context',version:'1.0.0'});
try{
 await client.connect(transport);
 const tools=await client.listTools();
 const resources=await client.listResources();
 const folder=path.join(root,'docs/delivery/flowbite/mcp');await mkdir(folder,{recursive:true});
 await writeFile(path.join(folder,'catalog.json'),JSON.stringify({tools:tools.tools,resources:resources.resources},null,2));
 console.log(JSON.stringify({tools:tools.tools.map(t=>t.name),resourceCount:resources.resources.length}));
 for(const name of ['buttons','cards','navbar','modal','forms','tabs']){
  const resource=resources.resources.find(r=>r.uri==='flowbite://components/'+name);
  if(!resource)continue;
  const result=await client.readResource({uri:resource.uri});
  await writeFile(path.join(folder,name+'.md'),result.contents.map(c=>c.text||'').join('\n'));
  console.log('Read MCP resource:',resource.uri);
 }
 const theme=await client.callTool({name:'generate-theme',arguments:{brandColor:'#2563EB',instructions:'Japanese daily audio magazine. Wide horizontal navigation, spacious off-white editorial layout, deep ocean blue feature area, crisp blue controls, sky blue and coral orange program artwork. Restrained 12px corner radius. Large readable typography. Support light and dark modes. No lavender, no dashboard sidebar, no gradients.',fileName:'yorimichi-flowbite-theme.css'}});
 await writeFile(path.join(folder,'theme-response.json'),JSON.stringify(theme,null,2));
 console.log('MCP generate-theme:',theme.isError?'error':'success');
}finally{await client.close();}
