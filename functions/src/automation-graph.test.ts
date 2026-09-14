import { executeGraph, selectRoute, validateWorkflowGraph } from './automation-graph-core';

type Node={id:string;type:string;label?:string;x?:number;y?:number;config?:Record<string,unknown>};

describe('automation graph runtime',()=>{
  it('rejects cycles and duplicate edges',()=>{
    const nodes=[{id:'a',type:'action.a'},{id:'b',type:'action.b'}] as Node[];
    expect(validateWorkflowGraph(nodes,[{id:'e1',source:'a',target:'b'},{id:'e1b',source:'a',target:'b'}])).toContain('Edge duplicada: e1b');
    expect(validateWorkflowGraph(nodes,[{id:'e1',source:'a',target:'b'},{id:'e2',source:'b',target:'a'}])).toContain('O workflow contém um ciclo. Workflows devem ser DAGs.');
  });
  it('fans out and joins parallel branches',async()=>{
    const nodes=[{id:'start',type:'trigger.manual'},{id:'left',type:'action.work'},{id:'right',type:'action.work'},{id:'join',type:'action.join',config:{joinExpected:2}},{id:'done',type:'action.work'}] as Node[];
    const edges=[{id:'s-l',source:'start',target:'left'},{id:'s-r',source:'start',target:'right'},{id:'l-j',source:'left',target:'join'},{id:'r-j',source:'right',target:'join'},{id:'j-d',source:'join',target:'done'}];
    const result=await executeGraph({nodes,edges,isStartNode:n=>n.id==='start',isJoinNode:n=>n.id==='join',joinExpected:n=>Number(n.config?.joinExpected??1),route:(_n,_r,e)=>e,runId:'test-run',execute:async n=>{if(n.id==='left'||n.id==='right')await new Promise(r=>setTimeout(r,n.id==='left'?35:25));return{id:n.id};}});
    expect(Object.keys(result).sort()).toEqual(['done','join','left','right','start']);
  });
  it('routes a branch using edge labels',()=>{
    const edges=[{id:'t',source:'b',target:'yes',label:'true'},{id:'f',source:'b',target:'no',label:'false'}];
    expect(selectRoute(edges,'true').map(e=>e.target)).toEqual(['yes']);
    expect(selectRoute(edges,'false').map(e=>e.target)).toEqual(['no']);
  });
});
