export type GraphNode={id:string;type:string;label?:string;x?:number;y?:number;config?:Record<string,unknown>};
export type GraphEdge={id:string;source:string;target:string;label?:string};
export type GraphResult=Record<string,unknown>&{route?:string|string[]};
export type GraphActivation={from:string|null;edgeId?:string;result?:GraphResult};
function edgeKey(label?:string){return String(label??'').trim().toLowerCase();}
export function validateWorkflowGraph(nodes:GraphNode[],edges:GraphEdge[]){
  const ids=new Set<string>();const issues:string[]=[];
  for(const node of nodes){if(ids.has(node.id))issues.push(`Node duplicado: ${node.id}`);ids.add(node.id);}
  const seenEdges=new Set<string>();
  for(const edge of edges){
    if(!ids.has(edge.source)||!ids.has(edge.target))issues.push(`Edge inválida: ${edge.id}`);
    if(edge.source===edge.target)issues.push(`Self-loop não permitido: ${edge.id}`);
    const key=`${edge.source}>${edge.target}>${edgeKey(edge.label)}`;if(seenEdges.has(key))issues.push(`Edge duplicada: ${edge.id}`);seenEdges.add(key);
  }
  const incoming=new Map<string,number>();const outgoing=new Map<string,string[]>();
  for(const node of nodes){incoming.set(node.id,0);outgoing.set(node.id,[]);}
  for(const edge of edges)if(ids.has(edge.source)&&ids.has(edge.target)){outgoing.get(edge.source)!.push(edge.target);incoming.set(edge.target,(incoming.get(edge.target)??0)+1);}
  const queue=nodes.filter(n=>(incoming.get(n.id)??0)===0).map(n=>n.id);let visited=0;
  while(queue.length){const id=queue.shift()!;visited++;for(const target of outgoing.get(id)??[]){const next=(incoming.get(target)??1)-1;incoming.set(target,next);if(next===0)queue.push(target);}}
  if(nodes.length&&visited!==nodes.length)issues.push('O workflow contém um ciclo. Workflows devem ser DAGs.');
  return issues;
}
export async function executeGraph<T extends GraphNode>(args:{
  nodes:T[];edges:GraphEdge[];isStartNode:(node:T)=>boolean;isJoinNode?:(node:T)=>boolean;joinExpected?:(node:T)=>number;
  route:(node:T,result:GraphResult,edges:GraphEdge[])=>GraphEdge[];
  execute:(node:T,context:{activations:GraphActivation[];results:Record<string,GraphResult>;runId:string})=>Promise<GraphResult>;runId:string;
}):Promise<Record<string,GraphResult>>{
  const byId=new Map(args.nodes.map(node=>[node.id,node]));const outgoing=new Map<string,GraphEdge[]>();for(const node of args.nodes)outgoing.set(node.id,[]);
  for(const edge of args.edges)if(byId.has(edge.source)&&byId.has(edge.target))outgoing.get(edge.source)!.push(edge);
  const activations=new Map<string,GraphActivation[]>();const results:Record<string,GraphResult>={};const started=new Set<string>();const tasks=new Set<Promise<void>>();let failure:unknown=null;
  const launch=async(node:T):Promise<void>=>{
    if(failure||started.has(node.id))return;
    const arrivals=activations.get(node.id)??[];const join=args.isJoinNode?.(node)===true;const expected=join?Math.max(1,args.joinExpected?.(node)??arrivals.length):1;if(arrivals.length<expected)return;
    started.add(node.id);
    try{
      const result=await args.execute(node,{activations:arrivals,results,runId:args.runId});results[node.id]=result;
      for(const edge of args.route(node,result,outgoing.get(node.id)??[])){const target=byId.get(edge.target);if(!target)continue;const list=activations.get(target.id)??[];list.push({from:node.id,edgeId:edge.id,result});activations.set(target.id,list);if(!started.has(target.id)){const task=launch(target);tasks.add(task);void task.finally(()=>tasks.delete(task));}}
    }catch(error){failure=error;throw error;}
  };
  for(const node of args.nodes)if(args.isStartNode(node))activations.set(node.id,[{from:null}]);
  for(const node of args.nodes)if((activations.get(node.id)?.length??0)>0){const task=launch(node);tasks.add(task);void task.finally(()=>tasks.delete(task));}
  while(tasks.size)await Promise.allSettled([...tasks]);
  if(failure)throw failure;return results;
}
export function selectRoute(edges:GraphEdge[],route:string|string[]|undefined){if(route===undefined)return edges;const wanted=new Set((Array.isArray(route)?route:[route]).map(edgeKey));return edges.filter(edge=>wanted.has(edgeKey(edge.label)));}
