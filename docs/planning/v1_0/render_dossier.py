from pathlib import Path
import re, html, json, math, zipfile, hashlib
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, XPreformatted, Flowable, Image
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parent
SRC=ROOT/'sources'
VERSION='1.0'
VERSION_TAG='v1_0'
DOCUMENT_COUNT=19
OUT=ROOT/'output'/'pdf'/VERSION_TAG
OUT.mkdir(parents=True,exist_ok=True)
FONT=Path('/usr/share/fonts/truetype/dejavu')
for name,f in [('Body','DejaVuSans.ttf'),('BodyBold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(FONT/f)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='BodyBold',italic='Body',boldItalic='BodyBold')
W,H=A4
M=45
CW=W-M*2
INK=colors.HexColor('#15212B')
BRASS=colors.HexColor('#A77E42')
CYAN=colors.HexColor('#277B90')
PAPER=colors.HexColor('#F7F8F9')

ST={
 'body':ParagraphStyle('body',fontName='Body',fontSize=9.1,leading=13.5,textColor=INK,spaceAfter=7,splitLongWords=1),
 'h2':ParagraphStyle('h2',fontName='BodyBold',fontSize=14,leading=18,textColor=INK,spaceBefore=17,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='BodyBold',fontSize=11,leading=15,textColor=INK,spaceBefore=10,spaceAfter=5,keepWithNext=True),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=7.6,leading=10.9,textColor=INK,spaceAfter=0,splitLongWords=1),
 'th':ParagraphStyle('th',fontName='BodyBold',fontSize=7.6,leading=10.5,textColor=colors.white,spaceAfter=0),
 'code':ParagraphStyle('code',fontName='Mono',fontSize=7.0,leading=10,textColor=INK,leftIndent=8,rightIndent=8,spaceBefore=5,spaceAfter=7),
 'ref':ParagraphStyle('ref',fontName='Body',fontSize=7.7,leading=10.5,textColor=colors.HexColor('#52606A'),spaceAfter=0),
 'small':ParagraphStyle('small',fontName='Body',fontSize=7.9,leading=11.5,textColor=colors.HexColor('#52606A'),spaceAfter=5),
 'bullet':ParagraphStyle('bullet',fontName='Body',fontSize=9.1,leading=13.5,textColor=INK,leftIndent=12,firstLineIndent=-10,spaceAfter=5),
}

def norm(t):
    return t.replace('\u2011','-').replace('\u2013','-').replace('\u2014',' - ').replace('\u00a0',' ').replace('\u202f',' ')

def inline(text):
    text=norm(text)
    tokens=[]
    def link(m):
        label,url=m.groups()
        tokens.append('<a href="'+html.escape(url,quote=True)+'" color="#24687A">'+html.escape(label)+'</a>')
        return f'ZZLINKTOKEN{len(tokens)-1}ZZ'
    text=re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',link,text)
    text=html.escape(text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`([^`]+)`',r'<font name="Mono" size="8">\1</font>',text)
    text=re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<i>\1</i>',text)
    for i,t in enumerate(tokens): text=text.replace(f'ZZLINKTOKEN{i}ZZ',t)
    return text

def para(text,style='body'): return Paragraph(inline(text),ST[style])

def widths(rows):
    n=len(rows[0]); heads=' '.join(rows[0]).lower()
    if n==2: weights=[.31,.69]
    elif n==3:
        weights=[.22,.45,.33]
        if any(x in heads for x in ['proposed acceptance','success signal','planning cost']): weights=[.13,.69,.18]
    elif n==4:
        weights=[.14,.34,.35,.17]
        if 'criterion' in heads: weights=[.28,.1,.1,.52]
        if 'classification' in heads: weights=[.16,.33,.33,.18]
    elif n==5:
        weights=[.12,.22,.22,.22,.22]
        if 'criterion' in heads: weights=[.23,.07,.07,.11,.52]
        if 'asset' in heads: weights=[.09,.18,.24,.22,.27]
    elif n==6: weights=[.07,.26,.19,.1,.1,.28]
    elif n==7: weights=[.06,.2,.15,.12,.09,.09,.29]
    else: weights=[1/n]*n
    return [CW*x/sum(weights) for x in weights]

def table(rows):
    n=len(rows[0]); rows=[(r+['']*n)[:n] for r in rows]
    data=[[para(c,'th' if i==0 else 'cell') for c in r] for i,r in enumerate(rows)]
    t=Table(data,colWidths=widths(rows),repeatRows=1,hAlign='LEFT',splitByRow=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),INK),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('LINEBELOW',(0,0),(-1,0),1.2,BRASS),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F1F4F6'),colors.white]),
        ('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#DCE3E8')),
    ]))
    return t

def parse_md(text):
    lines=text.splitlines(); story=[]; i=0; refs=False
    if lines and lines[0].startswith('# '): i=1
    while i<len(lines):
        s=lines[i].strip()
        if not s: i+=1;continue
        if s.startswith('```'):
            i+=1; block=[]
            while i<len(lines) and not lines[i].strip().startswith('```'):
                line=norm(lines[i])
                if len(line)>105:
                    import textwrap
                    block.extend(textwrap.wrap(line,width=105,replace_whitespace=False,drop_whitespace=False))
                else:block.append(line)
                i+=1
            story.append(XPreformatted(html.escape('\n'.join(block)),ST['code']))
            i+=1;continue
        if s.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?',x or ' ') for x in row):rows.append(row)
                i+=1
            story.append(table(rows));story.append(Spacer(1,9));continue
        if re.match(r'^#{2,3} Sources?(?: |$)',s):
            title=re.sub(r'^#{2,3} ', '',s)
            refheading=para(title,'h3');i+=1;entries=[]
            while i<len(lines) and not re.match(r'^#{1,3} ',lines[i].strip()):
                line=lines[i].strip()
                if line:entries.append(line)
                i+=1
            if len(entries)>=8:
                midpoint=(len(entries)+1)//2
                left=entries[:midpoint];right=entries[midpoint:]
                refrows=[]
                for k in range(midpoint):
                    refrows.append([para(left[k],'ref'),para(right[k] if k<len(right) else '', 'ref')])
                refs_table=Table(refrows,colWidths=[CW/2,CW/2],hAlign='LEFT')
                refs_table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
                story.append(KeepTogether([refheading,refs_table]))
            else:
                story.append(refheading)
                for entry in entries:story.append(para(entry,'small'))
            refs=False
            continue
        if s.startswith('### '):
            refs=s[4:].lower().startswith('source')
            story.append(para(s[4:],'h3'));i+=1;continue
        if s.startswith('## '):
            refs=s[3:].lower().startswith('source')
            story.append(para(s[3:],'h3' if refs else 'h2'));i+=1;continue
        if s.startswith('# '): story.append(para(s[2:],'h2'));i+=1;continue
        if re.fullmatch(r'[-*_]{3,}',s):i+=1;continue
        if re.match(r'^[-*] ',s):story.append(para('• '+s[2:],'small' if refs else 'bullet'));i+=1;continue
        if re.match(r'^\d+\. ',s):story.append(para(s,'small' if refs else 'bullet'));i+=1;continue
        if s.startswith('> '): story.append(para(s[2:],'small'));i+=1;continue
        group=[s];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|[-*] |\d+\. |>)',lines[i].strip()):
            group.append(lines[i].strip());i+=1
        story.append(para(' '.join(group),'small' if refs else 'body'))
    return story

