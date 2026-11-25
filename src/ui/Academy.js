const LESSONS = [
  {
    id: 'course1',
    title: 'Kurs 1: Sztuczny Neuron',
    badge: 'Start',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <div class="p-3 rounded-lg bg-cyan-950/35 border border-cyan-500/30">
          <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold mb-1">Wyobraź sobie małą komisję decyzyjną</div>
          <p class="text-[11px] text-slate-300">
            Sztuczny neuron nie jest magiczny — działa jak <strong class="text-slate-100">głosowanie z wagami</strong>.
            Dostaje kilka wskazówek (np. „widzę jedzenie po lewej”, „mam mało energii”), każdą mnoży przez to, jak bardzo jej ufa (<strong class="text-cyan-300">waga synaptyczna</strong>), dodaje własny próg ostrożności (<strong class="text-purple-300">bias</strong>) i zamienia wynik na jedną płynną decyzję od <code class="text-rose-300">-1</code> do <code class="text-cyan-300">+1</code>.
          </p>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono text-cyan-300 font-semibold">Waga dodatnia (+)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">„Im mocniejszy ten sygnał, tym bardziej chcę to zrobić!” (Cyjanowe linie i prążki DNA).</p>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono text-rose-300 font-semibold">Waga ujemna (-)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">„Ten sygnał mnie powstrzymuje lub każe zrobić odwrotnie!” (Czerwone linie i prążki DNA).</p>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono text-emerald-300 font-semibold">Funkcja tanh(x)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">Płynny suwak, który każdą liczbę ściska miękko do zakresu <code class="text-slate-200">[-1, +1]</code>.</p>
          </div>
        </div>
        <div class="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
          <div class="text-[10px] font-mono uppercase text-slate-400 mb-1">Wzór jednego neuronu</div>
          <div class="font-mono text-xs text-cyan-200 bg-slate-900/90 px-3 py-1.5 rounded border border-slate-800">
            wynik = tanh( w₁·wejście₁ + w₂·wejście₂ + ... + bias )
          </div>
          <p class="text-[10.5px] text-slate-400 mt-2">
            Wszystkie 183 wagi i biasy miłka możesz obejrzeć w prawym panelu Inspektora jako kolorowy <strong class="text-cyan-300">Kod DNA Wag</strong>. Po użyciu „Klonuj i mutuj” zobaczysz dokładnie, które prążki DNA zmieniły się u potomka!
          </p>
        </div>
      </div>
    `
  },
  {
    id: 'course2',
    title: 'Kurs 2: Mózg 14→10→3',
    badge: 'Warstwy',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <p>
          Jeden neuron potrafi tylko proste „jeśli A, to B”. Dopiero połączenie neuronów w <strong class="text-cyan-300">3 warstwy (MLP)</strong> pozwala miłkowi łączyć fakty — np. <em>„widzę pokarm z przodu, ALE z prawej nadpływa drapieżnik, więc skręcam w lewo i włączam sprint!”</em>.
        </p>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-1">
            <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold">Wejścia (14 zmysłów)</div>
            <div class="text-[10.5px] text-slate-300 space-y-0.5">
              <div><code class="text-cyan-300 font-bold">O1–O5</code> Odległość na 5 promieniach wzroku (1 = dotyk).</div>
              <div><code class="text-cyan-300 font-bold">T1–T5</code> Co widać: <span class="text-emerald-300">+1</span> cel pokarmowy, <span class="text-rose-400">-1</span> drapieżnik/toksyna, <span class="text-slate-400">0</span> skała/pusto.</div>
              <div><code class="text-cyan-300 font-bold">ENE / PRĘ / OBR</code> Stan ciała: energia, prędkość i obrót.</div>
              <div><code class="text-cyan-300 font-bold">ZEG</code> Wewnętrzny metronom <code class="text-slate-200">sin(wiek·f)</code> do rytmicznego pływania.</div>
            </div>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-1.5">
            <div class="text-[10px] font-mono uppercase text-purple-300 font-semibold">Warstwa Ukryta (10) → Wyjścia (3)</div>
            <p class="text-[10.5px] text-slate-400">
              10 neuronów ukrytych to <strong class="text-slate-200">wykrywacze sytuacji</strong>. Każdy łączy wszystkie 14 wejść i przekazuje swoją opinię do 3 mięśni:
            </p>
            <div class="text-[10.5px] text-slate-300 space-y-0.5">
              <div><code class="text-emerald-300 font-bold">NAP</code> — siła napędu wici (przód / tył).</div>
              <div><code class="text-emerald-300 font-bold">SKR</code> — kierunek skrętu (lewo / prawo).</div>
              <div><code class="text-emerald-300 font-bold">SPR</code> — powyżej <code class="text-cyan-300">+0.5</code> włącza sprint lub ugryzienie!</div>
            </div>
          </div>
        </div>
        <div class="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200">
          <strong>Wskazówka:</strong> Kliknij dowolnego miłka na mapie i najedź myszką na neurony w prawym panelu Inspektora — podświetlą się dokładnie jego połączenia oraz opis roli każdego neuronu.
        </div>
      </div>
    `
  },
  {
    id: 'course3',
    title: 'Kurs 3: Jak uczy się Ewolucja?',
    badge: 'Genetyka',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <p>
          Nikt nie programuje miłkom zasad „jedz zielone, unikaj fioletowego”. Pierwsze pokolenie ma <strong class="text-slate-100">całkowicie losowe mózgi</strong>! Inteligencja rodzi się sama przez <strong class="text-purple-300">neuroewolucję</strong> — połączenie sieci neuronowych z algorytmem genetycznym:
        </p>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-emerald-300 font-semibold">1. Przeżycie = Ocena (Fitness)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">Miłki, które lepiej zdobywają energię, przekraczają próg <strong class="text-slate-200">85% energii</strong> i wydają potomstwo. Reszta ginie i zamienia się w padlinę.</p>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold">2. Krzyżowanie (Crossover)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">Gdy w promieniu <code class="text-slate-200">100 px</code> jest partner, dziecko dziedziczy mieszankę wag neuronowych i genów diety obojga rodziców.</p>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-amber-300 font-semibold">3. Mutacja Gaussa</div>
            <p class="text-[10.5px] text-slate-400 mt-1">Drobne losowe zmiany wag (rozkład normalny Boxa-Mullera) pozwalają odkrywać nowe strategie, ale zbyt wysoka mutacja (np. 32%) niszczy wyuczone wagi.</p>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-purple-300 font-semibold">4. Galeria Sław (Elitaryzm)</div>
            <p class="text-[10.5px] text-slate-400 mt-1">Najdłużej żyjące miłki trafiają do Galerii Sław. Możesz je w każdej chwili <strong class="text-cyan-300">wskrzesić</strong>, a przy kryzysie populacji ratują ekosystem przed wymarciem.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'course4',
    title: 'Kurs 4: Łańcuch i Świat',
    badge: 'Ekosystem',
    html: `
      <div class="space-y-3 text-xs leading-relaxed text-slate-300">
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
            <div class="text-[10px] font-mono uppercase text-emerald-300 font-semibold">Roślinożerca &amp; Padlinożerca</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5"><strong class="text-emerald-200">Szmaragdowi</strong> zjadają florę, a <strong class="text-violet-300">Fioletowi</strong> żywią się padliną i są odporni na toksyny.</p>
          </div>
          <div class="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30">
            <div class="text-[10px] font-mono uppercase text-amber-300 font-semibold">Wszystkożerca</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5"><strong class="text-amber-200">Złote</strong> miłki z płetwami — elastyczni oportuniści jedzący florę, padlinę i mniejsze miłki.</p>
          </div>
          <div class="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30">
            <div class="text-[10px] font-mono uppercase text-rose-300 font-semibold">Łowca Szkarłatny</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5"><strong class="text-rose-200">Karmazynowy</strong> drapieżnik średniego szczebla z żuwaczkami — poluje na roślinożerców, padlinożerców i wszystkożerców.</p>
          </div>
          <div class="p-2 rounded-lg bg-sky-950/35 border border-sky-400/35">
            <div class="text-[10px] font-mono uppercase text-sky-300 font-semibold">Drapieżnik Alfa</div>
            <p class="text-[10.5px] text-slate-400 mt-0.5"><strong class="text-sky-200">Elektryzująco błękitny</strong> superdrapieżnik szczytowy z podwójnymi kolcami — może polować nawet na Łowców Szkarłatnych!</p>
          </div>
        </div>
        <div class="p-2.5 rounded-lg bg-purple-950/25 border border-purple-500/30 text-[10.5px] text-slate-300">
          <strong class="text-purple-300">Edytor Łańcucha Pokarmowego:</strong> Kliknij przycisk <strong>Łańcuch</strong> na górnym pasku, aby samodzielnie ułożyć kto kogo zjada (np. odwrócić piramidę!), albo włącz <strong>Tryb Ewolucyjny</strong>, w którym relacje drapieżnik–ofiara wykształcają się same przez mutacje genów diety!
        </div>
        <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10.5px] text-slate-400">
          <strong class="text-cyan-300">Manipulacja terenem:</strong> W lewym panelu możesz niezależnie włączać i wyłączać <em>Strefy ciepłe/zimne</em>, <em>Skały i rafy</em>, <em>Prądy i wiry</em>, <em>Kryształy i kominy</em> oraz <em>Lasy wodorostów</em>, a także losować nowy układ mapy. Tempo czasu zmienisz strzałkami <code class="text-slate-200">← / →</code>.
        </div>
      </div>
    `
  },
  {
    id: 'lab',
    title: 'Laboratorium Eksperymentów',
    badge: 'Praktyka',
    html: `
      <div class="space-y-2 text-xs leading-relaxed text-slate-300">
        <p class="text-[11px] text-slate-400">
          Wybierz gotowy scenariusz badawczy, a następnie przyspiesz czas strzałką <code class="text-cyan-300">→</code> do <strong>5x</strong> lub <strong>Skok</strong>, aby zobaczyć ewolucję na przestrzeni kilkunastu pokoleń!
        </p>
        <div class="grid grid-cols-1 gap-2">
          <button data-scenario="balanced" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-cyan-300">1. Zrównoważony Ekosystem (5 Gatunków)</span>
              <span class="text-[10px] font-mono text-emerald-300">Mutacja 8% · Flora 16/s</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Obserwuj pełną piramidę pokarmową z Łowcami Szkarłatnymi i Drapieżnikami Alfa.</p>
          </button>

          <button data-scenario="scavenger_realm" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-violet-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-violet-300">2. Królestwo Padlinożerców</span>
              <span class="text-[10px] font-mono text-violet-300">115 porcji padliny · Mało flory</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Ograniczona roślinność i toksyny faworyzują odpornych fioletowych padlinożerców żerujących na szczątkach.</p>
          </button>

          <button data-scenario="arms_race" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-rose-300">3. Wyścig Zbrojeń Drapieżników</span>
              <span class="text-[10px] font-mono text-rose-300">Energia drapieżników 2.35×</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Mięsożercy zyskują przewagę — sprawdź starcie Łowców Szkarłatnych z Drapieżnikami Alfa!</p>
          </button>

          <button data-scenario="famine" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-amber-300">4. Głód i Selekcja Oszczędnych</span>
              <span class="text-[10px] font-mono text-amber-300">Flora 6/s · Presja metaboliczna</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Rzadki pokarm premiuje mniejsze ciała, zimne strefy oszczędzające energię i skupiska przy kryształach.</p>
          </button>

          <button data-scenario="toxic" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-fuchsia-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-fuchsia-300">5. Pole Toksyczne (Unikanie Zagrożeń)</span>
              <span class="text-[10px] font-mono text-fuchsia-300">135 toksyn na start</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Testuje naukę sygnałów ujemnych (-1.0) oraz ewolucyjną przewagę odpornych padlinożerców.</p>
          </button>

          <button data-scenario="chaos" class="text-left p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-purple-300">6. Hipermutacja (Katastrofa Błędów)</span>
              <span class="text-[10px] font-mono text-purple-300">Mutacja 32%</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Zbyt wysoka mutacja niszczy wyuczone wagi szybciej, niż selekcja je utrwala.</p>
          </button>
        </div>
      </div>
    `
  }
];

