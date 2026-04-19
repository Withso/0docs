/**
 * Generates the viewer JavaScript that runs in the exported static site.
 * Uses React.createElement (loaded from CDN) — no JSX, no build step needed.
 */
export function generateViewerScript(): string {
  return `
(function() {
  'use strict';
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;

  // ── Data loading ──
  var DATA = { pages: [], sections: [], blocks: [], navGroups: [], settings: {}, projectName: '' };

  // ── SVG Icons (inline) ──
  function SearchIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('circle', {cx:11,cy:11,r:8}), h('path', {d:'m21 21-4.3-4.3'}));
  }
  function MenuIcon() {
    return h('svg', {width:20,height:20,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('line', {x1:4,x2:20,y1:12,y2:12}), h('line', {x1:4,x2:20,y1:6,y2:6}), h('line', {x1:4,x2:20,y1:18,y2:18}));
  }
  function XIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'M18 6 6 18'}), h('path', {d:'m6 6 12 12'}));
  }
  function FileIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'}), h('path', {d:'M14 2v4a2 2 0 0 0 2 2h4'}));
  }
  function HashIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('line', {x1:4,x2:20,y1:9,y2:9}), h('line', {x1:4,x2:20,y1:15,y2:15}), h('line', {x1:10,x2:8,y1:3,y2:21}), h('line', {x1:16,x2:14,y1:3,y2:21}));
  }
  function TypeIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('polyline', {points:'4 7 4 4 20 4 20 7'}), h('line', {x1:9,x2:15,y1:20,y2:20}), h('line', {x1:12,x2:12,y1:4,y2:20}));
  }
  function ThumbsUpIcon() {
    return h('svg', {width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'M7 10v12'}), h('path', {d:'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z'}));
  }
  function ThumbsDownIcon() {
    return h('svg', {width:14,height:14,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'M17 14V2'}), h('path', {d:'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z'}));
  }
  function CheckIcon() {
    return h('svg', {width:16,height:16,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'M20 6 9 17l-5-5'}));
  }
  function ChevronIcon() {
    return h('svg', {width:12,height:12,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'},
      h('path', {d:'m9 18 6-6-6-6'}));
  }

  // ── Fuzzy search ──
  function fuzzyMatch(target, query) {
    var t = target.toLowerCase(), q = query.toLowerCase();
    if (t.indexOf(q) >= 0) return { match: true, score: 100 };
    var words = t.split(/\\s+/), qWords = q.split(/\\s+/), wm = 0;
    for (var wi = 0; wi < qWords.length; wi++) {
      for (var wj = 0; wj < words.length; wj++) {
        if (words[wj].indexOf(qWords[wi]) === 0) { wm++; break; }
      }
    }
    if (wm === qWords.length) return { match: true, score: 80 };
    if (wm > 0) return { match: true, score: 40 + wm * 10 };
    var qi = 0;
    for (var i = 0; i < t.length && qi < q.length; i++) { if (t[i] === q[qi]) qi++; }
    if (qi === q.length) return { match: true, score: 20 };
    return { match: false, score: 0 };
  }

  function extractBlockText(block) {
    var c = block.content; if (!c) return '';
    var parts = [];
    if (c.text) parts.push(c.text);
    if (c.code) parts.push(c.code);
    if (c.title) parts.push(c.title);
    if (c.description) parts.push(c.description);
    if (c.html) parts.push(c.html.replace(/<[^>]*>/g, ' '));
    if (Array.isArray(c.items)) c.items.forEach(function(it) {
      if (typeof it === 'string') parts.push(it);
      else { if (it && it.title) parts.push(it.title); if (it && it.description) parts.push(it.description); }
    });
    if (Array.isArray(c.tabs)) c.tabs.forEach(function(t) {
      if (t.label) parts.push(t.label); if (t.content) parts.push(t.content); if (t.code) parts.push(t.code);
    });
    if (Array.isArray(c.headers)) parts.push.apply(parts, c.headers);
    if (Array.isArray(c.rows)) c.rows.forEach(function(r) { if (Array.isArray(r)) parts.push.apply(parts, r); });
    if (c.method) parts.push(c.method);
    if (c.path) parts.push(c.path);
    return parts.join(' ');
  }

  // ── Block Renderer ──
  function BlockRenderer(props) {
    var block = props.block;
    var c = block.content || {};
    var type = block.type;

    switch (type) {
      case 'heading':
        return h('h3', {className:'block-heading'}, c.text);
      case 'paragraph':
        return h('p', {className:'block-paragraph'}, c.text);
      case 'code_block':
        return h('div', {className:'block-code'},
          c.language ? h('div', {className:'code-lang'}, c.language) : null,
          h('pre', null, h('code', null, c.code)));
      case 'image':
        if (!c.url) return null;
        var imgAlign = c.align || 'left';
        var justifyMap = {left:'flex-start',center:'center',right:'flex-end'};
        return h('div', {className:'block-image', style:{display:'flex',justifyContent:justifyMap[imgAlign]||'flex-start'}},
          h('div', {style:{width:c.width?c.width+'%':'100%',maxWidth:'100%'}},
            h('img', {src:c.url, alt:c.alt||'', loading:'lazy'}),
            c.alt ? h('p', {className:'caption', style:{textAlign:imgAlign}}, c.alt) : null));
      case 'youtube':
        if (!c.videoId) return null;
        return h('div', {className:'block-youtube'},
          h('iframe', {src:'https://www.youtube.com/embed/'+c.videoId, allowFullScreen:true, title:c.title||'Video'}));
      case 'video':
        if (!c.url) return null;
        return h('div', {className:'block-video'},
          h('video', {controls:c.showControls!==false, loop:c.loop===true, autoPlay:c.loop===true, muted:c.loop===true},
            h('source', {src:c.url})));
      case 'ordered_list':
        return h('ol', {className:'block-list', style:{listStyleType:'decimal'}},
          (c.items||[]).map(function(item, i) { return h('li', {key:i}, item); }));
      case 'unordered_list':
        return h('ul', {className:'block-list', style:{listStyleType:'disc'}},
          (c.items||[]).map(function(item, i) { return h('li', {key:i}, item); }));
      case 'note':
        return h('div', {className:'block-note'}, c.text);
      case 'callout':
        return h('div', {className:'block-callout'}, c.text);
      case 'divider':
        return h('hr', {className:'block-divider'});
      case 'quote':
        return h('blockquote', {className:'block-quote'},
          h('p', null, c.text),
          c.attribution ? h('footer', null, '— ' + c.attribution) : null);
      case 'card':
        return h('div', {className:'block-card'},
          h('h4', null, c.title),
          h('p', null, c.description),
          c.link ? h('a', {href:c.link, target:'_blank', rel:'noopener noreferrer'}, 'Learn more →') : null);
      case 'tabs':
        return h(TabsBlock, {content:c});
      case 'code_tabs':
        return h(CodeTabsBlock, {content:c});
      case 'accordion':
        return h(AccordionBlock, {content:c});
      case 'steps':
        return h(StepsBlock, {content:c});
      case 'table':
        return h(TableBlock, {content:c});
      case 'api_endpoint':
        return h(ApiEndpointBlock, {content:c});
      case 'inline_editor':
        return h('div', {className:'inline-editor-content', dangerouslySetInnerHTML:{__html:c.html||''}});
      default:
        return c.text ? h('p', {className:'block-paragraph'}, c.text) : null;
    }
  }

  // ── Interactive blocks ──
  function TabsBlock(props) {
    var tabs = props.content.tabs || [];
    var s = useState(0), active = s[0], setActive = s[1];
    return h('div', {className:'block-tabs'},
      h('div', {className:'tab-bar'},
        tabs.map(function(tab, i) {
          return h('button', {key:i, className:'tab-btn'+(active===i?' active':''), onClick:function(){setActive(i)}}, tab.label);
        })),
      h('div', {className:'tab-content'}, tabs[active] ? tabs[active].content : ''));
  }

  function CodeTabsBlock(props) {
    var tabs = props.content.tabs || [];
    var s = useState(0), active = s[0], setActive = s[1];
    return h('div', {className:'block-code-tabs'},
      h('div', {className:'tab-bar'},
        tabs.map(function(tab, i) {
          return h('button', {key:i, className:'tab-btn'+(active===i?' active':''), onClick:function(){setActive(i)}}, tab.label);
        })),
      h('div', {className:'code-panel'},
        h('pre', null, h('code', null, tabs[active] ? tabs[active].code : ''))));
  }

  function AccordionBlock(props) {
    var items = props.content.items || [];
    var s = useState(null), openIdx = s[0], setOpen = s[1];
    return h('div', {className:'block-accordion'},
      items.map(function(item, i) {
        var isOpen = openIdx === i;
        return h('div', {key:i, className:'acc-item'},
          h('button', {className:'acc-header'+(isOpen?' open':''), onClick:function(){setOpen(isOpen?null:i)}},
            item.title,
            h('span', {className:'arrow'}, '▼')),
          isOpen ? h('div', {className:'acc-body'}, item.content) : null);
      }));
  }

  function StepsBlock(props) {
    var items = props.content.items || [];
    return h('div', {className:'block-steps'},
      items.map(function(step, i) {
        return h('div', {key:i, className:'step'},
          h('div', {className:'step-indicator'},
            h('div', {className:'step-circle'}, i + 1),
            i < items.length - 1 ? h('div', {className:'step-connector'}) : null),
          h('div', {className:'step-content'},
            h('h4', {className:'step-title'}, step.title),
            h('p', {className:'step-desc'}, step.description)));
      }));
  }

  function TableBlock(props) {
    var headers = props.content.headers || [];
    var rows = props.content.rows || [];
    return h('div', {className:'block-table'},
      h('table', null,
        h('thead', null,
          h('tr', null, headers.map(function(hdr, i) { return h('th', {key:i}, hdr); }))),
        h('tbody', null,
          rows.map(function(row, ri) {
            return h('tr', {key:ri}, row.map(function(cell, ci) { return h('td', {key:ci}, cell); }));
          }))));
  }

  function ApiEndpointBlock(props) {
    var c = props.content;
    var methodColors = {GET:'142 76% 36%',POST:'214 100% 50%',PUT:'38 92% 50%',DELETE:'0 84% 60%',PATCH:'270 60% 55%'};
    var method = (c.method || 'GET').toUpperCase();
    var color = methodColors[method] || '0 0% 50%';
    return h('div', {className:'block-api'},
      h('div', {className:'api-header'},
        h('span', {className:'method-badge', style:{backgroundColor:'hsl('+color+')'}}, method),
        h('code', {className:'api-path'}, c.path)),
      c.description ? h('div', {className:'api-desc'}, c.description) : null,
      c.parameters && c.parameters.length > 0 ? h('div', {className:'api-params'},
        h('div', {className:'api-params-label'}, 'Parameters'),
        c.parameters.map(function(p, i) {
          return h('div', {key:i, className:'param-row'},
            h('code', {className:'param-name'}, p.name),
            h('span', {className:'param-meta'}, p.type + (p.required ? ' · required' : '')));
        })) : null,
      c.response ? h('div', {className:'api-response'}, c.response) : null);
  }

  // ── Sidebar ──
  function Sidebar(props) {
    var pages = props.pages, activePage = props.activePage, sections = props.sections;
    var navGroups = props.navGroups, onSelectPage = props.onSelectPage;
    var activeSectionId = props.activeSectionId;
    var activeTabId = props.activeTabId;

    var sortedPages = pages.slice().sort(function(a,b){return a.order_index-b.order_index});
    var sortedGroups = navGroups.slice()
      .filter(function(g){return g.type !== 'dropdown'})
      .filter(function(g){return !(g.metadata && g.metadata.hidden)})
      .filter(function(g){return activeTabId == null || !g.tab_id || g.tab_id === activeTabId})
      .sort(function(a,b){return a.order_index-b.order_index});
    var ungrouped = sortedPages.filter(function(p){return !p.nav_group_id});

    function renderPage(page) {
      var isActive = activePage && activePage.id === page.id;
      var pageSections = isActive ? sections.filter(function(s){return s.page_id===page.id}) : [];
      return h('div', {key:page.id},
        h('button', {className:'page-link'+(isActive?' active':''), onClick:function(){onSelectPage(page);window.scrollTo({top:0,behavior:'smooth'})}},
          h('span', {dangerouslySetInnerHTML:{__html:page.nav_title||page.title}})),
        isActive && pageSections.length > 0 ? h('nav', {className:'section-nav'},
          pageSections.map(function(sec) {
            var isSA = activeSectionId === sec.id;
            return h('button', {key:sec.id, className:'section-link'+(isSA?' active':''), onClick:function(){
              var el = document.getElementById('section-'+sec.id);
              if(el){var top=el.getBoundingClientRect().top+window.scrollY-72;window.scrollTo({top:top,behavior:'smooth'})}
            }}, h('span', {dangerouslySetInnerHTML:{__html:sec.nav_title||sec.title}}));
          })) : null);
    }

    return h('aside', {className:'sidebar'},
      h('div', {className:'sidebar-label'}, 'Pages'),
      h('nav', null,
        ungrouped.map(renderPage),
        sortedGroups.map(function(group) {
          var isText = group.type === 'text';
          var gPages = sortedPages.filter(function(p){return p.nav_group_id===group.id});
          if (isText) return h('div', {key:group.id, className:'nav-group-text'}, h('span', {dangerouslySetInnerHTML:{__html:group.title}}));
          if (gPages.length === 0) return null;
          return h('div', {key:group.id},
            h('div', {className:'nav-group-label'}, h('span', {dangerouslySetInnerHTML:{__html:group.title}})),
            h('div', {style:{display:'flex',flexDirection:'column',gap:'2px'}}, gPages.map(renderPage)));
        })));
  }

  // ── Top-bar tabs strip + dropdown nav ──
  function TopBarNav(props) {
    var tabs = props.tabs || [];
    var navGroups = props.navGroups || [];
    var activeTabId = props.activeTabId;
    var onSelectTab = props.onSelectTab;
    var pages = props.pages;
    var onSelectPage = props.onSelectPage;

    var dropdownGroups = navGroups.filter(function(g){return g.type === 'dropdown' && !(g.metadata && g.metadata.hidden)});
    var sortedTabs = tabs.slice().sort(function(a,b){return a.order_index-b.order_index});

    var s = useState(null), openDropdown = s[0], setOpenDropdown = s[1];

    if (sortedTabs.length === 0 && dropdownGroups.length === 0) return null;

    return h('div', {className:'topbar-nav'},
      h('div', {className:'topbar-inner'},
        sortedTabs.length > 0 ? h('div', {className:'tab-strip'},
          sortedTabs.map(function(t) {
            var isActive = activeTabId === t.id;
            return h('button', {
              key:t.id,
              className:'tab-strip-btn'+(isActive?' active':''),
              onClick:function(){onSelectTab(isActive ? null : t.id)}
            }, t.label);
          })) : null,
        dropdownGroups.length > 0 ? h('div', {className:'dropdown-strip'},
          dropdownGroups.map(function(g) {
            var gPages = pages.filter(function(p){return p.nav_group_id===g.id})
              .sort(function(a,b){return a.order_index-b.order_index});
            var isOpen = openDropdown === g.id;
            return h('div', {key:g.id, className:'dropdown-wrap'},
              h('button', {
                className:'dropdown-btn'+(isOpen?' open':''),
                onClick:function(){setOpenDropdown(isOpen?null:g.id)}
              },
                h('span', {dangerouslySetInnerHTML:{__html:g.title}}),
                h('span', {className:'dropdown-arrow'}, '▾')),
              isOpen ? h('div', {className:'dropdown-menu', onMouseLeave:function(){setOpenDropdown(null)}},
                gPages.length === 0
                  ? h('div', {className:'dropdown-empty'}, 'Empty')
                  : gPages.map(function(p) {
                      return h('button', {key:p.id, className:'dropdown-item', onClick:function(){
                        onSelectPage(p); setOpenDropdown(null);
                      }}, h('span', {dangerouslySetInnerHTML:{__html:p.nav_title||p.title}}));
                    })) : null);
          })) : null));
  }

  // ── Table of Contents ──
  function TOC(props) {
    var sections = props.sections, activeId = props.activeId;
    if (sections.length < 2) return null;
    return h('aside', {className:'toc'},
      h('div', {className:'toc-label'}, 'On this page'),
      h('nav', null,
        sections.map(function(sec) {
          var isActive = activeId === sec.id;
          return h('button', {key:sec.id, className:'toc-link'+(isActive?' active':''), onClick:function(){
            var el = document.getElementById('section-'+sec.id);
            if(el){var top=el.getBoundingClientRect().top+window.scrollY-72;window.scrollTo({top:top,behavior:'smooth'})}
          }}, h('span', {dangerouslySetInnerHTML:{__html:sec.title}}));
        })));
  }

  // ── Search Dialog ──
  function SearchDialog(props) {
    var open = props.open, onClose = props.onClose, pages = props.pages;
    var allSections = props.sections, allBlocks = props.blocks, onSelectPage = props.onSelectPage;
    var s = useState(''), query = s[0], setQuery = s[1];
    var inputRef = useRef(null);

    useEffect(function() { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
    useEffect(function() { if (!open) setQuery(''); }, [open]);

    if (!open) return null;

    var q = query.trim();
    var resultPages = [], resultSections = [], resultBlocks = [];

    if (!q) {
      resultPages = pages.slice(0, 8);
    } else {
      resultPages = pages.map(function(p){var r=fuzzyMatch(p.title.replace(/<[^>]*>/g,''),q);return{item:p,match:r.match,score:r.score}})
        .filter(function(r){return r.match}).sort(function(a,b){return b.score-a.score}).map(function(r){return r.item});
      resultSections = allSections.map(function(s){var r=fuzzyMatch(s.title.replace(/<[^>]*>/g,''),q);return{item:s,match:r.match,score:r.score}})
        .filter(function(r){return r.match}).sort(function(a,b){return b.score-a.score}).slice(0,10).map(function(r){return r.item});
      resultBlocks = allBlocks.map(function(b){var txt=extractBlockText(b);var r=fuzzyMatch(txt,q);return{item:b,match:r.match,score:r.score,text:txt}})
        .filter(function(r){return r.match}).sort(function(a,b){return b.score-a.score}).slice(0,10).map(function(r){return r.item});
    }

    function findPage(pageId) { return pages.find(function(p){return p.id===pageId}); }
    function findSection(secId) { return allSections.find(function(s){return s.id===secId}); }

    function handleSelect(page, sectionId) {
      onSelectPage(page);
      if (sectionId) {
        setTimeout(function(){
          var el = document.getElementById('section-'+sectionId);
          if(el) el.scrollIntoView({behavior:'smooth'});
        }, 200);
      }
      onClose();
    }

    return h('div', {className:'search-overlay', onClick:function(e){if(e.target===e.currentTarget)onClose()}},
      h('div', {className:'search-dialog', onClick:function(e){e.stopPropagation()}},
        h('div', {className:'search-input-wrap'},
          h(SearchIcon),
          h('input', {ref:inputRef, className:'search-input', placeholder:'Search documentation...', value:query, onChange:function(e){setQuery(e.target.value)}})),
        h('div', {className:'search-results'},
          resultPages.length === 0 && resultSections.length === 0 && resultBlocks.length === 0 && q
            ? h('div', {className:'search-empty'}, 'No results found.')
            : null,
          resultPages.length > 0 ? h('div', null,
            h('div', {className:'search-group-label'}, 'Pages'),
            resultPages.map(function(p) {
              return h('div', {key:p.id, className:'search-item', onClick:function(){handleSelect(p)}},
                h(FileIcon), h('span', {dangerouslySetInnerHTML:{__html:p.title}}));
            })) : null,
          resultSections.length > 0 ? h('div', null,
            h('div', {className:'search-group-label'}, 'Sections'),
            resultSections.map(function(sec) {
              var page = findPage(sec.page_id);
              if (!page) return null;
              return h('div', {key:sec.id, className:'search-item', onClick:function(){handleSelect(page,sec.id)}},
                h(HashIcon),
                h('div', null,
                  h('span', {dangerouslySetInnerHTML:{__html:sec.title}}),
                  h('div', {className:'search-meta'}, h('span', {dangerouslySetInnerHTML:{__html:page.title}}))));
            })) : null,
          resultBlocks.length > 0 ? h('div', null,
            h('div', {className:'search-group-label'}, 'Content'),
            resultBlocks.map(function(block) {
              var sec = findSection(block.section_id);
              var page = sec ? findPage(sec.page_id) : null;
              if (!page || !sec) return null;
              var text = extractBlockText(block).slice(0, 80);
              return h('div', {key:block.id, className:'search-item', onClick:function(){handleSelect(page,sec.id)}},
                h(TypeIcon),
                h('div', {style:{minWidth:0}},
                  h('div', {style:{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}, text),
                  h('div', {className:'search-meta'},
                    h('span', {dangerouslySetInnerHTML:{__html:page.title}}), ' → ', h('span', {dangerouslySetInnerHTML:{__html:sec.title}}))));
            })) : null)));
  }

  // ── Mobile Nav ──
  function MobileNav(props) {
    var pages = props.pages, activePage = props.activePage, sections = props.sections;
    var navGroups = props.navGroups, onSelectPage = props.onSelectPage, onSearchOpen = props.onSearchOpen;
    var projectName = props.projectName;
    var s1 = useState(false), open = s1[0], setOpen = s1[1];
    var s2 = useState(false), showTOC = s2[0], setShowTOC = s2[1];

    var sortedPages = pages.slice().sort(function(a,b){return a.order_index-b.order_index});
    var sortedGroups = navGroups.slice().sort(function(a,b){return a.order_index-b.order_index});
    var ungrouped = sortedPages.filter(function(p){return !p.nav_group_id});
    var activeSections = sections.filter(function(s){return activePage&&s.page_id===activePage.id});

    function handleSelect(page) { onSelectPage(page); setOpen(false); window.scrollTo({top:0,behavior:'smooth'}); }
    function handleSection(secId) {
      setOpen(false);
      setTimeout(function(){
        var el=document.getElementById('section-'+secId);
        if(el){var top=el.getBoundingClientRect().top+window.scrollY-60;window.scrollTo({top:top,behavior:'smooth'})}
      },100);
    }

    return h('div', null,
      h('button', {className:'mobile-menu-btn', onClick:function(){setOpen(true)}, 'aria-label':'Open navigation'}, h(MenuIcon)),
      open ? h('div', {className:'mobile-overlay'},
        h('div', {className:'mobile-backdrop', onClick:function(){setOpen(false)}}),
        h('div', {className:'mobile-drawer'},
          h('div', {className:'mobile-drawer-header'},
            h('span', null, projectName || 'Navigation'),
            h('button', {className:'mobile-close', onClick:function(){setOpen(false)}}, h(XIcon))),
          h('div', {style:{padding:'8px 12px'}},
            h('button', {className:'mobile-search-btn', onClick:function(){setOpen(false);onSearchOpen()}},
              h(SearchIcon), h('span', null, 'Search'))),
          activeSections.length > 0 ? h('div', {className:'mobile-tabs'},
            h('button', {className:'mobile-tab'+(!showTOC?' active':''), onClick:function(){setShowTOC(false)}}, 'Pages'),
            h('button', {className:'mobile-tab'+(showTOC?' active':''), onClick:function(){setShowTOC(true)}}, 'On This Page')) : null,
          h('div', {className:'mobile-nav-list'},
            showTOC
              ? activeSections.map(function(sec) {
                  return h('button', {key:sec.id, className:'mobile-page-btn', onClick:function(){handleSection(sec.id)}},
                    h('span', {dangerouslySetInnerHTML:{__html:sec.nav_title||sec.title}}));
                })
              : [].concat(
                  ungrouped.map(function(p) {
                    var isA = activePage && activePage.id === p.id;
                    return h('button', {key:p.id, className:'mobile-page-btn'+(isA?' active':''), onClick:function(){handleSelect(p)}},
                      h('span', {dangerouslySetInnerHTML:{__html:p.nav_title||p.title}}),
                      isA ? h(ChevronIcon) : null);
                  }),
                  sortedGroups.map(function(group) {
                    var isText = group.type === 'text';
                    var gPages = sortedPages.filter(function(p){return p.nav_group_id===group.id});
                    if (isText) return h('div', {key:group.id, className:'mobile-page-btn', style:{opacity:0.6,cursor:'default'}},
                      h('span', {dangerouslySetInnerHTML:{__html:group.title}}));
                    if (gPages.length === 0) return null;
                    return h('div', {key:group.id},
                      h('div', {className:'nav-group-label', style:{padding:'4px 12px',marginTop:12}},
                        h('span', {dangerouslySetInnerHTML:{__html:group.title}})),
                      gPages.map(function(p) {
                        var isA = activePage && activePage.id === p.id;
                        return h('button', {key:p.id, className:'mobile-page-btn'+(isA?' active':''), onClick:function(){handleSelect(p)}},
                          h('span', {dangerouslySetInnerHTML:{__html:p.nav_title||p.title}}),
                          isA ? h(ChevronIcon) : null);
                      }));
                  }))))) : null);
  }

  // ── Page Feedback ──
  function PageFeedback(props) {
    var pageId = props.pageId;
    var s = useState(false), submitted = s[0], setSubmitted = s[1];
    useEffect(function(){setSubmitted(false)}, [pageId]);
    if (submitted) return h('div', {className:'page-feedback'},
      h('div', {className:'fb-thanks'}, h(CheckIcon), h('span', null, 'Thanks for your feedback!')));
    return h('div', {className:'page-feedback'},
      h('div', {className:'fb-row'},
        h('span', {className:'fb-label'}, 'Was this page helpful?'),
        h('div', {className:'fb-btns'},
          h('button', {className:'fb-btn', onClick:function(){setSubmitted(true)}}, h(ThumbsUpIcon), ' Yes'),
          h('button', {className:'fb-btn', onClick:function(){setSubmitted(true)}}, h(ThumbsDownIcon), ' No'))));
  }

  // ── Section tracker hook ──
  function useSectionTracker(sections) {
    var s = useState(sections.length > 0 ? sections[0].id : null);
    var activeId = s[0], setActiveId = s[1];

    useEffect(function() {
      if (sections.length === 0) return;
      var visMap = {};
      function compute() {
        if (window.scrollY < 100) { setActiveId(sections[0].id); return; }
        var atBot = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50);
        if (atBot) { setActiveId(sections[sections.length-1].id); return; }
        var bestId = null, bestTop = Infinity;
        Object.keys(visMap).forEach(function(elId) {
          var entry = visMap[elId];
          if (entry.isIntersecting && entry.boundingClientRect.top < bestTop) {
            bestTop = entry.boundingClientRect.top;
            bestId = elId.replace('section-','');
          }
        });
        if (!bestId) {
          for (var i = 0; i < sections.length; i++) {
            var entry = visMap['section-'+sections[i].id];
            if (entry && entry.boundingClientRect.top < 0) bestId = sections[i].id;
          }
        }
        if (bestId) setActiveId(bestId);
      }
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { visMap[e.target.id] = e; });
        compute();
      }, {rootMargin:'-10% 0px -50% 0px', threshold:[0,0.25,0.5]});
      var els = sections.map(function(s){return document.getElementById('section-'+s.id)}).filter(Boolean);
      els.forEach(function(el){observer.observe(el)});
      var raf = null;
      function onScroll() {
        if (raf) return;
        raf = requestAnimationFrame(function(){compute();raf=null});
      }
      window.addEventListener('scroll', onScroll, {passive:true});
      compute();
      return function() { observer.disconnect(); window.removeEventListener('scroll', onScroll); if(raf) cancelAnimationFrame(raf); };
    }, [sections.map(function(s){return s.id}).join(',')]);

    return activeId;
  }

  // ── Main App ──
  function App(props) {
    var data = props.data;
    var pages = data.pages, sections = data.sections, blocks = data.blocks;
    var navGroups = data.navGroups, projectName = data.projectName;
    var tabs = data.tabs || [];

    // Hash-based routing
    var s1 = useState(function() {
      var hash = window.location.hash.replace('#/','').replace('#','');
      var found = pages.find(function(p){return p.slug===hash});
      return found || (pages.length > 0 ? pages.slice().sort(function(a,b){return a.order_index-b.order_index})[0] : null);
    });
    var activePage = s1[0], setActivePage = s1[1];

    // Active tab (top-bar) — null = "All"
    var sTab = useState(null), activeTabId = sTab[0], setActiveTabId = sTab[1];

    var s2 = useState(false), searchOpen = s2[0], setSearchOpen = s2[1];

    // Listen for hash changes
    useEffect(function() {
      function onHash() {
        var hash = window.location.hash.replace('#/','').replace('#','');
        if (hash) {
          var found = pages.find(function(p){return p.slug===hash});
          if (found) setActivePage(found);
        }
      }
      window.addEventListener('hashchange', onHash);
      return function() { window.removeEventListener('hashchange', onHash); };
    }, [pages]);

    // Cmd+K
    useEffect(function() {
      function handler(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
        if (e.key === 'Escape') setSearchOpen(false);
      }
      window.addEventListener('keydown', handler);
      return function() { window.removeEventListener('keydown', handler); };
    }, []);

    function handleSelectPage(page) {
      setActivePage(page);
      window.location.hash = '#/' + page.slug;
    }

    var pageSections = sections.filter(function(s){return activePage&&s.page_id===activePage.id})
      .sort(function(a,b){return a.order_index-b.order_index});

    var activeSectionId = useSectionTracker(pageSections);

    return h('div', null,
      // Header
      h('header', {className:'site-header'},
        h('div', {className:'header-inner'},
          h('div', {className:'header-left'},
            h(MobileNav, {pages:pages,activePage:activePage,sections:sections,navGroups:navGroups,
              onSelectPage:handleSelectPage, onSearchOpen:function(){setSearchOpen(true)}, projectName:projectName}),
            h('span', {className:'project-name'}, projectName)),
          h('button', {className:'search-btn', onClick:function(){setSearchOpen(true)}},
            h(SearchIcon),
            h('span', {className:'search-label'}, 'Search'),
            h('kbd', null, '⌘K')))),
      // Body
      h('div', {className:'site-body'},
        h(Sidebar, {pages:pages,activePage:activePage,sections:pageSections,navGroups:navGroups,
          onSelectPage:handleSelectPage, activeSectionId:activeSectionId}),
        h('main', {className:'main-content'},
          activePage
            ? h('article', null,
                h('h1', {className:'page-title'}, h('span', {dangerouslySetInnerHTML:{__html:activePage.title}})),
                pageSections.map(function(section) {
                  var secBlocks = blocks.filter(function(b){return b.section_id===section.id})
                    .sort(function(a,b){return a.order_index-b.order_index});
                  return h('section', {key:section.id, id:'section-'+section.id, className:'doc-section'},
                    h('h2', {className:'section-heading'},
                      h('span', {dangerouslySetInnerHTML:{__html:section.title}}),
                      h('span', {className:'section-line'})),
                    h('div', null,
                      secBlocks.map(function(block) {
                        return h(BlockRenderer, {key:block.id, block:block});
                      })));
                }),
                pageSections.length === 0 ? h('p', {style:{opacity:0.5}}, 'This page has no content yet.') : null,
                h(PageFeedback, {pageId:activePage.id}))
            : h('p', {style:{opacity:0.5}}, 'No pages in this project yet.')),
        h(TOC, {sections:pageSections, activeId:activeSectionId})),
      // Search
      h(SearchDialog, {open:searchOpen,onClose:function(){setSearchOpen(false)},pages:pages,
        sections:sections,blocks:blocks,onSelectPage:handleSelectPage}),
      // Made with banner
      h('div', {className:'made-with'},
        h('a', {href:'https://docs0.lovable.app',target:'_blank',rel:'noopener noreferrer'},
          'Made with ', h('span', {style:{fontWeight:600}}, '0docs'))));
  }

  // ── Boot ──
  window.__bootDocSite = function(data) {
    var root = document.getElementById('root');
    ReactDOM.createRoot(root).render(h(App, {data:data}));
  };
})();
`;
}