class MaterialSwatches(Flowable):
    def __init__(self): super().__init__();self.width=CW;self.height=105
    def draw(self):
        sw=[('Pale glass','#DCE6EA'),('Control base','#F1F5F6'),('Brass','#8B6B39'),('Deck A ink','#00697A'),('Deck B ink','#A53E18')]
        c=self.canv; gap=10; bw=(CW-4*gap)/5
        for i,(name,color) in enumerate(sw):
            x=i*(bw+gap);c.setFillColor(colors.HexColor(color));c.roundRect(x,35,bw,58,8,fill=1,stroke=0)
            c.setFont('BodyBold',8);c.setFillColor(INK);c.drawString(x,20,name)
            c.setFont('Mono',7.5);c.setFillColor(colors.HexColor('#52606A'));c.drawString(x,7,color)

def wrap_title(c,title,maxw=440,size=29):
    words=title.split();lines=[];line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if pdfmetrics.stringWidth(candidate,'BodyBold',size)>maxw and line: lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines

def cover(c,doc,title,number):
    c.saveState();c.setFillColor(colors.HexColor('#101A23'));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#172632'));c.roundRect(W-220,170,260,460,35,fill=1,stroke=0)
    c.setStrokeColor(colors.HexColor('#304754'));c.setLineWidth(1)
    for r in [70,98,126]:c.circle(W-88,380,r,stroke=1,fill=0)
    c.setFillColor(BRASS);c.rect(M,H-88,45,4,fill=1,stroke=0)
    c.setFont('BodyBold',10);c.setFillColor(colors.HexColor('#C7D5DE'));c.drawString(M,H-118,'MOBILE DJ / PRODUCT BLUEPRINT')
    c.setFont('Mono',12);c.setFillColor(colors.HexColor('#D5B681'));c.drawString(M,H-185,f'DOCUMENT {number} OF {DOCUMENT_COUNT}' if number!='00' else f'DESIGN HANDOFF / VERSION {VERSION}')
    y=H-248
    c.setFillColor(colors.white);c.setFont('BodyBold',29)
    for line in wrap_title(c,title):c.drawString(M,y,line);y-=40
    p=Paragraph('A new touch-first performance instrument.<br/>Professional audio, liquid glass and mechanical craft.',ParagraphStyle('cover_sub',fontName='Body',fontSize=12,leading=19,textColor=colors.HexColor('#BBCBD5')))
    pw,ph=p.wrap(CW-20,100);p.drawOn(c,M,y-ph-12)
    if number=='04':
        palette=[('Pale glass','#DCE6EA'),('Control base','#F1F5F6'),('Brass','#8B6B39'),('Deck A ink','#00697A'),('Deck B ink','#A53E18')]
        bw=(CW-40)/5
        c.setFont('Body',8);c.setFillColor(colors.HexColor('#BBCBD5'));c.drawString(M,279,'DIRECTION C SELECTED / PROPOSED ROLE COLORS')
        for i,(label,value) in enumerate(palette):
            x=M+i*(bw+10);c.setFillColor(colors.HexColor(value));c.roundRect(x,226,bw,38,5,fill=1,stroke=0)
            c.setFillColor(colors.HexColor('#BBCBD5'));c.setFont('Body',7.5);c.drawString(x,211,label)
            c.setFont('Mono',6.5);c.drawString(x,198,value)
    c.setStrokeColor(colors.HexColor('#3B4A53'));c.line(M,155,W-M,155)
    c.setFont('BodyBold',9);c.setFillColor(colors.HexColor('#D5B681'));c.drawString(M,132,'DESIGN HANDOFF BASELINE - PLANNING ONLY')
    c.setFont('Body',9);c.setFillColor(colors.HexColor('#B6C7D1'));c.drawString(M,109,'29 October 2026  |  Crystal Current selected; S26 Ultra test target')
    c.setFont('Body',8);c.drawString(M,67,'Independent of the previous Mixline preview. Targets are not measured results.')
    c.restoreState()

