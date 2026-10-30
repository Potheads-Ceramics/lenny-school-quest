/* =====================================================================
   WORDS — a small dictionary, so the game never assumes Lenny knows
   school words. Inside any panel, the first time a word like
   "Technasium" or "brugklas" appears on a screen it gets a dotted
   underline; tapping it shows what it means. Works on every screen
   (speech bubbles, facts, the "Zo is het hier" block, explanations)
   without changing those screens.
   ===================================================================== */
window.LQ = window.LQ || {};

LQ.Words = (function () {
  // [word as shown in the card, pattern, meaning]
  const TERMS = [
    ['Brugklas', 'brugklas(?:sen)?|brugjaar|brugperiode', 'Het eerste jaar op de middelbare school. Je went aan de nieuwe school, en de school kijkt welk niveau het best bij je past.'],
    ['Onderbouw', 'onderbouw', 'De eerste jaren van de middelbare school (meestal klas 1 tot en met 3). Iedereen heeft dan ongeveer dezelfde vakken.'],
    ['Bovenbouw', 'bovenbouw', 'De laatste jaren, na klas 3. Je kiest dan een profiel en werkt naar je eindexamen.'],
    ['Vwo', 'vwo', 'Het hoogste niveau op de middelbare school. Het duurt 6 jaar, en daarna kun je naar de universiteit. Atheneum en gymnasium zijn allebei vwo.'],
    ['Havo', 'havo', 'Een niveau dat 5 jaar duurt. Daarna kun je naar het hbo, bijvoorbeeld een hogeschool.'],
    ['Atheneum', 'atheneum', 'Vwo zonder Latijn en Grieks.'],
    ['Gymnasium', 'gymnasium', 'Vwo met Latijn en Grieks: de talen en verhalen van de oude Romeinen en Grieken.'],
    ['Latijn', 'latijn', 'De taal van de oude Romeinen. Veel woorden in het Nederlands en Engels komen uit het Latijn.'],
    ['Grieks', 'grieks', 'De taal van de oude Grieken. Het heeft een eigen alfabet.'],
    ['Tweetalig', 'tweetalig(?:e)?|tto', 'Je krijgt een groot deel van de lessen in het Engels.'],
    ['Technasium', 'technasium|o&o', 'Een vak (O&O: Onderzoeken & Ontwerpen) waarin je met je team een echte opdracht van een bedrijf oplost: onderzoeken, ontwerpen en bouwen.'],
    ['Dalton', 'dalton(?:uren|uur)?', 'Een manier van leren waarin je zelf plant wanneer je wat doet. In de daltonuren kies je zelf waaraan je werkt. Je leert zelfstandig werken en samenwerken.'],
    ['Montessori', 'montessori', 'Een manier van leren waarin je veel zelf kiest en plant, in je eigen tempo, met hulp van je docent.'],
    ['KWT', 'kwt(?:-uur|-uren)?', 'Keuzewerktijd: uren waarin je zelf kiest aan welk vak je werkt.'],
    ['Vrijeschool', 'vrije ?school', 'Een school waar kunst, muziek en met je handen werken net zo belangrijk zijn als leren uit boeken.'],
    ['Periodeles', 'periodeles(?:sen)?', 'Een lange les aan het begin van de dag, een paar weken lang over één onderwerp.'],
    ['Mentor', 'mentor(?:en)?', 'Jouw vaste docent. Die helpt je, en bij hem of haar kun je terecht als er iets is.'],
    ['GSA', 'gsa(?:-club|-team)?', 'Gender & Sexuality Alliance: een club op school voor leerlingen die lhbtiq+ zijn, en voor iedereen die wil helpen. Samen zorgen jullie dat iedereen zichzelf kan zijn.'],
    ['Paarse Vrijdag', 'paarse vrijdag', 'Een vrijdag in het schooljaar waarop scholen paars dragen. Zo laten ze zien dat iedereen zichzelf mag zijn, ook wie lhbtiq+ is.'],
    ['Lhbtiq+', 'lhbtiq\\+?', 'Een woord voor lesbisch, homo, bi, trans, intersekse, queer, en meer. Het gaat over op wie je verliefd wordt, en over wie je bent.'],
    ['Sportklas', 'sportklas', 'Extra sportlessen naast gym, voor wie graag sport. Vaak kies je dat zelf.'],
    ['Brugklaskamp', 'brugklaskamp|kennismakingskamp|kamp', 'Een paar dagen met je klas weg, om elkaar te leren kennen. Je slaapt dan niet thuis. Hoeveel nachten het is, verschilt per school.'],
    ['Werkweek', 'werkweek|werkweken', 'Een paar dagen (of een week) met je klas op een andere plek leren en dingen doen. Meestal slaap je daar ook.'],
    ['Uitwisseling', 'uitwisseling(?:en)?', 'Leerlingen van een school in een ander land komen bij jullie op bezoek, en jij gaat naar hen toe.'],
    ['Gastgezin', 'gastgezin(?:nen)?', 'Een familie in een ander land bij wie je logeert tijdens een schoolreis.'],
    ['Auditie', 'auditie(?:s)?', 'Je laat docenten zien wat je kunt, bijvoorbeeld dansen of muziek spelen. Zij kijken of de school bij je past.'],
    ['Highschool', 'highschool(?:s)?', 'Bij Thorbecke: een extra sport- of dansprofiel in klas 1 en 2.'],
    ['Talentklas', 'talentklas(?:sen)?', 'Extra lessen of projecten over iets wat je leuk vindt.'],
    ['Profiel', 'profiel(?:en)?', 'In de bovenbouw kies je een pakket vakken dat bij elkaar hoort, zoals Natuur & Techniek of Cultuur & Maatschappij.'],
    ['Open dag', 'open dag(?:en)?|open les(?:sen)?', 'Een dag waarop je een school mag bekijken, lessen mag proberen en vragen mag stellen.'],
    ['Portfolio', 'portfolio', 'Een map met werk dat je gemaakt hebt, zoals tekeningen.'],
    ['Solfège', 'solf[eè]ge', 'Muziek leren lezen, horen en zingen.'],
    ['Voorexamenjaar', 'voorexamenjaar|voorexamenklassen', 'Het jaar vóór je eindexamenjaar. Bij vwo is dat klas 5.'],
    ['Ouderbijdrage', 'ouderbijdrage', 'Geld dat ouders aan de school geven voor extra dingen, zoals uitjes. Het is vrijwillig.']
  ];
  const RX = new RegExp('(^|[^\\p{L}])(' + TERMS.map(t => t[1]).join('|') + ')(?![\\p{L}])', 'iu');
  const find = (word) => TERMS.find(t => new RegExp('^(?:' + t[1] + ')$', 'iu').test(word));
  const WHERE = '.bubble p, .facts li, .cmp li, .info, .ex-item p, .ex-same, .explain-pop > p, .factcard li, .whycard p';
  const SKIP = 'button, a, input, textarea, select, .word';

  let pop = null;
  function show(btn, term) {
    hide();
    pop = LQ.h('div', { class: 'word-pop', role: 'dialog', 'aria-label': term[0] }, [
      LQ.h('b', {}, '📖 ' + term[0]), LQ.h('p', {}, term[2]),
      LQ.h('button', { class: 'btn', type: 'button', onclick: hide }, 'Snap ik!')
    ]);
    document.body.appendChild(pop);
    LQ.Sound && LQ.Sound.play();
  }
  function hide() { if (pop) { pop.remove(); pop = null; } }

  // Wrap the first match of each word per screen in a tappable button.
  function scan(root) {
    const seen = new Set(Array.from(root.querySelectorAll('.word')).map(b => b.dataset.w));
    root.querySelectorAll(WHERE).forEach(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        let text = node.nodeValue, m, guard = 0;
        while ((m = RX.exec(text)) && guard++ < 20) {
          const word = m[2], term = find(word);
          const at = m.index + m[1].length;
          if (!term || seen.has(term[0])) { // skip this one, keep looking further on
            const rest = node.splitText(at + word.length); node = rest; text = rest.nodeValue; continue;
          }
          seen.add(term[0]);
          const after = node.splitText(at), rest = after.splitText(word.length);
          const btn = LQ.h('button', { class: 'word', type: 'button', 'data-w': term[0], title: 'Wat betekent dit?', onclick: (e) => { e.stopPropagation(); show(btn, term); } }, after.nodeValue);
          after.replaceWith(btn);
          node = rest; text = rest.nodeValue;
        }
      });
    });
  }

  function init() {
    const body = document.getElementById('panel-body');
    let queued = false;
    const run = () => { queued = false; try { scan(body); } catch (e) {} };
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(run); } }).observe(body, { childList: true, subtree: true });
    document.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target) && !e.target.closest('.word')) hide(); });
    const veil = document.getElementById('veil');
    new MutationObserver(() => { if (veil.hidden) hide(); }).observe(veil, { attributes: true, attributeFilter: ['hidden'] });
  }

  return { init, TERMS, hide };
})();