export class Academy {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.activeTab = 'course1';
    this.modal = document.getElementById('academy-modal');
    this.tabsContainer = document.getElementById('academy-tabs');
    this.bodyContainer = document.getElementById('academy-body');
    this.btnOpen = document.getElementById('btn-open-academy');
    this.btnClose = document.getElementById('btn-close-academy');
    this.backdrop = document.getElementById('academy-backdrop');

    this.renderTabs();
    this.renderBody();
    this.bindEvents();
  }

  bindEvents() {
    this.btnOpen.addEventListener('click', () => this.open());
    this.btnClose.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
  }

  open(tabId) {
    if (tabId) {
      this.activeTab = tabId;
      this.renderTabs();
      this.renderBody();
    }
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
  }

  close() {
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
  }

  toggle() {
    if (this.modal.classList.contains('hidden')) this.open();
    else this.close();
  }

  renderTabs() {
    this.tabsContainer.innerHTML = LESSONS.map((lesson) => {
      const isActive = lesson.id === this.activeTab;
      const cls = isActive
        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/60'
        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/70';
      return `<button data-lesson="${lesson.id}" class="px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 ${cls}">
        <span>${lesson.title}</span>
        <span class="text-[9px] font-mono opacity-70">${lesson.badge}</span>
      </button>`;
    }).join('');

    this.tabsContainer.querySelectorAll('[data-lesson]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-lesson');
        this.renderTabs();
        this.renderBody();
      });
    });
  }

  renderBody() {
    const lesson = LESSONS.find((l) => l.id === this.activeTab) || LESSONS[0];
    this.bodyContainer.innerHTML = lesson.html;

    this.bodyContainer.querySelectorAll('[data-scenario]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scenarioId = btn.getAttribute('data-scenario');
        this.callbacks.onApplyScenario?.(scenarioId);
        this.close();
      });
    });
  }
}