def footer(c,doc,number,title):
    c.saveState();c.setStrokeColor(colors.HexColor('#D7E0E5'));c.setLineWidth(.5);c.line(M,42,W-M,42)
    c.setFillColor(colors.HexColor('#62717D'));c.setFont('Body',7)
    c.drawString(M,28,'MOBILE DJ  /  DESIGN HANDOFF 1.0  /  29 OCT 2026')
    c.drawRightString(W-M,28,f'{number}  /  {doc.page}')
    c.setFont('Body',7);c.drawString(M,H-28,title[:84]);c.setFillColor(BRASS);c.rect(W-M-30,H-28,30,2,fill=1,stroke=0)
    c.restoreState()

def make_doc(file):
    raw=file.read_text(); title=re.sub(r'^\d+\s*[.·—–-]\s*','',raw.splitlines()[0][2:]).strip(); num=file.name[:2]
    dest=OUT/(file.stem+'.pdf')
    doc=SimpleDocTemplate(str(dest),pagesize=A4,rightMargin=M,leftMargin=M,topMargin=52,bottomMargin=56,title=title,author='Mobile DJ planning')
    story=[Spacer(1,8),PageBreak()]
    if num=='04':
        story.append(para('Crystal Current selected','h2'))
        story.append(para('Generated material studies. The same performance task is shown, but exact control placement differs. These are not validated native layouts or audio screenshots.','small'))
        for letter, label, filename in [('C','Selected C - Crystal Current','Direction_C_Crystal_Current.png'),('A','Historical comparison A - Precision Atelier','Direction_A_Precision_Atelier.png')]:
            image_path=ROOT/'assets'/'concepts'/filename
            from PIL import Image as PILImage
            with PILImage.open(image_path) as im: iw,ih=im.size
            story.append(para(label,'h3'))
            story.append(Image(str(image_path),width=CW,height=CW*ih/iw))
            story.append(Spacer(1,9))
        story.append(para('C is selected. A is retained as historical comparison. Native geometry, labels and contrast still require implementation validation.','small'))
        story.append(PageBreak())
    story.extend(parse_md(raw))
    doc.build(story,onFirstPage=lambda c,d:cover(c,d,title,num),onLaterPages=lambda c,d:footer(c,d,num,title))
    return {'number':num,'title':title,'source':str(file.relative_to(ROOT)),'pdf':str(dest.relative_to(ROOT)),'pages':len(PdfReader(dest).pages),'words':len(raw.split())}

