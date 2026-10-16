import server from '../../catalog/server.cjs';
const handle=server.createCatalogService();
export default async request=>{
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const result=await handle(request.url);
  return new Response(request.method==='HEAD'?null:result.body,{status:result.status,headers:result.headers});
};
export const config={path:['/products','/products/*','/brands','/brands/*','/categories','/categories/*','/catalog-sitemap.xml']};
