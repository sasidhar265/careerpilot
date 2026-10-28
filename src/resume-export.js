import {Document,Packer,Paragraph,TextRun,BorderStyle} from 'docx';
import {jsPDF} from 'jspdf';
import {highlightResumeText,highlightableBlock} from './resume-highlights.js';
import {parseResume} from './resume-format.js';
export async function createDocx(text,keywords=[]){
 const blocks=parseResume(text);const paragraphs=blocks.map((b,i)=>new Paragraph({
 children:highlightResumeText(b.text,highlightableBlock(b.type)?keywords:[]).map(run=>new TextRun({text:run.text,font:'Calibri',size:b.type==='name'?36:b.type==='heading'?23:22,bold:run.bold||['name','heading','entry'].includes(b.type),color:'222222'})),
 ...(b.type==='bullet'?{bullet:{level:0},indent:{left:240,hanging:120}}:{}),
 spacing:{before:b.type==='heading'?220:b.type==='entry'?150:0,after:b.type==='name'?100:b.type==='heading'?100:b.type==='bullet'?70:90,line:264},
 keepNext:['name','heading','entry'].includes(b.type)||(b.type==='metadata'&&blocks[i+1]?.type==='bullet'),
 keepLines:true,
 ...(b.type==='heading'?{border:{bottom:{color:'888888',style:BorderStyle.SINGLE,size:4,space:4}}}:{}),
 }));
 const doc=new Document({creator:'CareerPilotAI',title:'Tailored Resume',styles:{default:{document:{run:{font:'Calibri',size:22,color:'222222'}}}},numbering:{config:[]},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:850,bottom:850,left:1000,right:1000}}},children:paragraphs}]});
 return Packer.toBlob(doc);
}
export function createPdf(text,keywords=[]){
 const pdf=new jsPDF({unit:'mm',format:'a4'});const blocks=parseResume(text),left=18,right=192,bottom=278;let y=19;
 const styles={name:{size:18,bold:true,before:0,after:3},contact:{size:10,before:0,after:2},heading:{size:11,bold:true,before:5,after:3},entry:{size:11,bold:true,before:3,after:1},metadata:{size:10,before:0,after:2},bullet:{size:10.5,before:0,after:1.5},skills:{size:10.5,before:0,after:2},paragraph:{size:10.5,before:0,after:2}};
 const setStyle=b=>{const style=styles[b.type];pdf.setFont('helvetica',style.bold?'bold':'normal');pdf.setFontSize(style.size);return style;};
 function measure(b){
 const s=setStyle(b),lineHeight=s.size*.3528*1.28,indent=b.type==='bullet'?4:0,width=right-left-indent;
 const lines=[[]];let used=0;
 const append=(text,bold)=>{const line=lines.at(-1),last=line.at(-1);if(last?.bold===bold)last.text+=text;else line.push({text,bold});};
 for(const run of highlightResumeText(b.text,highlightableBlock(b.type)?keywords:[])){
 const bold=!!(s.bold||run.bold);pdf.setFont('helvetica',bold?'bold':'normal');
 for(const token of run.text.match(/\s+|\S+/g)||[]){
 const size=pdf.getTextWidth(token);
 if(used+size>width&&used>0){lines.push([]);used=0;}
 if(!used&&/^\s+$/.test(token))continue;
 for(const char of token){const charWidth=pdf.getTextWidth(char);if(used+charWidth>width&&used>0){lines.push([]);used=0;}append(char,bold);used+=charWidth;}
 }
 }
 return {s,lineHeight,indent,lines,height:s.before+lines.length*lineHeight+s.after};
 }
 for(let i=0;i<blocks.length;i++){
 const b=blocks[i];let layout=measure(b);let keep=layout.height;
 if(['heading','entry','name'].includes(b.type)&&blocks[i+1])keep+=measure(blocks[i+1]).height;
 if(b.type==='heading'&&blocks[i+2])keep+=Math.min(measure(blocks[i+2]).height,15);
 if(y+keep>bottom&&y>19){pdf.addPage();y=19;}
 layout=measure(b);y+=layout.s.before;
 for(let j=0;j<layout.lines.length;j++){if(y+layout.lineHeight>bottom){pdf.addPage();y=19;setStyle(b);}if(b.type==='bullet'&&j===0){pdf.circle(left+1,y-1,0.55,'F');}let x=left+layout.indent;for(const run of layout.lines[j]){pdf.setFont('helvetica',run.bold?'bold':'normal');pdf.text(run.text,x,y);x+=pdf.getTextWidth(run.text);}y+=layout.lineHeight;}
 if(b.type==='heading'){pdf.setDrawColor(150);pdf.setLineWidth(.15);pdf.line(left,y-1,right,y-1);}
 y+=layout.s.after;
 }
 return pdf;
}
