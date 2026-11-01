export function buildQueue(visible,all,selected){
 const source=visible.some(e=>e.id===selected)?visible:all;
 return [...new Set(source.map(e=>e.id))];
}
export function nextIds(queue,current){
 const index=queue.indexOf(current);
 return index<0?[]:queue.slice(index+1);
}
