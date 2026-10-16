function connectHome(html,products){
  const byId=new Map(products.filter(p=>p.published).map(p=>[p.id,p]));
  html=html.replace(/<a\b[^>]*href="https:\/\/restandard\.base\.ec\/items\/(\d+)"[^>]*>[\s\S]*?<\/a>/g,(anchor,id)=>{
    const product=byId.get(id);
    // Editorial photographs lead directly to BASE; the product catalog is independent.
    return product?anchor:'';
  });
  return html;
}
module.exports={connectHome};
