(() => {
  'use strict';

  const NOTES_KEY = 'botbj_apresbacia_clone_notes_v2';
  const SERIES_KEY = 'botbj_apresbacia_clone_series_v2';

  const SERIES = [
    'Toutes',
    'A1',
    'A2',
    'B',
    'C',
    'D',
    'E',
    'F1',
    'F2',
    'F3',
    'F4',
    'G1',
    'G2',
    'G3',
    'EA',
    'DEAT',
    'DT',
  ];

  const SUBJECTS = [
    { label: 'Mathématiques', pattern: /\b(math(?:e|é)?matiques?|maths?)\b/i },
    { label: 'Français', pattern: /\b(fran(?:ç|c)ais|francais)\b/i },
    { label: 'Anglais', pattern: /\b(anglais|english)\b/i },
    { label: 'Physique-Chimie', pattern: /\b(physique(?:\s*[-/]?\s*chimie)?|p\.?\s*c\.?)\b/i },
    { label: 'SVT', pattern: /\b(s\.?v\.?t\.?|sciences?\s+de\s+la\s+vie|biologie)\b/i },
    { label: 'Philosophie', pattern: /\b(philosophie|philo)\b/i },
    { label: 'Histoire-Géographie', pattern: /\b(histoire(?:\s*[-/]?\s*g(?:é|e)ographie)?|g(?:é|e)ographie|hist\.?\s*g(?:é|e)o\.?)\b/i },
    { label: 'Économie', pattern: /\b((?:é|e)conomie|sciences?\s+(?:é|e)conomiques?)\b/i },
    { label: 'Comptabilité', pattern: /\b(comptabilit(?:é|e)|compta)\b/i },
    { label: 'Informatique', pattern: /\b(informatique|programmation|num(?:é|e)rique)\b/i },
    { label: 'Électrotechnique', pattern: /\b((?:é|e)lectrotechnique|(?:é|e)lectricit(?:é|e))\b/i },
    { label: 'Construction mécanique', pattern: /\b(construction\s+m(?:é|e)canique|m(?:é|e)canique)\b/i },
    { label: 'Dessin technique', pattern: /\b(dessin\s+technique)\b/i },
    { label: 'Sciences physiques', pattern: /\b(sciences?\s+physiques?)\b/i },
    { label: 'Allemand', pattern: /\b(allemand|deutsch)\b/i },
    { label: 'Espagnol', pattern: /\b(espagnol|espa(?:ñ|n)ol)\b/i },
    { label: 'EPS', pattern: /\b(e\.?p\.?s\.?|education\s+physique)\b/i },
  ];

  let selectedFile = null;
  let selectedObjectUrl = null;
  let tesseractPromise = null;

  function injectStyles() {
    if (document.getElementById('apresbacOcrSeries2164Styles')) return;

    const style = document.createElement('style');
    style.id = 'apresbacOcrSeries2164Styles';
    style.textContent = `
      #seriesSelect {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 44px !important;
        color: #13231f !important;
        background: transparent !important;
      }

      #scanProgressText {
        display: block !important;
        min-height: 20px;
        margin: 7px 0 0;
        color: #31584f;
        font-weight: 750;
      }

      #scanText {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .scan-zone .progress {
        display: block !important;
      }

      .ocr-detected-summary {
        margin-top: 8px;
        padding: 10px 12px;
        border: 1px solid #bcded5;
        border-radius: 13px;
        color: #075247;
        background: #edf8f4;
        font-size: 12px;
        line-height: 1.4;
      }

      .ocr-detected-summary strong {
        display: block;
        margin-bottom: 4px;
      }
    `;

    document.head.appendChild(style);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(
      () => toast.classList.remove('show'),
      2800,
    );
  }

  function ensureSeries() {
    const select = document.getElementById('seriesSelect');
    if (!select) return;

    const remembered = localStorage.getItem(SERIES_KEY) || 'Toutes';
    const currentValues = Array.from(select.options).map((option) => option.value);
    const incomplete = SERIES.some((value) => !currentValues.includes(value));

    if (!select.options.length || incomplete) {
      select.innerHTML = SERIES.map(
        (value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
      ).join('');
    }

    select.value = SERIES.includes(remembered) ? remembered : 'Toutes';
    select.disabled = false;
    select.removeAttribute('aria-hidden');

    if (select.dataset.seriesHotfix2164 !== '1') {
      select.dataset.seriesHotfix2164 = '1';
      select.addEventListener('change', () => {
        localStorage.setItem(SERIES_KEY, select.value);
      });
    }
  }

  function getProgressElements() {
    const progress = document.getElementById('scanProgress');
    const text = document.getElementById('scanProgressText');
    const wrapper = progress?.parentElement;

    if (wrapper) wrapper.classList.remove('hidden');

    return { progress, text };
  }

  function setProgress(percent, message) {
    const { progress, text } = getProgressElements();
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));

    if (progress) progress.style.width = `${safePercent}%`;
    if (text) text.textContent = message;
  }

  function updateDetectedSummary(notes) {
    const scanText = document.getElementById('scanText');
    const zone = scanText?.closest('.scan-zone');
    if (!zone) return;

    zone.querySelector('.ocr-detected-summary')?.remove();

    const summary = document.createElement('div');
    summary.className = 'ocr-detected-summary';

    if (!notes.length) {
      summary.innerHTML = `
        <strong>Aucune note automatiquement confirmée.</strong>
        Le texte reconnu reste modifiable. Corrigez les lignes puis touchez
        « Importer les notes détectées ».
      `;
    } else {
      summary.innerHTML = `
        <strong>${notes.length} note${notes.length > 1 ? 's' : ''} détectée${notes.length > 1 ? 's' : ''}</strong>
        ${notes.map((item) => `${escapeHtml(item.subject)} : ${item.score}/20`).join(' · ')}
      `;
    }

    scanText.insertAdjacentElement('afterend', summary);
  }

  function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-ocr-src="${url}"]`);

      if (existing) {
        if (window.Tesseract) resolve(window.Tesseract);
        else existing.addEventListener('load', () => resolve(window.Tesseract), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.ocrSrc = url;
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error(`Échec du chargement OCR : ${url}`));
      document.head.appendChild(script);
    });
  }

  async function loadTesseract() {
    if (window.Tesseract) return window.Tesseract;
    if (tesseractPromise) return tesseractPromise;

    const sources = [
      'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
      'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
    ];

    tesseractPromise = (async () => {
      let lastError = null;

      for (const source of sources) {
        try {
          const loaded = await loadExternalScript(source);
          if (loaded) return loaded;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error('Le moteur OCR ne peut pas être chargé.');
    })();

    try {
      return await tesseractPromise;
    } catch (error) {
      tesseractPromise = null;
      throw error;
    }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Le format de cette image ne peut pas être lu. Utilisez JPG ou PNG.'));
      };

      image.src = objectUrl;
    });
  }

  async function preprocessImage(file) {
    setProgress(7, 'Préparation et amélioration de l’image…');

    const image = await loadImage(file);
    const maxWidth = 1900;
    const maxHeight = 2600;
    const ratio = Math.min(
      1,
      maxWidth / Math.max(1, image.naturalWidth),
      maxHeight / Math.max(1, image.naturalHeight),
    );

    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width = width;
    canvas.height = height;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const imageData = context.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const gray =
        (pixels[index] * 0.299)
        + (pixels[index + 1] * 0.587)
        + (pixels[index + 2] * 0.114);
      const contrasted = Math.max(0, Math.min(255, ((gray - 128) * 1.45) + 128));

      pixels[index] = contrasted;
      pixels[index + 1] = contrasted;
      pixels[index + 2] = contrasted;
      pixels[index + 3] = 255;
    }

    context.putImageData(imageData, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Échec de la préparation de l’image.'));
        },
        'image/jpeg',
        0.94,
      );
    });
  }

  function normalizeOcrText(text) {
    return String(text || '')
      .replace(/\r/g, '\n')
      .replace(/[|¦]/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/[·•]/g, ' ')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function numericCandidates(line) {
    const matches = [];
    const expression = /(^|[^\d])((?:20(?:[.,]0{1,2})?)|(?:1\d(?:[.,]\d{1,2})?)|(?:\d(?:[.,]\d{1,2})?))\s*(\/\s*20)?(?=$|[^\d])/g;

    for (const match of line.matchAll(expression)) {
      const raw = match[2];
      const value = Number(raw.replace(',', '.'));
      if (!Number.isFinite(value) || value < 0 || value > 20) continue;

      matches.push({
        value: Math.round(value * 100) / 100,
        raw,
        index: Number(match.index || 0) + String(match[1] || '').length,
        explicitTwenty: Boolean(match[3]),
        decimal: /[.,]/.test(raw),
      });
    }

    return matches;
  }

  function chooseScore(line, subjectMatch) {
    const candidates = numericCandidates(line);
    if (!candidates.length) return null;

    const subjectEnd = subjectMatch ? subjectMatch.index + subjectMatch[0].length : 0;
    const hasCoefficientWord = /coef(?:ficient)?/i.test(line);

    const ranked = candidates.map((candidate, position) => {
      let rank = 0;

      if (candidate.explicitTwenty) rank += 150;
      if (candidate.decimal) rank += 55;
      if (candidate.index >= subjectEnd) rank += 35;
      if (candidate.value >= 7) rank += 28;
      if (candidate.value >= 10) rank += 12;
      rank += position * 3;

      if (candidates.length > 1 && candidate.value <= 6) rank -= 45;
      if (hasCoefficientWord && candidate.value <= 10) rank -= 60;

      return { ...candidate, rank };
    });

    ranked.sort((left, right) => right.rank - left.rank);
    return ranked[0]?.value ?? null;
  }

  function extractNotes(text) {
    const normalized = normalizeOcrText(text);
    const lines = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const detected = new Map();

    for (let index = 0; index < lines.length; index += 1) {
      const current = lines[index];
      const following = lines[index + 1] || '';
      const combined = `${current} ${following}`.trim();

      for (const subject of SUBJECTS) {
        const match = subject.pattern.exec(current) || subject.pattern.exec(combined);
        if (!match) continue;

        const score = chooseScore(current, match)
          ?? chooseScore(combined, match);

        if (score == null) continue;

        detected.set(subject.label.toLowerCase(), {
          subject: subject.label,
          score,
          source: 'ocr',
        });
      }
    }

    return Array.from(detected.values());
  }

  async function runOcr() {
    const input = document.getElementById('scanInput');
    const file = selectedFile || input?.files?.[0];
    const button = document.getElementById('runOcrButton');
    const scanText = document.getElementById('scanText');

    if (!file) {
      showToast('Choisissez ou photographiez d’abord le relevé.');
      return;
    }

    if (!/^image\//i.test(file.type || '') && !/\.(jpe?g|png|webp)$/i.test(file.name || '')) {
      showToast('Utilisez une image JPG, PNG ou WEBP.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.dataset.originalLabel = button.textContent;
      button.textContent = 'Lecture OCR en cours…';
    }

    updateDetectedSummary([]);
    setProgress(2, 'Initialisation du scanner OCR…');

    try {
      const [Tesseract, preparedImage] = await Promise.all([
        loadTesseract(),
        preprocessImage(file),
      ]);

      setProgress(12, 'Analyse du relevé…');

      const result = await Tesseract.recognize(
        preparedImage,
        'fra+eng',
        {
          logger: (event) => {
            const progress = Number(event?.progress || 0);
            const percent = 12 + Math.round(progress * 83);
            const status = event?.status
              ? String(event.status).replaceAll('_', ' ')
              : 'Analyse du relevé';

            setProgress(percent, `${status} · ${Math.max(0, Math.min(100, Math.round(progress * 100)))} %`);
          },
          langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        },
      );

      const recognized = normalizeOcrText(result?.data?.text || '');
      const notes = extractNotes(recognized);

      if (scanText) scanText.value = recognized;

      updateDetectedSummary(notes);
      setProgress(100, notes.length
        ? `Lecture terminée : ${notes.length} note${notes.length > 1 ? 's' : ''} détectée${notes.length > 1 ? 's' : ''}. Vérifiez avant importation.`
        : 'Lecture terminée. Corrigez si nécessaire le texte reconnu avant l’importation.');

      showToast(notes.length
        ? `${notes.length} note${notes.length > 1 ? 's' : ''} détectée${notes.length > 1 ? 's' : ''}.`
        : 'Texte extrait. Vérifiez-le avant l’importation.');
    } catch (error) {
      console.error('[AprèsBac OCR V2.16.4]', error);
      const message = error?.message || 'Le relevé ne peut pas être analysé.';
      setProgress(0, `${message} Vérifiez la connexion, puis réessayez.`);
      showToast(message);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = button.dataset.originalLabel || 'Lire le relevé avec l’OCR';
      }
    }
  }

  function readStoredNotes() {
    try {
      const value = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function importNotes() {
    const scanText = document.getElementById('scanText');
    const detected = extractNotes(scanText?.value || '');

    if (!detected.length) {
      showToast('Aucune matière avec une note sur 20 n’a été détectée. Corrigez le texte puis réessayez.');
      updateDetectedSummary([]);
      return;
    }

    const merged = new Map();

    for (const item of readStoredNotes()) {
      if (!item?.subject) continue;
      merged.set(String(item.subject).toLowerCase(), item);
    }

    for (const item of detected) {
      merged.set(item.subject.toLowerCase(), item);
    }

    const notes = Array.from(merged.values())
      .slice(0, 40)
      .sort((left, right) => String(left.subject).localeCompare(String(right.subject), 'fr'));

    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    const modal = document.getElementById('scanModal');
    modal?.classList.add('hidden');
    document.body.style.overflow = '';

    showToast(`${detected.length} note${detected.length > 1 ? 's' : ''} importée${detected.length > 1 ? 's' : ''}.`);

    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('v', '2.16.4');
      url.searchParams.set('ocr', 'importe');
      window.location.replace(url.toString());
    }, 500);
  }

  function handleFileSelection(input) {
    const file = input.files?.[0] || null;
    selectedFile = file;

    if (selectedObjectUrl) {
      URL.revokeObjectURL(selectedObjectUrl);
      selectedObjectUrl = null;
    }

    const preview = document.getElementById('scanPreview');
    const scanText = document.getElementById('scanText');

    if (!file) {
      preview?.classList.add('hidden');
      return;
    }

    selectedObjectUrl = URL.createObjectURL(file);

    if (preview) {
      preview.src = selectedObjectUrl;
      preview.classList.remove('hidden');
    }

    if (scanText) scanText.value = '';
    document.querySelector('.ocr-detected-summary')?.remove();
    setProgress(0, 'Image prête. Touchez « Lire le relevé avec l’OCR ».');
  }

  function installEvents() {
    document.addEventListener(
      'change',
      (event) => {
        if (event.target?.id === 'scanInput') {
          handleFileSelection(event.target);
        }
      },
      true,
    );

    document.addEventListener(
      'click',
      (event) => {
        const runButton = event.target.closest('#runOcrButton');
        if (runButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void runOcr();
          return;
        }

        const importButton = event.target.closest('#importOcrButton');
        if (importButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          importNotes();
        }
      },
      true,
    );
  }

  function start() {
    injectStyles();
    ensureSeries();
    installEvents();

    window.setTimeout(ensureSeries, 250);
    window.setTimeout(ensureSeries, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.__APRESBAC_OCR_SERIES_V2_16_4__ = {
    ensureSeries,
    extractNotes,
    runOcr,
    importNotes,
  };
})();
