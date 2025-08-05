export const Preliminar = `\\documentclass[a4paper,11pt]{article}

%%%%%%%%%%%%%%%%%%% PACKAGES %%%%%%%%%%%%%%%%%%%%%%%%

% BÀSICS
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[catalan]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{hyperref}
\\usepackage{calc}
\\usepackage[catalan, capitalise]{cleveref}
\\usepackage[a4paper, total={6.35in, 8in}]{geometry}
% SENSE IDENTACIÓ PER DEFECTE
\\setlength{\\parskip}{1em}
\\setlength{\\parindent}{0pt}
\\setlength{\\footskip}{120pt}
% PER TAULES I GRÀFICS
\\usepackage{graphicx,epsfig}
\\usepackage{booktabs}
\\usepackage{float}
\\usepackage{array}
\\usepackage{multirow}
% PER PERSONALITZACIÓ D'ESTILS
\\usepackage{enumitem}
\\usepackage{bm}
\\usepackage{fancyhdr}
% PER FORMATS DE LA PÀGINA
\\usepackage{changepage}
\\usepackage{caption}
\\usepackage{subcaption}
% PER REPLICAR ESTILS DE NOTION
\\usepackage[dvipsnames]{xcolor}
\\usepackage[most,breakable]{tcolorbox}
\\usepackage[framemethod=TikZ]{mdframed}
\\usepackage{fontawesome}
% PER CODI
\\usepackage{minted}
\\tcbuselibrary{minted}
\\usepackage{soul}
\\usepackage{inconsolata} 
\\definecolor{grisclar}{HTML}{DEDEDE}
\\definecolor{grisfosc}{HTML}{2E2E2E}
\\definecolor{blaufosc}{HTML}{4B9ACF}
\\definecolor{vermellclar}{HTML}{FA2673}
\\definecolor{gris}{HTML}{8C8C8C}
\\newtcblisting{code}[1]{
  colback=grisfosc,
  colframe=blaufosc,
  coltext=white,
  listing engine=minted,
  minted language=#1,
  minted options={
    style=monokai,
    fontsize=\\small,
    breaklines,
    autogobble
  },
  left=10pt, right=10pt,
  top=8pt, bottom=8pt,
  boxsep=0pt,
  listing only
}
\\let\\originaltexttt\\texttt
\\renewcommand{\\texttt}[1]{%
  \\begingroup
  \\sethlcolor{grisclar}%
  \\hl{{\\color{vermellclar}\\ttfamily\\small #1}}%
  \\endgroup
}
\\newcommand{\\codeCaption}[1]{\\\par%
  {\\small\\textcolor{gris}{#1}}%
\\par}
% PER CALLOUTS
\\tcbuselibrary{skins,breakable}
\\usepackage{etoolbox, xparse, expl3}
\\ExplSyntaxOn
\\NewExpandableDocumentCommand{\\gettitlecolor}{m}
{\\str_case_e:nnF{#1}{
    {yellow}{yellow!88!black}
    {green}{green!75!black}
    {orange}{orange!110!black}
    {blue}{blue!120!black}
    {red}{red!85!black}
    {gray}{gray!140!black}
    {purple}{purple!190!black}
    {pink}{pink!100!black}
    {brown}{brown!95!black}
}{#1!90!black}}
\\ExplSyntaxOff
\\NewDocumentEnvironment{callout}{%
  O{}     % #1 = icon (optional)
  O{}     % #2 = title (optional)
  O{gray} % #3 = color (optional, default=gray)
  +b      % #4 = content (obligatory)
}{%
  \\colorlet{mytitlecol}{\\gettitlecolor{#3}}
  \\begin{tcolorbox}[enhanced,breakable,boxsep=6pt,left=3pt,%
    right=2pt,top=6pt, bottom=6pt,arc=2mm,boxrule=1.4pt,%
    colback={#3!7},colframe=mytitlecol,colbacktitle=mytitlecol,%
    coltitle=white,drop shadow={opacity=0.2},%
    fonttitle=\\large,enhanced jigsaw,%
    title={%
      \\ifblank{#1}{\\vphantom{\\emoji{1f4cc}}}{#1\\,\\,}%
      \\ifblank{\\bfseries#2}{}{\\bfseries\\strut #2}%
      }
  ] #4
  \\end{tcolorbox}
}{}
% SEPARACIÓ ABANS I DESPRÉS DE LES EQUACIONS
\\newlength{\\myeqskip}
\\setlength{\\myeqskip}{12pt}
\\AtBeginDocument{%
  \\setlength{\\abovedisplayskip}{\\myeqskip}
  \\setlength{\\belowdisplayskip}{\\myeqskip}
  \\setlength{\\abovedisplayshortskip}{\\myeqskip-2\\parskip}
  \\setlength{\\belowdisplayshortskip}{\\myeqskip}
}
% LINKS MÉS BONICS
\\hypersetup{
  colorlinks=true, 
  linkcolor=blue, 
  urlcolor=blue, 
  citecolor=blue
}
% EMOJIS
\\usepackage{twemojis}
\\let\\emoji\\texttwemoji
% TODO LISTS
\\newlist{todolist}{itemize}{3}
\\setlist[todolist]{label=$\\square$}
\\newcommand{\\cmark}{\\ding{51}}%
\\newcommand{\\done}{\\rlap{$\\square$}{\\raisebox{2pt}{\\large\\hspace{1pt}\\cmark}}%
\\hspace{-2.5pt}}
% CITES ESTILITZADES
\\usepackage[autostyle,babel]{csquotes}
\\newmdenv[
  leftline=true,
  topline=false,
  bottomline=false,
  rightline=false,
  linecolor=gray,
  linewidth=3pt,
  backgroundcolor=gray!5,
  skipabove=\\baselineskip,
  skipbelow=\\baselineskip,
  innerleftmargin=10pt,
  innerrightmargin=10pt,
  innertopmargin=10pt,
  innerbottommargin=10pt,
]{fancyquote}
% PER UTILITZAR CARÀCTERS UNICODE
\\usepackage{pifont}
% PER AVISAR D'ELEMENTS QUE NO S'HAN PROCESSAT
\\tcbset{highlight style/.style={
  colback=yellow,
  coltext=red,
  boxrule=0pt,
  sharp corners,
  enhanced,
  frame hidden,
  boxsep=0pt,
  left=2pt, right=2pt, top=0pt, bottom=0pt,
  fontupper=\\ttfamily\\small,
}}
\\newtcbox{\\notRendered}{on line, highlight style}
% EXTRA: MARCA D'AIGUA (OPCIONAL)
\\usepackage{transparent}
\\usepackage{eso-pic}
\\AddToShipoutPictureBG{
  \\put(470,30){\\small \\transparent{0.4}
    \\href{https://fisicaubwiki.notion.site}{fisicaubwiki.notion.site}
  }
}

%%%%%%%%%%%%%%% CAPÇALERA INICIAL %%%%%%%%%%%%%%%%%%

\\title{Escriu el teu títol aquí}
\\author{I aquí el teu nom}
\\date{\\vspace{-1em}23 d'Abril de 2025}


%%%%%%%%%%%%%%%%%%%% DOCUMENT %%%%%%%%%%%%%%%%%%%%%%

\\begin{document}
\\maketitle

\\begin{abstract}
    L'objectiu d'aquest document és proporcionar un exemple base de document \\LaTeX
\\end{abstract}

\\section*{Introducció}
Bla Bla Bla

% ----> POSA EL CODI TeX GENERAT AQUÍ <----

\\end{document}`