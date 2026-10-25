
const page = await figma.getNodeByIdAsync('0:1');
await figma.setCurrentPageAsync(page);
page.name='README · GitHub assets';
const created=[],mutated=[];
const fonts=['Regular','Medium','Semi Bold','Bold','Extra Bold'];
await Promise.all(fonts.map(style=>figma.loadFontAsync({family:'Inter',style})));
const c = hex=>({r:parseInt(hex.slice(1,3),16)/255,g:parseInt(hex.slice(3,5),16)/255,b:parseInt(hex.slice(5,7),16)/255});
const ink='#18304D',blue='#3269E8',muted='#667B98',sky='#E7EFFF',green='#147A67',warm='#A97131';
function track(n){created.push(n.id);return n;}
function stack(name,direction,w,h,fill){const n=track(figma.createAutoLayout(direction));n.name=name;n.resize(w,h);n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='FIXED';n.fills=fill?[{type:'SOLID',color:c(fill)}]:[];return n;}
function text(parent,name,chars,size,style,color,width){const n=track(figma.createText());n.name=name;n.fontName={family:'Inter',style};n.fontSize=size;n.lineHeight={unit:'PIXELS',value:Math.round(size*1.3)};n.fills=[{type:'SOLID',color:c(color)}];n.characters=chars;parent.appendChild(n);if(width){n.resize(width,n.height);n.textAutoResize='HEIGHT';n.layoutSizingHorizontal='FIXED';}else n.textAutoResize='WIDTH_AND_HEIGHT';return n;}
const header=stack('README / Header', 'VERTICAL',1320,500,sky);
header.x=100;header.y=100;header.cornerRadius=24;header.paddingLeft=48;header.paddingRight=48;header.paddingTop=40;header.paddingBottom=40;header.itemSpacing=30;
header.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:1},suffix:''}];
const top=stack('Brand and context','HORIZONTAL',1224,44);
header.appendChild(top);top.primaryAxisAlignItems='SPACE_BETWEEN';top.counterAxisAlignItems='CENTER';
const logo=stack('Fox.ai wordmark','HORIZONTAL',280,44);top.appendChild(logo);logo.itemSpacing=8;logo.counterAxisAlignItems='CENTER';
const mark=track(figma.createNodeFromSvg('<svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 25c-8-3-4-15 4-12 4 2 4 12 9 14 9 4 15-8 8-13-6-5-10 3-13 8" stroke="#3269E8" stroke-width="4.5" stroke-linecap="round"/></svg>'));
logo.appendChild(mark);mark.resize(44,44);text(logo,'Brand name','Fox.ai',31,'Bold',ink);
text(top,'Hackathon context','CAL HACKS 13  /  WORKING DEMO',12,'Semi Bold',muted);
const body=stack('Product promise and mascot team','HORIZONTAL',1224,294);header.appendChild(body);body.itemSpacing=32;body.counterAxisAlignItems='CENTER';
const copy=stack('Product promise','VERTICAL',640,294);body.appendChild(copy);copy.itemSpacing=17;
const headline=text(copy,'Headline','Better listings.\nA smarter next round.',60,'Extra Bold',ink,640);headline.lineHeight={unit:'PIXELS',value:69};headline.letterSpacing={unit:'PIXELS',value:-2.3};
const subtitle=text(copy,'Subheading','A learning loop for small marketplace sellers.\nGrounded in their products, competitors and sales.',21,'Regular',muted,630);subtitle.lineHeight={unit:'PIXELS',value:31};
const note=stack('Human approval promise','HORIZONTAL',610,28);copy.appendChild(note);note.itemSpacing=9;note.counterAxisAlignItems='CENTER';
const dot=track(figma.createEllipse());dot.resize(7,7);dot.fills=[{type:'SOLID',color:c(green)}];note.appendChild(dot);text(note,'Human control','AI proposes. The seller decides. The loop learns.',14,'Medium',green);
const team=stack('Lo, Fox and Spark','VERTICAL',552,294);body.appendChild(team);team.itemSpacing=17;
const art=track(figma.createFrame());art.name='Original mascot artwork · transparent';art.resize(552,242);art.clipsContent=true;art.fills=[];team.appendChild(art);
const sheet=track(figma.createRectangle());sheet.name='Lo / Fox / Spark · original artwork';sheet.resize(552,552*1027/1531);sheet.fills=[{type:'IMAGE',imageHash:'384ffb3962b0256b22d105c6c0ff95bba74a0033',scaleMode:'FIT'}];art.appendChild(sheet);sheet.x=0;sheet.y=-79;
const names=stack('Mascot names and roles','HORIZONTAL',552,22);team.appendChild(names);names.primaryAxisAlignItems='SPACE_BETWEEN';names.paddingLeft=43;names.paddingRight=16;
text(names,'Lo role','LO · THE PARTNER',11,'Bold',blue);
text(names,'Fox role','FOX · THE CREATIVE',11,'Bold',warm);
text(names,'Spark role','SPARK · THE ANALYST',11,'Bold',blue);
const proof=stack('Evidence line','HORIZONTAL',1224,22);header.appendChild(proof);proof.itemSpacing=16;
text(proof,'Evidence statement','Real competitor research',12,'Medium',muted);text(proof,'Separator','·',12,'Medium',blue);text(proof,'Evidence statement','Product-referenced covers',12,'Medium',muted);text(proof,'Separator','·',12,'Medium',blue);text(proof,'Evidence statement','Git-versioned learning',12,'Medium',muted);
const loop=stack('README / The product loop','HORIZONTAL',1320,236,'#FFFFFF');loop.x=100;loop.y=660;loop.cornerRadius=20;loop.paddingLeft=36;loop.paddingRight=36;loop.paddingTop=32;loop.paddingBottom=32;loop.itemSpacing=24;loop.strokes=[{type:'SOLID',color:c('#E3E8F2')}];loop.strokeWeight=1;
loop.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:1},suffix:''}];
const steps=[
['01 / LO','Start with a real product.','A real photo, seller context and\ncomparable marketplace listings.',blue],
['02 / FOX','Review the possibilities.','Different covers, copy and approaches.\nThe seller chooses what to keep.',warm],
['03 / SPARK','Learn. Then loop.','Sales evidence updates the playbook\nand informs the next round.',green]
];
for(const [tag,title,desc,color] of steps){const card=stack(tag,'VERTICAL',400,172);loop.appendChild(card);card.itemSpacing=15;text(card,'Step and mascot',tag,12,'Bold',color);text(card,'Step title',title,23,'Bold',ink,400);const d=text(card,'Step description',desc,16,'Regular',muted,400);d.lineHeight={unit:'PIXELS',value:25};}
const source=await figma.getNodeByIdAsync('1:2');if(source){source.name='Source / Mascot artwork';source.visible=false;source.x=1600;source.y=100;mutated.push(source.id);}
return {createdNodeIds:created,mutatedNodeIds:mutated,headerId:header.id,loopId:loop.id,frames:[{id:header.id,name:header.name,width:header.width,height:header.height,children:header.children.length},{id:loop.id,name:loop.name,width:loop.width,height:loop.height,children:loop.children.length}]};

