const LESSONS = [
  {
    id: 'mlp',
    title: 'Sieć Neuronowa (MLP)',
    badge: 'Podstawy AI',
    html: `
      <div class="space-y-4 text-xs leading-relaxed text-slate-300">
        <p>
          Każdy organizm w symulacji jest sterowany przez własną, niezależną <strong class="text-cyan-300">sztuczną sieć neuronową</strong> typu <em>Multi-Layer Perceptron (MLP)</em> — czyli wielowarstwowy perceptron jednokierunkowy.
        </p>
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-cyan-400 mb-1">1. Warstwa Wejściowa</div>
            <div class="text-lg font-bold font-mono text-slate-100">14 neuronów</div>
            <p class="text-[11px] text-slate-400 mt-1">Odbiera surowe dane ze świata: 5 promieni wzroku (odległość i typ obiektu) oraz stan ciała.</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-purple-400 mb-1">2. Warstwa Ukryta</div>
            <div class="text-lg font-bold font-mono text-slate-100">10 neuronów</div>
            <p class="text-[11px] text-slate-400 mt-1">Łączy sygnały ze zmysłów w abstrakcyjne wzorce, np. „pokarm po lewej + brak drapieżnika”.</p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-emerald-400 mb-1">3. Warstwa Wyjściowa</div>
            <div class="text-lg font-bold font-mono text-slate-100">3 neurony</div>
            <p class="text-[11px] text-slate-400 mt-1">Zamienia wynik obliczeń na fizyczny ruch: napęd, skręt oraz sprint lub ugryzienie.</p>
          </div>
        </div>
        <div class="p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/25">
          <div class="text-[10px] font-mono uppercase tracking-wider text-cyan-300 mb-1.5">Jak neuron oblicza wynik? (Propagacja w przód)</div>
          <div class="font-mono text-sm text-slate-100 bg-slate-900/90 px-3 py-2 rounded border border-slate-800 mb-2">
            wyjście = tanh( w₁·x₁ + w₂·x₂ + ... + wₙ·xₙ + bias )
          </div>
          <p class="text-[11px] text-slate-400">
            Każde połączenie ma <strong class="text-slate-200">wagę synaptyczną (w)</strong> przechowywaną w szybkiej tablicy <code class="text-cyan-300">Float32Array</code>.
            Waga dodatnia (linia <span class="text-cyan-300">cyjanowa</span>) wzmacnia sygnał, a ujemna (linia <span class="text-rose-400">czerwona</span>) go hamuje.
            Funkcja aktywacji <strong class="text-slate-200">tanh(x)</strong> ściska wynik do przedziału <code class="text-cyan-300">[-1.0, +1.0]</code>, co naturalnie odpowiada np. skrętowi w lewo (-1) lub w prawo (+1).
          </p>
        </div>
        <p class="text-[11px] text-slate-400">
          <strong class="text-cyan-300">Wskazówka:</strong> Kliknij dowolnego stworka na planszy, a następnie najedź kursorem na pojedyncze kółka (neurony) w prawym panelu Inspektora, aby zobaczyć ich aktualną wartość i znaczenie w czasie rzeczywistym!
        </p>
      </div>
    `
  },
  {
    id: 'io',
    title: 'Zmysły i Decyzje',
    badge: '14 → 3',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <p>
          Sieć neuronowa nie „widzi” ekranu jak człowiek. Zamiast obrazu z kamery dostaje wektor <strong class="text-cyan-300">14 znormalizowanych liczb</strong> obliczanych w każdej klatce symulacji:
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-1.5">
            <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold">Wejścia zmysłowe (14)</div>
            <div class="text-[11px] space-y-1 text-slate-300">
              <div><code class="text-cyan-300 font-bold">O1–O5</code> — Odległość na 5 promieniach wzroku (<code class="text-slate-200">1.0</code> = bardzo blisko, <code class="text-slate-200">0.0</code> = pusto).</div>
              <div><code class="text-cyan-300 font-bold">T1–T5</code> — Typ obiektu na promieniu: <span class="text-emerald-300">+1.0</span> (pokarm/ofiara), <span class="text-rose-400">-1.0</span> (drapieżnik/toksyna), <span class="text-slate-400">0.0</span> (ściana/brak).</div>
              <div><code class="text-cyan-300 font-bold">ENE</code> — Poziom energii ciała (<code class="text-slate-200">0.0</code> do <code class="text-slate-200">1.0</code>).</div>
              <div><code class="text-cyan-300 font-bold">PRĘ</code> — Aktualna prędkość liniowa organizmu.</div>
              <div><code class="text-cyan-300 font-bold">OBR</code> — Prędkość kątowa (czy organizm właśnie skręca).</div>
              <div><code class="text-cyan-300 font-bold">ZEG</code> — Zegar biologiczny <code class="text-slate-200">sin(wiek · f)</code>, pozwalający wyewoluować rytmiczne pływanie i zygzakowanie.</div>
            </div>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800 space-y-2">
            <div class="text-[10px] font-mono uppercase text-emerald-300 font-semibold">Wyjścia ruchowe (3)</div>
            <div class="text-[11px] space-y-2 text-slate-300">
              <div>
                <code class="text-emerald-300 font-bold">NAP (Napęd)</code><br/>
                Zakres <code class="text-slate-200">-1..+1</code>. Steruje siłą wici do przodu lub wstecz. Koszt energii rośnie z kwadratem siły (<code class="text-slate-200">NAP²</code>).
              </div>
              <div>
                <code class="text-emerald-300 font-bold">SKR (Skręt)</code><br/>
                Zakres <code class="text-slate-200">-1..+1</code>. Moment obrotowy sterujący kierunkiem płynięcia.
              </div>
              <div>
                <code class="text-emerald-300 font-bold">SPR (Sprint / Ugryzienie)</code><br/>
                Gdy przekroczy <code class="text-cyan-300">+0.5</code>, włącza zryw prędkości (koszt <span class="text-amber-300">2.5× energii</span>) oraz wzmacnia atak drapieżników przy kontakcie z ofiarą.
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'evo',
    title: 'Neuroewolucja',
    badge: 'Genetyka',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <p>
          W klasycznym uczeniu głębokim (np. ChatGPT) sieci uczy się metodą <strong class="text-slate-100">propagacji wstecznej (backpropagation)</strong> na gotowym zbiorze danych.
          W tym ekosystemie nie ma nauczyciela ani gotowych odpowiedzi — działa tu <strong class="text-purple-300">neuroewolucja</strong> inspirowana teorią Darwina!
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-purple-300 font-semibold mb-1">1. Selekcja Naturalna</div>
            <p class="text-[11px] text-slate-400">
              Początkowe mózgi mają losowe wagi — większość kręci się w kółko i ginie z głodu. Te, które przypadkiem skręcą w stronę zielonych punktów (<code class="text-emerald-300">+1</code>) i unikną fioletowych toksyn (<code class="text-rose-400">-1</code>), gromadzą ponad <strong class="text-slate-200">85% energii</strong> i przekazują swoje wagi potomstwu.
            </p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold mb-1">2. Krzyżowanie (Crossover)</div>
            <p class="text-[11px] text-slate-400">
              Jeśli w promieniu <code class="text-slate-200">100 px</code> znajduje się kompatybilny partner o podobnej diecie, dziecko dziedziczy mieszankę wag neuronowych i genów ciała obu rodziców (krzyżowanie jednorodne lub jednopunktowe). W przeciwnym razie następuje klonowanie bezpłciowe.
            </p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-amber-300 font-semibold mb-1">3. Mutacja Gaussa</div>
            <p class="text-[11px] text-slate-400">
              Do wybranych wag dodawany jest losowy szum o rozkładzie normalnym (<strong class="text-slate-200">transformacja Boxa-Mullera</strong>), a czasem następuje odwrócenie znaku wagi. Mutują też cechy fizyczne: dieta, rozmiar, zasięg wzroku i kąt widzenia (FOV).
            </p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-emerald-300 font-semibold mb-1">4. Galeria Sław (Elitaryzm)</div>
            <p class="text-[11px] text-slate-400">
              Symulator zapamiętuje 3 najdłużej żyjące genomy w historii. Gdy populacja spadnie poniżej 15 osobników, ekosystem automatycznie zasiedla świat zmutowanymi potomkami tych weteranów — zapobiegając utracie wyewoluowanej inteligencji.
            </p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'sim',
    title: 'Fizyka i Algorytmy',
    badge: 'Silnik',
    html: `
      <div class="space-y-3.5 text-xs leading-relaxed text-slate-300">
        <div class="p-3.5 rounded-lg bg-slate-900/75 border border-slate-800">
          <div class="text-[10px] font-mono uppercase text-cyan-300 font-semibold mb-1">Siatka Przestrzenna (Spatial Hash Grid 80×80 px)</div>
          <p class="text-[11px] text-slate-400">
            Sprawdzanie kolizji i 5 promieni wzroku każdego stworka z każdym innym obiektem wymagałoby <code class="text-rose-300">O(N²)</code> operacji (dla 300 organizmów i 800 punktów pokarmu to setki tysięcy testów na klatkę).
            Zamiast tego świat <code class="text-slate-200">3000 × 2000</code> dzielimy na płaską siatkę komórek <code class="text-cyan-300">80 × 80 px</code> na tablicach <code class="text-cyan-300">Int32Array</code>.
            Wyszukiwanie sąsiadów działa w czasie <code class="text-emerald-300">O(1)</code> na komórkę! Włącz przełącznik <strong>Pokaż siatkę przestrzenną</strong>, aby zobaczyć aktywne komórki na żywo.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-amber-300 font-semibold mb-1">Termodynamika i Kompromisy</div>
            <p class="text-[11px] text-slate-400">
              Większy rozmiar daje większy magazyn energii i silniejsze ugryzienie, ale podstawowy metabolizm rośnie z kwadratem rozmiaru (<code class="text-slate-200">rozmiar²</code>). Dłuższe sensory pozwalają widzieć dalej, ale stale zużywają dodatkową energię — ewolucja musi znaleźć złoty środek.
            </p>
          </div>
          <div class="p-3 rounded-lg bg-slate-900/75 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-emerald-300 font-semibold mb-1">Dryfujące Biomy i Nisze</div>
            <p class="text-[11px] text-slate-400">
              Roślinność rośnie w 6 powoli wędrujących żyznych oazach. Zmusza to roślinożerców do migracji zamiast kręcenia się w jednym miejscu, a mięsożerców do podążania za stadami ofiar.
            </p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'lab',
    title: 'Laboratorium Eksperymentów',
    badge: 'Praktyka',
    html: `
      <div class="space-y-2.5 text-xs leading-relaxed text-slate-300">
        <p class="text-[11px] text-slate-400">
          Wybierz gotowy eksperyment badawczy, aby zaobserwować różne zjawiska znane z teorii ewolucji i uczenia maszynowego. Zalecamy włączenie prędkości <strong class="text-cyan-300">5x</strong> lub <strong class="text-cyan-300">Skok</strong> po uruchomieniu scenariusza.
        </p>
        <div class="grid grid-cols-1 gap-2">
          <button data-scenario="balanced" class="text-left p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-cyan-300">1. Zrównoważony Ekosystem (Klasyczny)</span>
              <span class="text-[10px] font-mono text-emerald-300">Mutacja 8% · Flora 16/s</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Obserwuj oscylacje populacji ofiar i drapieżników (cykle Lotki-Volterry) oraz stopniowy wzrost średniego pokolenia.</p>
          </button>

          <button data-scenario="arms_race" class="text-left p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-rose-300">2. Wyścig Zbrojeń Drapieżników</span>
              <span class="text-[10px] font-mono text-rose-300">Energia drapieżników 2.35×</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Mięsożercy zyskują ogromną przewagę. Zobacz, czy roślinożercy wyewoluują szybszy sprint i szerszy kąt widzenia (FOV), aby uciekać!</p>
          </button>

          <button data-scenario="famine" class="text-left p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-amber-300">3. Głód i Selekcja Oszczędnych</span>
              <span class="text-[10px] font-mono text-amber-300">Flora 6/s · Presja metaboliczna</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Rzadki pokarm silnie faworyzuje mniejsze ciała (niższy koszt rozmiar²) i celne żerowanie bez marnowania energii na sprint.</p>
          </button>

          <button data-scenario="toxic" class="text-left p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-fuchsia-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-fuchsia-300">4. Pole Toksyczne (Unikanie Zagrożeń)</span>
              <span class="text-[10px] font-mono text-fuchsia-300">135 toksyn na start</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Testuje naukę sygnałów ujemnych (-1.0 na wejściach T1–T5). Przeżyją tylko sieci neuronowe, które wykształcą odruch omijania fioletowych sporów.</p>
          </button>

          <button data-scenario="chaos" class="text-left p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/50 transition group">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-slate-100 group-hover:text-purple-300">5. Hipermutacja (Katastrofa Błędów)</span>
              <span class="text-[10px] font-mono text-purple-300">Mutacja 32%</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Zbyt wysoka mutacja niszczy wyuczone wagi szybciej, niż selekcja je utrwala. Idealny pokaz, dlaczego hiperparametry w AI mają kluczowe znaczenie!</p>
          </button>
        </div>
      </div>
    `
  }
];

export class Academy {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.activeTab = 'mlp';
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
      return `<button data-lesson="${lesson.id}" class="px-3 py-1.5 rounded-lg border text-[11px] font-medium transition flex items-center gap-1.5 ${cls}">
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