def make_master(records):
    front=ROOT/'tmp'/'front_v1_0.pdf'
    front.parent.mkdir(parents=True,exist_ok=True)
    doc=SimpleDocTemplate(str(front),pagesize=A4,rightMargin=M,leftMargin=M,topMargin=52,bottomMargin=56,title='Mobile DJ Planning Dossier v1.0',author='Mobile DJ planning')
    story=[Spacer(1,8),PageBreak(),para('Version 1.0 - Local first, ready for design','h2'),para('Nineteen coordinated specifications for a new Android mobile DJ app. Build the local phone version first; AWS is a later optional extension. The future AWS planning target is about US$35/month, excluding ParDay AI charges. No further owner answer is needed to start design. This baseline is a plan, not an implemented or certified app.')]
    rows=[['Area','Current baseline'],['Platform and audience','Android first; Galaxy S26 Ultra is the first test target. Serious mobile DJs primary; casual streaming DJs secondary.'],['Delivery sequence','Personal tool for practice/private gatherings. Phone-native first, with no required server; optional AWS expansion later.'],['Accessories and scope','USB audio interfaces and DJ splitters allowed. All selected professional modules retained; lighting and external DJ controllers excluded.'],['Visual direction','C - Crystal Current selected. Pale glass, titanium and restrained brass; A remains historical comparison.'],['DSP and stack','Compatible open source preferred; justified paid DSP acceptable. Kotlin/Compose plus C++/Oboe proposed.'],['ParDay','Preparation plus specifically armed bounded assistance and manual takeover. AI provider, spending limit and voice remain later choices.'],['AWS and source sharing','US$35/month future AWS planning target, excluding AI; not a hard cap or deployment approval. Optional GitHub sharing; no project licence or publication yet.']]
    story.append(table(rows))
    story.append(para('Start with Document 19, then 04, 03, 08 and 12. The pack retains 49 functional requirements, 24 shared quality gates, 90 specialist/deployment cases and 30 asset classes. AWS and home-lab service-specific variants are deferred; applicable local cases remain required.'))
    story.extend([PageBreak(),para('Contents','h2')])
    rows=[['Document','Subject','Start page']];offset=5
    for r in records:
        rows.append([r['number'],r['title'],str(offset)]);offset+=r['pages']
    story.append(table(rows))
    story.extend([PageBreak(),para('Readiness and agent handoff','h2'),para('Status: final planning and design baseline, version 1.0. Confirmed choices, proposed defaults and deferred engineering evidence are distinct. No unanswered owner question blocks design. No device benchmark, source adapter, AI integration, app implementation or deployment is claimed.')])
    for line in ['Owner and design agents: 19 -> 04 -> 03 -> 08 -> 12, then trace the complete selected scope through 02.','Architecture/audio agents: 02 -> 05 -> 06 -> 09 -> 13 -> 15; use work packages and local-first gates in 10.','Data/acquisition agents: 07 -> 14 -> 16 -> 11. Prove the on-device path first; preserve actual source, quality and publication/cancellation rules.','Future cloud/publication agents: 17 -> 18, only when that extension is requested. Use the deferred comparison and current-cost review.']:
        story.append(para(line,'bullet'))
    story.extend([para('Design now; evidence at the relevant gate','h2'),para('Use Mobile DJ as a working name and typed/touch ParDay as a design default. Capture the actual phone build and audio route before physical tests; evaluate DSP, stems, plugins and source paths before claiming support. Choose a paid AI configuration before real calls. AWS account, region and live quote can wait until expansion.'),para('Companion pack','h2'),para('Nineteen editable specifications and PDFs, this dossier, decision and requirement ledgers, semantic schemas, readiness and deployment profiles, proposed C tokens, 30 asset work orders, two generated concepts with prompts, and the PDF renderer. Concept art shows materials, not measured native controls.'),para('Scope and authority','h2'),para('The first two-deck slice is not the complete four-deck professional product. Preserve requested unofficial acquisition candidates and their independent technical/access/rights/distribution evidence. ParDay proposals need deterministic local authority. Prepared local sets must remain usable without AWS or AI.'),para('Planning toolkit and revision','h2'),para('This pass uses Product Lens, Premium Product UI and independent scope, audio and acquisition/cloud reviews. Earlier Council and Learning Engine work remains in the dossier. Version 1.0 supersedes the AWS-first comparison sequence with local-first delivery; it does not claim a new full Council exercise or production validation.')])
    doc.build(story,onFirstPage=lambda c,d:cover(c,d,'Mobile DJ planning dossier','00'),onLaterPages=lambda c,d:footer(c,d,'00','Dossier guide'))
    frontpages=len(PdfReader(front).pages)
    if frontpages!=4:raise RuntimeError(f'Frontmatter expected 4 pages, got {frontpages}; regenerate TOC offsets.')
    writer=PdfWriter();writer.append(str(front));offset=frontpages
    for r in records:
        writer.append(str(ROOT/r['pdf']),import_outline=False)
        writer.add_outline_item(r['number']+'  '+r['title'],offset)
        r['master_start_page']=offset+1;offset+=r['pages']
    writer.add_metadata({'/Title':'Mobile DJ Planning Dossier v1.0','/Author':'Mobile DJ planning','/Subject':'Nineteen specifications: local-first Android DJ design, ParDay, professional modules and later optional AWS expansion'})
    dest=OUT/'Mobile_DJ_Planning_Dossier_v1_0.pdf'
    with dest.open('wb') as f:writer.write(f)
    return dest,offset

if __name__=='__main__':
    files=sorted(SRC.glob('[0-1][0-9]_*.md'))
    if len(files)!=DOCUMENT_COUNT:raise RuntimeError(f'Expected {DOCUMENT_COUNT} docs, got {len(files)}')
    records=[make_doc(f) for f in files]
    master,pages=make_master(records)
    (ROOT/'document_manifest.json').write_text(json.dumps({'version':VERSION,'status':'final_planning_baseline_ready_for_design_local_first_aws_later','date':'2026-10-29','documents':records,'master':str(master.relative_to(ROOT)),'total_pages':pages},indent=2))
    print(json.dumps({'documents':len(records),'words':sum(r['words'] for r in records),'master_pages':pages,'per_document':[{'number':r['number'],'pages':r['pages']} for r in records]}))
